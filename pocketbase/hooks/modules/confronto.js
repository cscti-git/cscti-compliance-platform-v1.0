/**
 * Motor de Confronto de Proteção por Ativo (Estilo Veeam ONE)
 * Rota: GET /backend/v1/backup/confronto
 *
 * Princípio fundamental:
 * Proteção NÃO é mero cadastro — proteção é prova recente.
 * Uma máquina cadastrada em rotina cuja última evidência ocorreu além do RPO
 * (ou que nunca teve evidência) está DESPROTEGIDA / FORA DO RPO.
 *
 * Mapeamento Modalidade -> Comprovação:
 * Uma execução de backup bem-sucedida (status === 'sucesso') comprova a(s) modalidade(s)
 * indicadas pelo DESTINO do plano da cadeia da rotina.
 * - Destino 'local' -> comprova 'local'
 * - Destino 'nuvem' -> comprova 'nuvem'
 * - Destino 'externo' -> comprova 'replicacao' (cópia externa / replicação offsite)
 * Planos com múltiplos destinos (ex.: ['local', 'nuvem'] ou ['local', 'externo'])
 * comprovam simultaneamente as modalidades configuradas em seu array de destinos.
 *
 * Regras inegociáveis:
 * - Multi-tenant: isolamento estrito por organization;
 * - RBAC: apenas usuários autenticados com acesso à própria organização;
 * - Zero dados fictícios / mocks — ausência de evidência = "nunca comprovada".
 */

