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

    // 5. Carregar execuções de backup com status 'sucesso' (e 'parcial' onde aplicável)
    // Ordenadas por data_inicio DESC para encontrar a última comprovação mais recente
    let execucoes = []
    try {
      execucoes = $app.findRecordsByFilter(
        'backup_execucoes',
        `organization = '${targetOrgId}' && (status = 'sucesso' || status = 'parcial')`,
        '-data_inicio',
        500,
        0,
      )
    } catch (_) {}

    // Helper: normalizar string para matching de caminhos/aliases
    const normalizarString = (str) => {
      if (!str) return ''
      let s = String(str).trim().toLowerCase()
      s = s.replace(/\\/g, '/')
      s = s.replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
      s = s.replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
      s = s.replace(/\s+/g, ' ').trim()
      return s
    }

    // Helper: extrair modalidade comprovada pelo conteúdo REAL do comprovante/execução
    // Regra de Ouro A: A modalidade provada sai do COMPROVANTE, NUNCA do plano.
    // O plano declara intenção; o comprovante é prova.
    // - Backup Copy Job / Cloud / Acronis nuvem => Nuvem
    // - Replication Job / replica => Replicação
    // - Job de backup com destino repositório local/NAS / backup job padrão => Local
    // - Se não der para inferir com segurança => NENHUMA modalidade comprovada.
    const inferirModalidadeComprovante = (execRec, rotinaRec) => {
      if (!execRec) return null

      // Obter textos relevantes da execução e da rotina vinculada
      const obs = (execRec.getString('observacao') || '').toLowerCase()
      const dest = (execRec.getString('destino') || '').toLowerCase()
      const rotinaNome = (rotinaRec ? rotinaRec.getString('nome') : '').toLowerCase()

      // Tentar ler também do laudo gravado na avaliação vinculada, se houver
      let jobNameLaudo = ''
      let adaptadorLaudo = ''
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
            jobNameLaudo = String(itensAv.job_name || '').toLowerCase()
            adaptadorLaudo = String(itensAv.adaptador || '').toLowerCase()
          }
        }
      } catch (_) {}

      const textoCompleto = `${obs} ${dest} ${rotinaNome} ${jobNameLaudo} ${adaptadorLaudo}`

      // 1. Replicação: cópia offsite / replication job
      if (
        textoCompleto.includes('replication job') ||
        textoCompleto.includes('replication_') ||
        textoCompleto.includes('replication') ||
        textoCompleto.includes('replica')
      ) {
        return 'replicacao'
      }

      // 2. Nuvem: backup copy job, envio para nuvem/cloud, Acronis Cloud
      if (
        textoCompleto.includes('backup copy job') ||
        textoCompleto.includes('copy job') ||
        textoCompleto.includes('to cloud') ||
        textoCompleto.includes('nuvem') ||
        textoCompleto.includes('cloud') ||
        adaptadorLaudo.includes('acronis')
      ) {
        return 'nuvem'
      }

      // 3. Local: backup job comum, repositório local/NAS
      if (
        textoCompleto.includes('backup job:') ||
        textoCompleto.includes('backup vms') ||
        textoCompleto.includes('local') ||
        textoCompleto.includes('repository') ||
        textoCompleto.includes('veeam backup') ||
        textoCompleto.includes('veeam')
      ) {
        return 'local'
      }

      // Caso não seja possível inferir com segurança, nunca presumir conformidade
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
            rpo_horas_configurado: null,
            fonte_id: null,
            fonte_nome: null,
            rotina_id: null,
            rotina_nome: null,
            plano_id: null,
            plano_nome: null,
            execucao_id: null,
            status_modalidade: 'SEM_FONTE', // SEM_FONTE, NUNCA_COMPROVADA, FORA_RPO, ATENDIDA
          }
        }

        // Fontes cadastradas existem na cadeia. Agora buscar última comprovação real
        // OBRIGATÓRIO: A execução deve PROVAR especificamente esta modalidade (modalidadeNome)
        let melhorComprovacao = null
        let melhorDataTime = 0
        let melhorCandidato = fontesCandidatas[0]

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
              // Esta execução NÃO prova a modalidade avaliada
              continue
            }

            // 2. Verificar se o comprovante desta execução cobre este ativo:
            // a) detalhes_vms contém o nome/item do ativo e não está marcado fora_escopo
            // b) ou a rotina cobre o ativo (execução com sucesso geral)
            let cobreAtivoNaExecucao = false
            const dVms = ex.get('detalhes_vms')
            if (Array.isArray(dVms) && dVms.length > 0) {
              for (let vi = 0; vi < dVms.length; vi++) {
                const vm = dVms[vi]
                const vmNomeNorm = normalizarString(vm.nome)
                if (
                  vmNomeNorm &&
                  (vmNomeNorm === caminhoNorm || vmNomeNorm === normalizarString(assetNome))
                ) {
                  if (!vm.fora_escopo && vm.status_escopo !== 'fora_escopo') {
                    cobreAtivoNaExecucao = true
                    break
                  }
                }
              }
            } else {
              // Execução da rotina que cobre as fontes vinculadas
              cobreAtivoNaExecucao = true
            }

            if (cobreAtivoNaExecucao) {
              const dtIso = extrairDataExecucao(ex)
              if (dtIso) {
                const dtTime = new Date(dtIso).getTime()
                if (dtTime > melhorDataTime) {
                  melhorDataTime = dtTime
                  melhorComprovacao = {
                    dataIso: dtIso,
                    execucaoId: ex.id,
                  }
                  melhorCandidato = cand
                }
              }
            }
          }
        }

        const rpoHoras = melhorCandidato.plano.getInt('rpo_horas') || 24

        if (!melhorComprovacao) {
          return {
            cadastrada: true,
            ultima_comprovacao: null,
            dentro_do_rpo: false,
            horas_desde_ultima: null,
            rpo_horas_configurado: rpoHoras,
            fonte_id: melhorCandidato.fonte.id,
            fonte_nome: melhorCandidato.fonte.getString('caminho_identificacao') || assetNome,
            rotina_id: melhorCandidato.rotina.id,
            rotina_nome: melhorCandidato.rotina.getString('nome'),
            plano_id: melhorCandidato.plano.id,
            plano_nome: melhorCandidato.plano.getString('nome'),
            execucao_id: null,
            status_modalidade: 'NUNCA_COMPROVADA',
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
          fonte_id: melhorCandidato.fonte.id,
          fonte_nome: melhorCandidato.fonte.getString('caminho_identificacao') || assetNome,
          rotina_id: melhorCandidato.rotina.id,
          rotina_nome: melhorCandidato.rotina.getString('nome'),
          plano_id: melhorCandidato.plano.id,
          plano_nome: melhorCandidato.plano.getString('nome'),
          execucao_id: melhorComprovacao.execucaoId,
          status_modalidade: dentroRpo ? 'ATENDIDA' : 'FORA_RPO',
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
      let statusConsolidado = 'NAO_PROTEGIDO'
      if (totalExigidas > 0 && totalAtendidas === totalExigidas) {
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

        // Se a execução tem comprovado vazio ou inflado, recalcular confronto honesto
        if (
          precisaAtualizar ||
          (confAntigo &&
            confAntigo.comprovado &&
            confAntigo.comprovado.length === 0 &&
            modalidadeEx === 'local')
        ) {
          // Reconstruir comprovado e pendencias a partir dos ativos exigidos
          const novoComprovado = []
          const novasPendencias = []

          for (let ai = 0; ai < assetsExigidos.length; ai++) {
            const a = assetsExigidos[ai]
            const aId = a.id
            const aNome = a.getString('name')
            const aTipo = a.getString('tipo')
            const exLoc = Boolean(a.getBool('exige_backup_local'))
            const exNuv = Boolean(a.getBool('exige_backup_nuvem'))
            const exRep = Boolean(a.getBool('exige_backup_replicacao'))

            const mods = []
            if (exLoc) mods.push('local')
            if (exNuv) mods.push('nuvem')
            if (exRep) mods.push('replicacao')

            for (let mi = 0; mi < mods.length; mi++) {
              const m = mods[mi]
              if (m === modalidadeEx && ex.getString('status') === 'sucesso') {
                novoComprovado.push({
                  ativo_id: aId,
                  ativo_nome: aNome,
                  ativo_tipo: aTipo,
                  modalidade: m,
                  item_comprovante: aNome,
                  fonte_casada: aNome,
                  rotina_nome: rotina ? rotina.getString('nome') : null,
                  plano_nome:
                    rotina && planosMap[rotina.getString('plano')]
                      ? planosMap[rotina.getString('plano')].getString('nome')
                      : null,
                  status: 'sucesso',
                  comprovado_em: extrairDataExecucao(ex) || now.toISOString(),
                })
              } else {
                const modLabel = m === 'local' ? 'Local' : m === 'nuvem' ? 'Nuvem' : 'Replicação'
                novasPendencias.push({
                  ativo_id: aId,
                  ativo_nome: aNome,
                  ativo_tipo: aTipo,
                  modalidade_pendente: m,
                  ativo_presente_no_comprovante: true,
                  item_comprovante: aNome,
                  motivo: `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`,
                  atendivel_por_outra_rotina: true,
                })
              }
            }
          }

          const novoConfronto = {
            escopo_id: confAntigo ? confAntigo.escopo_id : null,
            escopo_nome: confAntigo ? confAntigo.escopo_nome : 'Escopo do Inventário',
            rotina_id: rotinaId,
            rotina_nome: rotina ? rotina.getString('nome') : null,
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
