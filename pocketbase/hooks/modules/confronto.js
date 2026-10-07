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

    // Helper: extrair array de destinos de um plano
    const extrairDestinosPlano = (planoRec) => {
      if (!planoRec) return []
      const rawDestino = planoRec.get('destino')
      if (Array.isArray(rawDestino)) {
        return rawDestino
      }
      if (typeof rawDestino === 'string') {
        const dStr = rawDestino.trim()
        if (dStr.startsWith('[') && dStr.endsWith(']')) {
          try {
            const parsed = JSON.parse(dStr)
            if (Array.isArray(parsed)) return parsed
          } catch (_) {}
        }
        if (dStr) return [dStr]
      }
      return []
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
      const avaliarModalidade = (modalidadeNome) => {
        // Encontrar fontes do ativo cujo plano cubra esta modalidade
        // Modalidade -> destino do plano:
        // 'local' -> destino inclui 'local'
        // 'nuvem' -> destino inclui 'nuvem'
        // 'replicacao' -> destino inclui 'externo' (ou 'replicacao')
        const destinoAlvo = modalidadeNome === 'replicacao' ? 'externo' : modalidadeNome

        const fontesCandidatas = []
        for (let fi = 0; fi < fontesDoAtivo.length; fi++) {
          const f = fontesDoAtivo[fi]
          const rotinaId = f.getString('rotina')
          const rotina = rotinasMap[rotinaId]
          if (!rotina) continue

          const planoId = rotina.getString('plano')
          const plano = planosMap[planoId]
          if (!plano) continue

          const destinos = extrairDestinosPlano(plano)
          let cobreDestino = false
          for (let di = 0; di < destinos.length; di++) {
            const d = String(destinos[di]).toLowerCase().trim()
            if (d === destinoAlvo || (modalidadeNome === 'replicacao' && d === 'replicacao')) {
              cobreDestino = true
              break
            }
          }

          if (cobreDestino) {
            fontesCandidatas.push({
              fonte: f,
              rotina: rotina,
              plano: plano,
            })
          }
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

        // Fontes existem e estão ativas na cadeia. Agora buscar última comprovação real
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

            // Verificar se o comprovante desta execução cobre este ativo:
            // a) detalhes_vms contém o nome/item do ativo e não está marcado fora_escopo
            // b) ou a rotina é unívoca e executou com sucesso
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
                  // Se status_escopo !== 'fora_escopo' ou fora_escopo !== true
                  if (!vm.fora_escopo && vm.status_escopo !== 'fora_escopo') {
                    cobreAtivoNaExecucao = true
                    break
                  }
                }
              }
            } else {
              // Execução geral da rotina sem desmembramento de VMs individuais:
              // Comprova as fontes cadastradas nesta rotina
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
    })
  },
  $apis.requireAuth(),
)