routerAdd(
  'GET',
  '/backend/v1/backup/confronto',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    const userOrgId = auth.getString('organization') || ''

    // Parâmetro opcional de organização (apenas admin pode consultar organização diferente da sua)
    let targetOrgId = userOrgId
    const queryOrg = e.requestInfo().query ? e.requestInfo().query.organization : ''
    if (queryOrg && queryOrg !== userOrgId) {
      if (systemRole === 'admin') {
        targetOrgId = queryOrg
      } else {
        return e.forbiddenError('Acesso restrito à própria organização.')
      }
    }

    if (!targetOrgId) {
      return e.badRequestError('Organização do usuário não identificada.')
    }

    const now = new Date()
    const nowTime = now.getTime()

    // 1. Carregar todos os ativos da organização
    let assets = []
    try {
      assets = $app.findRecordsByFilter(
        'inventory_assets',
        `organization = '${targetOrgId}' && status = 'ativo'`,
        '+name',
        500,
        0,
      )
    } catch (err) {
      return e.json(500, {
        ok: false,
        message: 'Erro ao carregar ativos do inventário: ' + (err.message || String(err)),
      })
    }

    // Filtrar apenas ativos que possuem ALGUMA exigência de backup configurada
    const assetsExigidos = []
    for (let i = 0; i < assets.length; i++) {
      const a = assets[i]
      const exLocal = Boolean(a.getBool('exige_backup_local'))
      const exNuvem = Boolean(a.getBool('exige_backup_nuvem'))
      const exReplicacao = Boolean(a.getBool('exige_backup_replicacao'))
      if (exLocal || exNuvem || exReplicacao) {
        assetsExigidos.push(a)
      }
    }

    // 2. Carregar planos ativos da organização
    const planosMap = {} // id -> planoRec
    try {
      const planos = $app.findRecordsByFilter(
        'backup_planos',
        `organization = '${targetOrgId}' && status = 'ativo'`,
        '',
        200,
        0,
      )
      for (let i = 0; i < planos.length; i++) {
        planosMap[planos[i].id] = planos[i]
      }
    } catch (_) {}

    // 3. Carregar rotinas ativas da organização
    const rotinasMap = {} // id -> rotinaRec
    try {
      const rotinas = $app.findRecordsByFilter(
        'backup_rotinas',
        `organization = '${targetOrgId}' && status = 'ativo'`,
        '',
        300,
        0,
      )
      for (let i = 0; i < rotinas.length; i++) {
        rotinasMap[rotinas[i].id] = rotinas[i]
      }
    } catch (_) {}

    // 4. Carregar fontes de backup ativas da organização
    // Mapear por ativo_inventario
    const fontesPorAtivo = {} // assetId -> Array de fonteRec
    const todasFontes = []
    try {
      const fontes = $app.findRecordsByFilter(
        'backup_fontes',
        `organization = '${targetOrgId}' && ativo = true`,
        '',
        1000,
        0,
      )
      for (let i = 0; i < fontes.length; i++) {
        const f = fontes[i]
        todasFontes.push(f)
        const assetId = f.getString('ativo_inventario')
        if (assetId) {
          if (!fontesPorAtivo[assetId]) {
            fontesPorAtivo[assetId] = []
          }
          fontesPorAtivo[assetId].push(f)
        }
      }
    } catch (_) {}

    // 5. Carregar TODAS as execuções de backup da organização (incluindo erro/falha)
    // Ordenadas por data_inicio DESC / created DESC para inspeção cronológica estrita
    let execucoes = []
    try {
      execucoes = $app.findRecordsByFilter(
        'backup_execucoes',
        `organization = '${targetOrgId}'`,
        '-data_inicio',
        500,
        0,
      )
    } catch (_) {}

    // 6. Carregar ocorrências abertas da organização para enriquecer alerta e ativo
    let ocorrenciasAbertas = []
    try {
      ocorrenciasAbertas = $app.findRecordsByFilter(
        'backup_ocorrencias',
        `organization = '${targetOrgId}' && status = 'aberta'`,
        '-created',
        100,
        0,
      )
    } catch (_) {}

    // Helper: normalizar string para matching de caminhos/aliases
    const normalizarString = (str) => {
      if (!str) return ''
      let s = String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
      s = s.replace(/\\/g, '/')
      s = s.replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
      s = s.replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
      s = s.replace(/\s+/g, ' ').trim()
      return s
    }

    // Helper: extrair array de detalhes_vms de uma execução, com fallback em backup_processamentos
    const obterDetalhesVmsExecucao = (exRec) => {
      if (!exRec) return []
      let dVms = exRec.get('detalhes_vms')
      if (Array.isArray(dVms) && dVms.length > 0) {
        return dVms
      }
      // Fallback: buscar em backup_processamentos se a execução não tiver persistido
      const evidenciaId = exRec.getString('evidencia')
      if (evidenciaId) {
        try {
          const procs = $app.findRecordsByFilter(
            'backup_processamentos',
            `evidencia = '${evidenciaId}'`,
            '-created',
            1,
            0,
          )
          if (procs.length > 0) {
            const resProc = procs[0].get('resultado')
            if (resProc && Array.isArray(resProc.vms) && resProc.vms.length > 0) {
              return resProc.vms
            }
          }
        } catch (_) {}
      }
      return []
    }

    // Helper: extrair nome amigável do Job para exibição (ex.: "Backup VMs to Cloud\Backup VMs GOLD")
    const extrairNomeJob = (execRec, rotinaRec) => {
      if (!execRec) return ''
      let jobNome = ''

      // 1. Tentar extrair da observação (ex.: 'Veeam backup_copy: "Backup VMs to Cloud\Backup VMs GOLD" (...)')
      const obs = execRec.getString('observacao') || ''
      if (obs) {
        const obsMatch = obs.match(/"([^"]+)"/)
        if (obsMatch && obsMatch[1]) {
          jobNome = obsMatch[1].trim()
        }
      }

      // 2. Se não achou, tentar da avaliação / laudo
      if (!jobNome) {
        try {
          const avals = $app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${execRec.id}'`,
            '-created',
            1,
            0,
          )
          if (avals.length > 0) {
            const itensAv = avals[0].get('itens_avaliados')
            if (itensAv && typeof itensAv === 'object' && itensAv.job_name) {
              jobNome = String(itensAv.job_name).trim()
            }
          }
        } catch (_) {}
      }

      // 3. Tentar de backup_processamentos
      if (!jobNome) {
        const evidenciaId = execRec.getString('evidencia')
        if (evidenciaId) {
          try {
            const procs = $app.findRecordsByFilter(
              'backup_processamentos',
              `evidencia = '${evidenciaId}'`,
              '-created',
              1,
              0,
            )
            if (procs.length > 0) {
              const resProc = procs[0].get('resultado')
              if (resProc && typeof resProc === 'object' && resProc.job_name) {
                jobNome = String(resProc.job_name).trim()
              }
            }
          } catch (_) {}
        }
      }

      // 4. Fallback: nome da rotina
      if (!jobNome && rotinaRec) {
        jobNome = rotinaRec.getString('nome') || ''
      }

      return jobNome
    }

    // Helper: extrair modalidade comprovada pelo conteúdo REAL do comprovante/execução
    // Regra de Negócio A: Considerar SOMENTE a identidade do job da própria evidência
    // (assunto da evidência e/ou nome do job/rotina vinculada), NUNCA o corpo do texto
    // nem o nome da ferramenta (ex.: "Veeam Backup & Replication" JAMAIS deve inferir 'replicacao').
    // - assunto/job contém "backup copy job:" -> 'nuvem'
    // - assunto/job contém "replication job:" -> 'replicacao'
    // - assunto/job contém "backup job:" (sem copy/replication) -> 'local'
    // - adaptador ACRONIS_PDF -> 'nuvem'
    // - ambíguo -> null (não comprova nada)
    const inferirModalidadeComprovante = (execRec, rotinaRec) => {
      if (!execRec) return null

      let assuntoEvidencia = ''
      let adaptadorCodigo = ''
      let jobNameLaudo = ''

      // 1. Buscar dados da avaliação técnica vinculada (laudo / adaptador / job_name)
      let evidenciaId = ''
      try {
        const avals = $app.findRecordsByFilter(
          'backup_avaliacoes',
          `execucao = '${execRec.id}'`,
          '-created',
          1,
          0,
        )
        if (avals.length > 0) {
          const itensAv = avals[0].get('itens_avaliados')
          if (itensAv && typeof itensAv === 'object') {
            jobNameLaudo = String(itensAv.job_name || '')
            adaptadorCodigo = String(itensAv.adaptador || '')
          }
          const laudoObj = avals[0].get('laudo_tecnico')
          if (laudoObj && typeof laudoObj === 'object') {
            if (
              !assuntoEvidencia &&
              laudoObj.fonte_comprovante &&
              laudoObj.fonte_comprovante.assunto
            ) {
              assuntoEvidencia = String(laudoObj.fonte_comprovante.assunto || '')
            }
            if (!adaptadorCodigo && laudoObj.adaptador && laudoObj.adaptador.codigo) {
              adaptadorCodigo = String(laudoObj.adaptador.codigo || '')
            }
          }
        }
      } catch (_) {}

      // 2. Se temos evidencia vinculada na execução ou através de backup_ocorrencias / backup_processamentos
      try {
        const procs = $app.findRecordsByFilter(
          'backup_processamentos',
          `execucao = '${execRec.id}'`,
          '-created',
          1,
          0,
        )
        if (procs.length > 0) {
          evidenciaId = procs[0].getString('evidencia')
          if (!adaptadorCodigo) {
            adaptadorCodigo = procs[0].getString('adaptador_usado') || ''
          }
          const resProc = procs[0].get('resultado')
          if (resProc && typeof resProc === 'object' && resProc.job_name) {
            if (!jobNameLaudo) jobNameLaudo = String(resProc.job_name || '')
          }
        }
      } catch (_) {}

      if (evidenciaId && !assuntoEvidencia) {
        try {
          const evRec = $app.findRecordById('backup_evidencias', evidenciaId)
          if (evRec) {
            assuntoEvidencia = evRec.getString('assunto') || ''
          }
        } catch (_) {}
      }

      // Se ainda não temos assunto, buscar qualquer evidência com mesma rotina
      if (!assuntoEvidencia && rotinaRec) {
        try {
          const evList = $app.findRecordsByFilter(
            'backup_evidencias',
            `rotina = '${rotinaRec.id}'`,
            '-created',
            1,
            0,
          )
          if (evList.length > 0) {
            assuntoEvidencia = evList[0].getString('assunto') || ''
          }
        } catch (_) {}
      }

      const rotinaNome = rotinaRec ? rotinaRec.getString('nome') : ''

      // Adaptador ACRONIS_PDF comprova nuvem diretamente
      if (adaptadorCodigo && adaptadorCodigo.toUpperCase() === 'ACRONIS_PDF') {
        return 'nuvem'
      }

      // Construir string de identidade do job contendo SOMENTE assunto da evidência e nomes de job/rotina
      const textoIdentidade = `${assuntoEvidencia} ${jobNameLaudo} ${rotinaNome}`.toLowerCase()

      // Ordem rigorosa:
      // 1. "backup copy job:" -> 'nuvem'
      if (textoIdentidade.includes('backup copy job:')) {
        return 'nuvem'
      }

      // 2. "replication job:" -> 'replicacao'
      if (textoIdentidade.includes('replication job:')) {
        return 'replicacao'
      }

      // 3. "backup job:" -> 'local' (garantindo ausência de copy/replication)
      if (
        textoIdentidade.includes('backup job:') &&
        !textoIdentidade.includes('copy') &&
        !textoIdentidade.includes('replication')
      ) {
        return 'local'
      }

      // Ambíguo ou não identificado com precisão -> null (não comprova nada)
      return null
    }

    // Helper: extrair data ISO de execução
    const extrairDataExecucao = (execRec) => {
      const dt =
        execRec.getString('data_inicio') ||
        execRec.getString('data_fim') ||
        execRec.getString('created')
      return dt || null
    }

    // Construção dos resultados por ativo
    const resultados = []
    let totalProtegidos = 0
    let totalParcial = 0
    let totalNaoProtegido = 0
    let totalNaoCadastrado = 0

    for (let i = 0; i < assetsExigidos.length; i++) {
      const asset = assetsExigidos[i]
      const assetId = asset.id
      const assetNome = asset.getString('name')
      const assetTipo = asset.getString('tipo')
      const assetCriticidade = asset.getString('criticidade')

      const exLocal = Boolean(asset.getBool('exige_backup_local'))
      const exNuvem = Boolean(asset.getBool('exige_backup_nuvem'))
      const exReplicacao = Boolean(asset.getBool('exige_backup_replicacao'))

      // Fontes vinculadas diretamente ao ativo via ativo_inventario
      let fontesDoAtivo = fontesPorAtivo[assetId] || []

      // Se não encontrou por ativo_inventario direto, tentar correspondência por caminho_identificacao com o nome do ativo
      if (fontesDoAtivo.length === 0) {
        const nomeNorm = normalizarString(assetNome)
        for (let fi = 0; fi < todasFontes.length; fi++) {
          const f = todasFontes[fi]
          const camNorm = normalizarString(f.getString('caminho_identificacao'))
          if (camNorm && camNorm === nomeNorm) {
            fontesDoAtivo.push(f)
          }
        }
      }

      // Função de avaliação de uma modalidade exigida ('local', 'nuvem', 'replicacao')
      // Regra de Ouro B: Fonte única de verdade — cada execução prova APENAS a modalidade que
      // o conteúdo do comprovante demonstra. O plano NÃO transfere modalidades.
      const avaliarModalidade = (modalidadeNome) => {
        // Encontrar todas as fontes ativas cadastradas para este ativo
        const fontesCandidatas = []
        for (let fi = 0; fi < fontesDoAtivo.length; fi++) {
          const f = fontesDoAtivo[fi]
          const rotinaId = f.getString('rotina')
          const rotina = rotinasMap[rotinaId]
          if (!rotina) continue

          const planoId = rotina.getString('plano')
          const plano = planosMap[planoId]
          if (!plano) continue

          // Uma rotina é candidata se o nome/tipo da rotina ou comprovante casar com a modalidade,
          // ou se houver fonte cadastrada na rotina. Guardamos a cadeia para auditoria e RPO.
          fontesCandidatas.push({
            fonte: f,
            rotina: rotina,
            plano: plano,
          })
        }

        if (fontesCandidatas.length === 0) {
          return {
            cadastrada: false,
            ultima_comprovacao: null,
            dentro_do_rpo: false,
            horas_desde_ultima: null,
            rpo_horas_configurado: 24,
            fonte_id: null,
            fonte_nome: null,
            rotina_id: null,
            rotina_nome: null,
            plano_id: null,
            plano_nome: null,
            execucao_id: null,
            status_modalidade: 'SEM_FONTE',
            ultima_execucao_falha: false,
            ultima_execucao_data: null,
            ultima_execucao_status: null,
            ocorrencias_abertas: 0,
          }
        }

        // Fontes cadastradas existem na cadeia. Agora inspecionar execuções reais com FAIL-CLOSED estrito.
        // OBRIGATÓRIO: A execução deve corresponder especificamente a esta modalidade (modalidadeNome).
        // Se a ÚLTIMA execução comprovada ou tentada para esta modalidade falhou (status !== 'sucesso'),
        // a modalidade entra em FALHA_ULTIMA_EXECUCAO, derrubando a conformidade do ativo.
        let melhorComprovacao = null
        let melhorDataTime = 0
        let melhorCandidato = fontesCandidatas[0]

        let ultimaExecucaoCronologica = null
        let ultimaExecucaoCronologicaTime = 0

        for (let ci = 0; ci < fontesCandidatas.length; ci++) {
          const cand = fontesCandidatas[ci]
          const rotinaId = cand.rotina.id
          const caminhoNorm = normalizarString(
            cand.fonte.getString('caminho_identificacao') || assetNome,
          )

          // Buscar execuções dessa rotina
          for (let ei = 0; ei < execucoes.length; ei++) {
            const ex = execucoes[ei]
            if (ex.getString('rotina') !== rotinaId) continue

            // 1. INFERÊNCIA ESTRITA DA MODALIDADE DO COMPROVANTE
            const modalidadeProvadaPelaExecucao = inferirModalidadeComprovante(ex, cand.rotina)
            if (modalidadeProvadaPelaExecucao !== modalidadeNome) {
              // Esta execução NÃO se aplica à modalidade avaliada
              continue
            }

            // 2. Granularidade por VM / Ativo:
            // Inspecionar detalhes_vms para saber se o ativo está presente e qual seu status individual
            let cobreAtivoNaExecucao = false
            let statusIndividualAtivo = null // 'sucesso' | 'erro' | 'aviso'
            let motivoIndividualAtivo = ''
            const dVms = obterDetalhesVmsExecucao(ex)
            const assetNomeNorm = normalizarString(assetNome)

            if (Array.isArray(dVms) && dVms.length > 0) {
              for (let vi = 0; vi < dVms.length; vi++) {
                const vm = dVms[vi]
                const vmNomeNorm = normalizarString(vm.nome)
                if (!vmNomeNorm) continue

                // Match tolerante: igualdade exata OU containment em ambos os sentidos
                const bateu =
                  vmNomeNorm === assetNomeNorm ||
                  vmNomeNorm === caminhoNorm ||
                  (assetNomeNorm && vmNomeNorm.includes(assetNomeNorm)) ||
                  (assetNomeNorm && assetNomeNorm.includes(vmNomeNorm)) ||
                  (caminhoNorm && vmNomeNorm.includes(caminhoNorm)) ||
                  (caminhoNorm && caminhoNorm.includes(vmNomeNorm))

                if (bateu) {
                  if (!vm.fora_escopo && vm.status_escopo !== 'fora_escopo') {
                    cobreAtivoNaExecucao = true
                    const st = String(vm.status || '').toLowerCase()
                    if (st === 'success' || st === 'sucesso') {
                      statusIndividualAtivo = 'sucesso'
                    } else if (st === 'warning' || st === 'aviso') {
                      statusIndividualAtivo = 'aviso'
                    } else if (
                      st === 'error' ||
                      st === 'failed' ||
                      st === 'erro' ||
                      st === 'falha'
                    ) {
                      statusIndividualAtivo = 'erro'
                      motivoIndividualAtivo = `VM ${vm.nome} constou com status "${vm.status}" na execução.`
                    } else {
                      statusIndividualAtivo = ex.getString('status') || 'erro'
                    }
                    break
                  }
                }
              }
              // FAIL-CLOSED: Se a execução tem tabela de VMs (dVms não-vazio) e este ativo NÃO consta na tabela,
              // ele NÃO é coberto por esta execução! Nem sucesso nem falha dessa execução se aplicam a ele.
            } else {
              // Execução da rotina que cobre as fontes vinculadas sem detalhes_vms
              cobreAtivoNaExecucao = true
              statusIndividualAtivo = ex.getString('status') || 'sucesso'
            }

            if (cobreAtivoNaExecucao) {
              const dtIso = extrairDataExecucao(ex)
              if (dtIso) {
                const dtTime = new Date(dtIso).getTime()
                const nomeJobExec = extrairNomeJob(ex, cand.rotina)

                // Rastrear a ÚLTIMA execução cronológica absoluta PARA ESTA VM
                if (dtTime > ultimaExecucaoCronologicaTime) {
                  ultimaExecucaoCronologicaTime = dtTime
                  ultimaExecucaoCronologica = {
                    dataIso: dtIso,
                    execucaoId: ex.id,
                    status: statusIndividualAtivo,
                    observacao: motivoIndividualAtivo || ex.getString('observacao') || '',
                    jobNome: nomeJobExec,
                    candidato: cand,
                  }
                }

                // O sucesso do item da VM prevalece como comprovação válida para esta VM
                if (statusIndividualAtivo === 'sucesso') {
                  if (dtTime > melhorDataTime) {
                    melhorDataTime = dtTime
                    melhorComprovacao = {
                      dataIso: dtIso,
                      execucaoId: ex.id,
                      jobNome: nomeJobExec,
                    }
                    melhorCandidato = cand
                  }
                }
              }
            }
          }
        }

        const candReferencia =
          (ultimaExecucaoCronologica && ultimaExecucaoCronologica.candidato) || melhorCandidato
        const rpoHoras = candReferencia.plano.getInt('rpo_horas') || 24

        // FAIL-CLOSED: Se a última execução cronológica foi de erro/falha,
        // a modalidade está compulsoriamente em falha, NÃO protegida!
        const ultimaFalhou =
          ultimaExecucaoCronologica &&
          ultimaExecucaoCronologica.status !== 'sucesso' &&
          ultimaExecucaoCronologicaTime >= melhorDataTime

        if (ultimaFalhou) {
          const horasDesdeFalha = (nowTime - ultimaExecucaoCronologicaTime) / (1000 * 60 * 60)
          return {
            cadastrada: true,
            ultima_comprovacao: melhorComprovacao ? melhorComprovacao.dataIso : null,
            dentro_do_rpo: false,
            horas_desde_ultima: Math.round(horasDesdeFalha * 10) / 10,
            rpo_horas_configurado: rpoHoras,
            fonte_id: candReferencia.fonte.id,
            fonte_nome: candReferencia.fonte.getString('caminho_identificacao') || assetNome,
            rotina_id: candReferencia.rotina.id,
            rotina_nome: candReferencia.rotina.getString('nome'),
            plano_id: candReferencia.plano.id,
            plano_nome: candReferencia.plano.getString('nome'),
            execucao_id: ultimaExecucaoCronologica.execucaoId,
            status_modalidade: 'FALHA_ULTIMA_EXECUCAO',
            ultima_execucao_falha: true,
            ultima_execucao_data: ultimaExecucaoCronologica.dataIso,
            ultima_execucao_status: ultimaExecucaoCronologica.status,
            ultima_execucao_obs: ultimaExecucaoCronologica.observacao,
            job_nome: ultimaExecucaoCronologica.jobNome || candReferencia.rotina.getString('nome'),
            ocorrencias_abertas: ocorrenciasAbertas.length,
          }
        }

        if (!melhorComprovacao) {
          return {
            cadastrada: true,
            ultima_comprovacao: null,
            dentro_do_rpo: false,
            horas_desde_ultima: null,
            rpo_horas_configurado: rpoHoras,
            fonte_id: candReferencia.fonte.id,
            fonte_nome: candReferencia.fonte.getString('caminho_identificacao') || assetNome,
            rotina_id: candReferencia.rotina.id,
            rotina_nome: candReferencia.rotina.getString('nome'),
            plano_id: candReferencia.plano.id,
            plano_nome: candReferencia.plano.getString('nome'),
            execucao_id: null,
            status_modalidade: 'NUNCA_COMPROVADA',
            ultima_execucao_falha: false,
            ultima_execucao_data: null,
            ultima_execucao_status: null,
            ocorrencias_abertas: ocorrenciasAbertas.length,
          }
        }

        const horasDesde = (nowTime - melhorDataTime) / (1000 * 60 * 60)
        const dentroRpo = horasDesde <= rpoHoras

        return {
          cadastrada: true,
          ultima_comprovacao: melhorComprovacao.dataIso,
          dentro_do_rpo: dentroRpo,
          horas_desde_ultima: Math.round(horasDesde * 10) / 10,
          rpo_horas_configurado: rpoHoras,
          fonte_id: candReferencia.fonte.id,
          fonte_nome: candReferencia.fonte.getString('caminho_identificacao') || assetNome,
          rotina_id: candReferencia.rotina.id,
          rotina_nome: candReferencia.rotina.getString('nome'),
          plano_id: candReferencia.plano.id,
          plano_nome: candReferencia.plano.getString('nome'),
          execucao_id: melhorComprovacao.execucaoId,
          status_modalidade: dentroRpo ? 'ATENDIDA' : 'FORA_RPO',
          ultima_execucao_falha: false,
          ultima_execucao_data: melhorComprovacao.dataIso,
          ultima_execucao_status: 'sucesso',
          job_nome: melhorComprovacao.jobNome || candReferencia.rotina.getString('nome'),
          ocorrencias_abertas: 0,
        }
      }

      const modalidades = {}
      let totalExigidas = 0
      let totalAtendidas = 0
      let algumaCadastrada = false

      if (exLocal) {
        totalExigidas++
        const av = avaliarModalidade('local')
        modalidades.local = av
        if (av.cadastrada) algumaCadastrada = true
        if (av.dentro_do_rpo) totalAtendidas++
      }

      if (exNuvem) {
        totalExigidas++
        const av = avaliarModalidade('nuvem')
        modalidades.nuvem = av
        if (av.cadastrada) algumaCadastrada = true
        if (av.dentro_do_rpo) totalAtendidas++
      }

      if (exReplicacao) {
        totalExigidas++
        const av = avaliarModalidade('replicacao')
        modalidades.replicacao = av
        if (av.cadastrada) algumaCadastrada = true
        if (av.dentro_do_rpo) totalAtendidas++
      }

      // Status consolidado do ativo:
      // - PROTEGIDO: todas as modalidades exigidas estão cadastradas e comprovadas dentro do RPO
      // - PARCIAL: algumas modalidades atendidas dentro do RPO
      // - NAO_PROTEGIDO: possui fonte cadastrada mas nenhuma modalidade comprovada dentro do RPO
      // - NAO_CADASTRADO: exige modalidade mas não possui nenhuma fonte cadastrada
      const modLocal = modalidades.local
      const modNuvem = modalidades.nuvem
      const modRepl = modalidades.replicacao
      const temFalhaRecente = [modLocal, modNuvem, modRepl].some(
        (m) => m && (m.status_modalidade === 'FALHA_ULTIMA_EXECUCAO' || m.ultima_execucao_falha),
      )

      let statusConsolidado = 'NAO_PROTEGIDO'
      if (temFalhaRecente) {
        if (totalAtendidas > 0) {
          statusConsolidado = 'PARCIAL'
          totalParcial++
        } else {
          statusConsolidado = 'NAO_PROTEGIDO'
          totalNaoProtegido++
        }
      } else if (totalExigidas > 0 && totalAtendidas === totalExigidas) {
        statusConsolidado = 'PROTEGIDO'
        totalProtegidos++
      } else if (totalAtendidas > 0) {
        statusConsolidado = 'PARCIAL'
        totalParcial++
      } else if (!algumaCadastrada) {
        statusConsolidado = 'NAO_CADASTRADO'
        totalNaoCadastrado++
      } else {
        statusConsolidado = 'NAO_PROTEGIDO'
        totalNaoProtegido++
      }

      resultados.push({
        id: assetId,
        nome: assetNome,
        tipo: assetTipo,
        criticidade: assetCriticidade,
        exigencias: {
          local: exLocal,
          nuvem: exNuvem,
          replicacao: exReplicacao,
          total_exigidas: totalExigidas,
        },
        modalidades: modalidades,
        status_consolidado: statusConsolidado,
        total_atendidas: totalAtendidas,
      })
    }

    // Ordenação pedagógica: primeiro os problemáticos (NAO_CADASTRADO, NAO_PROTEGIDO, PARCIAL, e por último PROTEGIDO)
    const prioridadeStatus = {
      NAO_CADASTRADO: 1,
      NAO_PROTEGIDO: 2,
      PARCIAL: 3,
      PROTEGIDO: 4,
    }
    resultados.sort((a, b) => {
      const pA = prioridadeStatus[a.status_consolidado] || 5
      const pB = prioridadeStatus[b.status_consolidado] || 5
      if (pA !== pB) return pA - pB
      return a.nome.localeCompare(b.nome)
    })

    const totalExigidos = assetsExigidos.length
    const percentualProtegido =
      totalExigidos > 0 ? Math.round((totalProtegidos / totalExigidos) * 100) : 0

    // Regra de Ouro D: Reconciliação das execuções e avaliações existentes
    // Recalcula confronto_escopo nas execuções gravadas para nunca exibir dados inflados
    // e registra o recálculo na auditoria append-only quando houver discrepância corrigida.
    let totalExecucoesReconciliadas = 0
    try {
      for (let ei = 0; ei < execucoes.length; ei++) {
        const ex = execucoes[ei]
        const rotinaId = ex.getString('rotina')
        const rotina = rotinasMap[rotinaId]
        const confAntigo = ex.get('confronto_escopo')

        const modalidadeEx = inferirModalidadeComprovante(ex, rotina)
        if (!modalidadeEx) continue

        // Se o confronto antigo tinha modalidades comprovadas indevidas (ex.: múltiplas modalidades como nuvem/replicacao para job local)
        let precisaAtualizar = false
        if (confAntigo && typeof confAntigo === 'object') {
          const compArr = confAntigo.comprovado || []
          for (let ci = 0; ci < compArr.length; ci++) {
            if (compArr[ci].modalidade !== modalidadeEx) {
              precisaAtualizar = true
              break
            }
          }
        }

        // Granularidade por VM na reconciliação:
        // Se a execução tem detalhes_vms, verificar status individual de cada VM.
        // Se não tem detalhes_vms, usa status da execução.
        let dVmsEx = obterDetalhesVmsExecucao(ex)
        const temDetalhesVms = Array.isArray(dVmsEx) && dVmsEx.length > 0

        // Se a execução ainda não tem detalhes_vms gravados diretamente nela, persistir agora
        const dVmsGravados = ex.get('detalhes_vms')
        if ((!Array.isArray(dVmsGravados) || dVmsGravados.length === 0) && temDetalhesVms) {
          try {
            ex.set('detalhes_vms', dVmsEx)
            $app.save(ex)
          } catch (_) {}
        }

        const nomeJobReconciliado = extrairNomeJob(ex, rotina)

        // Se a execução tem comprovado vazio ou inflado, ou precisa de reconciliação granular
        if (
          precisaAtualizar ||
          (confAntigo &&
            confAntigo.comprovado &&
            confAntigo.comprovado.length === 0 &&
            modalidadeEx === 'local') ||
          temDetalhesVms
        ) {
          // Reconstruir comprovado e pendencias a partir dos ativos exigidos
          const novoComprovado = []
          const novasPendencias = []

          for (let ai = 0; ai < assetsExigidos.length; ai++) {
            const a = assetsExigidos[ai]
            const aId = a.id
            const aNome = a.getString('name')
            const aTipo = a.getString('tipo')
            const aNomeNorm = normalizarString(aNome)
            const exLoc = Boolean(a.getBool('exige_backup_local'))
            const exNuv = Boolean(a.getBool('exige_backup_nuvem'))
            const exRep = Boolean(a.getBool('exige_backup_replicacao'))

            const mods = []
            if (exLoc) mods.push('local')
            if (exNuv) mods.push('nuvem')
            if (exRep) mods.push('replicacao')

            // Verificar status desta VM especificamente nesta execução
            let vmPresente = false
            let vmComSucesso = false
            let vmMotivoErro = ''

            if (temDetalhesVms) {
              for (let vi = 0; vi < dVmsEx.length; vi++) {
                const vmObj = dVmsEx[vi]
                const vmNorm = normalizarString(vmObj.nome)
                if (
                  vmNorm &&
                  (vmNorm === aNomeNorm || vmNorm.includes(aNomeNorm) || aNomeNorm.includes(vmNorm))
                ) {
                  vmPresente = true
                  const st = String(vmObj.status || '').toLowerCase()
                  if (st === 'success' || st === 'sucesso') {
                    vmComSucesso = true
                  } else {
                    vmComSucesso = false
                    vmMotivoErro = `VM ${vmObj.nome} constou com status "${vmObj.status}" na execução do job ${nomeJobReconciliado ? "'" + nomeJobReconciliado + "'" : ''}.`
                  }
                  break
                }
              }
            } else {
              vmPresente = true
              vmComSucesso = ex.getString('status') === 'sucesso'
              if (!vmComSucesso) {
                vmMotivoErro = `Execução do job ${nomeJobReconciliado ? "'" + nomeJobReconciliado + "'" : ''} reportou status "${ex.getString('status')}".`
              }
            }

            for (let mi = 0; mi < mods.length; mi++) {
              const m = mods[mi]
              if (m === modalidadeEx && vmComSucesso) {
                novoComprovado.push({
                  ativo_id: aId,
                  ativo_nome: aNome,
                  ativo_tipo: aTipo,
                  modalidade: m,
                  item_comprovante: aNome,
                  fonte_casada: aNome,
                  rotina_nome: rotina ? rotina.getString('nome') : null,
                  job_nome: nomeJobReconciliado || (rotina ? rotina.getString('nome') : null),
                  plano_nome:
                    rotina && planosMap[rotina.getString('plano')]
                      ? planosMap[rotina.getString('plano')].getString('nome')
                      : null,
                  status: 'sucesso',
                  comprovado_em: extrairDataExecucao(ex) || now.toISOString(),
                })
              } else {
                const modLabel = m === 'local' ? 'Local' : m === 'nuvem' ? 'Nuvem' : 'Replicação'
                let motivoPend = `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`
                if (m === modalidadeEx) {
                  if (!vmPresente) {
                    motivoPend = `Ativo não mencionado neste comprovante (pode ser coberto por outra rotina/job).`
                  } else if (!vmComSucesso) {
                    motivoPend =
                      vmMotivoErro ||
                      `Execução reportou falha para este item. Modalidade não homologada.`
                  }
                }
                novasPendencias.push({
                  ativo_id: aId,
                  ativo_nome: aNome,
                  ativo_tipo: aTipo,
                  modalidade_pendente: m,
                  ativo_presente_no_comprovante: vmPresente,
                  item_comprovante: aNome,
                  motivo: motivoPend,
                  job_nome: nomeJobReconciliado || (rotina ? rotina.getString('nome') : null),
                  atendivel_por_outra_rotina: m !== modalidadeEx,
                })
              }
            }
          }

          const novoConfronto = {
            escopo_id: confAntigo ? confAntigo.escopo_id : null,
            escopo_nome: confAntigo ? confAntigo.escopo_nome : 'Escopo do Inventário',
            rotina_id: rotinaId,
            rotina_nome: rotina ? rotina.getString('nome') : null,
            job_nome: nomeJobReconciliado || (rotina ? rotina.getString('nome') : null),
            plano_id: rotina ? rotina.getString('plano') : null,
            plano_nome:
              rotina && planosMap[rotina.getString('plano')]
                ? planosMap[rotina.getString('plano')].getString('nome')
                : null,
            modalidades_plano: [modalidadeEx],
            exigencias: confAntigo && confAntigo.exigencias ? confAntigo.exigencias : [],
            comprovado: novoComprovado,
            pendencias: novasPendencias,
            total_ativos_escopo: assetsExigidos.length,
            total_exigencias_modalidade: novoComprovado.length + novasPendencias.length,
            total_comprovadas: novoComprovado.length,
            total_pendencias: novasPendencias.length,
          }
          ex.set('confronto_escopo', novoConfronto)
          $app.save(ex)
          totalExecucoesReconciliadas++

          // Atualizar avaliação correspondente
          try {
            const avals = $app.findRecordsByFilter(
              'backup_avaliacoes',
              `execucao = '${ex.id}'`,
              '-created',
              1,
              0,
            )
            if (avals.length > 0) {
              const avRec = avals[0]
              avRec.set('confronto_escopo', novoConfronto)

              // Ajustar laudo técnico da avaliação para que não seja conflitante
              const laudoObj = avRec.get('laudo_tecnico')
              if (laudoObj && typeof laudoObj === 'object') {
                const checks = laudoObj.verificacoes || []
                for (let ci = 0; ci < checks.length; ci++) {
                  if (checks[ci].item === 'identificacao') {
                    checks[ci].passou = true
                    checks[ci].status = 'conforme'
                    checks[ci].detalhes =
                      'Regra de identificação correspondente ao job Veeam identificada com sucesso.'
                  }
                }
                laudoObj.verificacoes = checks
                laudoObj.resultado = 'conforme'
                laudoObj.veredito = `Conforme: Cópia executada com sucesso. Modalidade comprovada: ${modalidadeEx.toUpperCase()}.`
                avRec.set('laudo_tecnico', laudoObj)
                avRec.set('resultado_conformidade', 'conforme')
                avRec.set(
                  'detalhe',
                  `Conforme: Cópia executada com sucesso. Modalidade comprovada: ${modalidadeEx.toUpperCase()}.`,
                )
              }

              $app.save(avRec)
            }
          } catch (_) {}
        }
      }

      // Se houve reconciliação, registrar na auditoria append-only
      if (totalExecucoesReconciliadas > 0) {
        try {
          const auditCol = $app.findCollectionByNameOrId('audit_log')
          const auditRec = new Record(auditCol)
          auditRec.set('organization', targetOrgId)
          auditRec.set('user', auth.id)
          auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
          auditRec.set('user_email', auth.getString('email'))
          auditRec.set('action', 'BACKUP_CONFRONTO_RECONCILED')
          auditRec.set('entity', 'Backup e Continuidade')
          auditRec.set(
            'detail',
            `Reconciliação de confronto de proteção por ativo executada. ${totalExecucoesReconciliadas} execução(ões) recalculada(s) pela regra estrita de comprovação.`,
          )
          auditRec.set('metadata', {
            total_reconciliadas: totalExecucoesReconciliadas,
            total_ativos_exigidos: totalExigidos,
            total_protegidos: totalProtegidos,
            percentual_protegido: percentualProtegido,
          })
          $app.save(auditRec)
        } catch (_) {}
      }
    } catch (_) {}

    return e.json(200, {
      ok: true,
      data_analise: now.toISOString(),
      organization: targetOrgId,
      totais: {
        total_ativos_inventario: assets.length,
        total_ativos_exigidos: totalExigidos,
        total_protegidos: totalProtegidos,
        total_parcial: totalParcial,
        total_nao_protegido: totalNaoProtegido,
        total_nao_cadastrado: totalNaoCadastrado,
        percentual_protegido: percentualProtegido,
      },
      confronto: resultados,
      reconciliadas: totalExecucoesReconciliadas,
    })
  },
  $apis.requireAuth(),
)
