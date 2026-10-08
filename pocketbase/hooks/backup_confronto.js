/**
 * Motor de Validação Centrada no Ativo (Confronto Contínuo de Backup)
 * Rota: GET /backend/v1/backup/confronto
 * Rota: POST /backend/v1/backup/confronto
 *
 * Avalia exigências normativas (local, nuvem, replicação) vs. fontes cadastradas
 * vs. comprovações reais dentro do RPO de forma auditável e factual.
 *
 * REGRA CRÍTICA POCKETBASE JSVM: Todo o código e funções auxiliares ficam
 * estritamente DENTRO do corpo do callback para evitar erros de scoping entre VMs.
 */

routerAdd(
  'GET',
  '/backend/v1/backup/confronto',
  (e) => {
    // -------------------------------------------------------------
    // Funções auxiliares escopadas no callback
    // -------------------------------------------------------------
    function normalizarNomeSimples(txt) {
      if (!txt) return ''
      return String(txt)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
    }

    function parseJsonSafely(raw) {
      if (!raw) return null
      if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw
      }
      if (Array.isArray(raw)) {
        try {
          if (raw.length > 0 && typeof raw[0] === 'number') {
            let str = ''
            for (let i = 0; i < raw.length; i++) {
              str += String.fromCharCode(raw[i])
            }
            return JSON.parse(str)
          }
        } catch (_) {}
      }
      if (typeof raw === 'string') {
        const sTrim = raw.trim()
        if (sTrim.startsWith('{') && sTrim.endsWith('}')) {
          try {
            return JSON.parse(sTrim)
          } catch (_) {}
        }
      }
      return null
    }

    function parseJsonArraySafely(raw) {
      if (!raw) return []
      if (Array.isArray(raw)) {
        if (raw.length > 0 && typeof raw[0] === 'number') {
          try {
            let str = ''
            for (let i = 0; i < raw.length; i++) {
              str += String.fromCharCode(raw[i])
            }
            const parsed = JSON.parse(str)
            return Array.isArray(parsed) ? parsed : []
          } catch (_) {}
        }
        return raw
      }
      if (typeof raw === 'string') {
        const sTrim = raw.trim()
        if (sTrim.startsWith('[') && sTrim.endsWith(']')) {
          try {
            const parsed = JSON.parse(sTrim)
            return Array.isArray(parsed) ? parsed : []
          } catch (_) {}
        }
      }
      return []
    }

    function inferirModalidadePorTexto(texto) {
      const t = String(texto || '').trim()
      if (!t) return null

      // Avaliação: nuvem/replicação ANTES de local. Local somente se nenhum qualificador de nuvem/replicação.
      // Replicacao: palavra inteira, excluindo "backup & replication"
      const tSemSignature = t.replace(/backup\s*&\s*replication/gi, '')
      if (
        /\b(?:replicas?|replica[çc][aã]o|replica[çc][oõ]es|replication job)\b/i.test(tSemSignature)
      ) {
        return 'replicacao'
      }

      // Nuvem: palavra inteira
      if (/\b(?:nuvens?|cloud|backup_copy|copy job)\b/i.test(tSemSignature)) {
        return 'nuvem'
      }

      // Local: palavra inteira
      if (/\blocal\b/i.test(tSemSignature)) {
        return 'local'
      }

      return null
    }

    function inferirModalidadeExecucao(observacao, rotinaNome, destino) {
      const obs = String(observacao || '').toLowerCase()
      const rot = String(rotinaNome || '').trim()
      const dest = String(destino || '').trim()

      // 1) Prefixo do tipo do job na observação (PRIORIDADE MÁXIMA, definitivo)
      if (
        obs.indexOf('veeam backup_copy:') !== -1 ||
        obs.indexOf('backup copy job:') !== -1 ||
        obs.indexOf('copy job:') !== -1
      ) {
        return 'nuvem'
      }
      if (obs.indexOf('veeam replication:') !== -1 || obs.indexOf('replication job:') !== -1) {
        return 'replicacao'
      }
      if (obs.indexOf('veeam backup:') !== -1 || obs.indexOf('backup job:') !== -1) {
        return 'local'
      }

      // 2) ÚLTIMO recurso — sufixo ancorado no nome da rotina (regex com âncora de fim, não contenção)
      if (rot) {
        if (/-\s*replicas?$|\breplica[çc][aã]o$/i.test(rot)) {
          return 'replicacao'
        }
        if (/to cloud/i.test(rot) || /-\s*nuvens?$/i.test(rot)) {
          return 'nuvem'
        }
        if (/-\s*local$/i.test(rot)) {
          return 'local'
        }
      }

      // 3) Destino, somente se inequívoco
      if (dest) {
        const destLower = dest.toLowerCase()
        const temLocal = /\blocal\b/i.test(destLower)
        const temNuvem = /\b(?:nuvens?|cloud)\b/i.test(destLower)
        const temReplica = /\b(?:replicas?|replica[çc][aã]o|replication)\b/i.test(destLower)

        // Se tiver mais de um destino (ex.: "Local/Nuvem"), é ambíguo -> não inequívoco
        const count = (temLocal ? 1 : 0) + (temNuvem ? 1 : 0) + (temReplica ? 1 : 0)
        if (count === 1) {
          if (temReplica) return 'replicacao'
          if (temNuvem) return 'nuvem'
          if (temLocal) return 'local'
        }
      }

      // 4) null se nada — execução sem modalidade NUNCA comprova exigência nenhuma
      return null
    }

    function executionMatchesModalidade(execItem, targetModalidade) {
      const target = String(targetModalidade || '').toLowerCase()

      // 1. Se a execução possui modalidade inferida, ela DEVE ser igual à exigência avaliada.
      // Uma execução LOCAL NUNCA pode satisfazer NUVEM ou REPLICAÇÃO, e vice-versa.
      if (execItem.modalidade_inferida) {
        return execItem.modalidade_inferida === target
      }

      // 2. Se a execução não tiver modalidade inferida direta, verificar se comprovados ou falhas
      // trazem a modalidade explicitamente
      const comprovados = execItem.comprovados || []
      for (let i = 0; i < comprovados.length; i++) {
        const m = String(comprovados[i].modalidade || '').toLowerCase()
        if (m === target) return true
      }

      const falhas = execItem.falhas || []
      for (let j = 0; j < falhas.length; j++) {
        const mf = String(falhas[j].modalidade || '').toLowerCase()
        if (mf === target) return true
      }

      // 3. Fallback estrito no nome da rotina (somente se a rotina declarar explicitamente a modalidade)
      const rotMod = inferirModalidadePorTexto(execItem.rotina_nome)
      if (rotMod) {
        return rotMod === target
      }

      return false
    }

    function verificarAtivoNaExecucao(execItem, assetId, assetNome, targetModalidade) {
      const normAssetNome = normalizarNomeSimples(assetNome)
      const targetMod = String(targetModalidade || '').toLowerCase()

      // Regra de Ouro: a execução como um todo deve ser compatível com a modalidade
      if (execItem.modalidade_inferida && execItem.modalidade_inferida !== targetMod) {
        return { encontrado: false }
      }

      // 1. Verificar no array comprovado de confronto_escopo
      const comprovados = execItem.comprovados || []
      for (let i = 0; i < comprovados.length; i++) {
        const comp = comprovados[i]
        const compMod = String(comp.modalidade || '').toLowerCase()
        // Se o item tem modalidade explícita, DEVE bater com targetMod.
        // Se não tem modalidade explícita, a execução DEVE ter modalidade inferida igual a targetMod.
        const modalidadeOk = compMod
          ? compMod === targetMod
          : execItem.modalidade_inferida === targetMod

        if (modalidadeOk) {
          const matchId = comp.ativo_id && comp.ativo_id === assetId
          const matchNome =
            normalizarNomeSimples(comp.ativo_nome) === normAssetNome ||
            normalizarNomeSimples(comp.item_comprovante) === normAssetNome ||
            normalizarNomeSimples(comp.fonte_casada) === normAssetNome

          if (matchId || matchNome) {
            return {
              encontrado: true,
              status: 'sucesso',
              job_nome: comp.job_nome || comp.rotina_nome || execItem.rotina_nome,
              vms_falhas: [],
              vms_sucesso: [assetNome],
            }
          }
        }
      }

      // 2. Verificar no array falhas de confronto_escopo
      const falhas = execItem.falhas || []
      for (let j = 0; j < falhas.length; j++) {
        const falha = falhas[j]
        const falhaMod = String(falha.modalidade || '').toLowerCase()
        const modalidadeOk = falhaMod
          ? falhaMod === targetMod
          : execItem.modalidade_inferida === targetMod

        if (modalidadeOk) {
          const matchId = falha.ativo_id && falha.ativo_id === assetId
          const matchNome =
            normalizarNomeSimples(falha.ativo_nome) === normAssetNome ||
            normalizarNomeSimples(falha.item_comprovante) === normAssetNome

          if (matchId || matchNome) {
            return {
              encontrado: true,
              status: 'falha',
              job_nome: falha.job_nome || falha.rotina_nome || execItem.rotina_nome,
              motivo: falha.motivo,
              vms_falhas: [assetNome],
              vms_sucesso: [],
            }
          }
        }
      }

      // 3. Fallback: verificar em detalhes_vms (apenas se a execução demonstrar a mesma modalidade da exigência)
      const modExec =
        execItem.modalidade_inferida || inferirModalidadePorTexto(execItem.rotina_nome)
      if (modExec === targetMod) {
        const vms = execItem.detalhes_vms || []
        if (vms.length > 0) {
          const vmsFalhasList = []
          const vmsSucessoList = []
          let vmMatch = null

          for (let vI = 0; vI < vms.length; vI++) {
            const vm = vms[vI]
            const vmNome = vm.nome || ''
            const normVm = normalizarNomeSimples(vmNome)
            const st = String(vm.status || '').toLowerCase()
            const isFailed = st === 'failed' || st === 'error' || st === 'erro' || st === 'falha'
            if (isFailed) {
              vmsFalhasList.push(vmNome)
            } else {
              vmsSucessoList.push(vmNome)
            }

            if (vm.ativo_id === assetId || normVm === normAssetNome) {
              vmMatch = vm
            }
          }

          if (vmMatch) {
            const stMatch = String(vmMatch.status || '').toLowerCase()
            const matchFailed =
              stMatch === 'failed' ||
              stMatch === 'error' ||
              stMatch === 'erro' ||
              stMatch === 'falha'
            return {
              encontrado: true,
              status: matchFailed ? 'falha' : 'sucesso',
              job_nome: execItem.rotina_nome,
              vms_falhas: vmsFalhasList,
              vms_sucesso: vmsSucessoList,
            }
          }
        }
      }

      return { encontrado: false }
    }

    function formatarDataSimplesSp(isoStr) {
      if (!isoStr) return ''
      try {
        const d = new Date(isoStr)
        return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      } catch (_) {
        return String(isoStr)
      }
    }

    // -------------------------------------------------------------
    // Execução da requisição
    // -------------------------------------------------------------
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const queryParams = e.requestInfo().query || {}
    const bodyParams = e.requestInfo().body || {}
    let organizationId =
      queryParams.organization ||
      bodyParams.organization ||
      bodyParams.organizationId ||
      auth.getString('organization')

    if (!organizationId) {
      try {
        const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
        if (firstOrg.length > 0) {
          organizationId = firstOrg[0].id
        }
      } catch (_) {}
    }

    if (!organizationId) {
      return e.badRequestError('Nenhuma organização associada.')
    }

    const userRole = auth.getString('system_role') || 'usuario'
    if (userRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    const isDebug = false

    // 1. Carregar ativos do inventário ativos da organização
    let allAssets = []
    try {
      allAssets = $app.findRecordsByFilter(
        'inventory_assets',
        `organization = '${organizationId}' && status = 'ativo'`,
        '+name',
        500,
        0,
      )
    } catch (errAssets) {
      console.error('[confronto] Erro ao carregar inventory_assets:', errAssets)
    }

    // 2. Carregar escopos ativos da organização
    let escopoRecords = []
    try {
      escopoRecords = $app.findRecordsByFilter(
        'backup_escopo',
        `organization = '${organizationId}' && status = 'ativo'`,
        '-created',
        50,
        0,
      )
    } catch (_) {}

    // 3. Carregar planos de backup ativos da organização
    let planoRecords = []
    try {
      planoRecords = $app.findRecordsByFilter(
        'backup_planos',
        `organization = '${organizationId}' && status = 'ativo'`,
        '-created',
        50,
        0,
      )
    } catch (_) {}

    let rpoHorasDefault = 24
    const planosMap = {}
    for (let pI = 0; pI < planoRecords.length; pI++) {
      const pl = planoRecords[pI]
      const rpH = pl.getInt('rpo_horas') || 24
      if (rpH > 0 && rpoHorasDefault === 24) {
        rpoHorasDefault = rpH
      }
      let destinosList = []
      try {
        const destRaw = pl.get('destino')
        destinosList = parseJsonArraySafely(destRaw)
      } catch (_) {}

      planosMap[pl.id] = {
        id: pl.id,
        nome: pl.getString('nome') || 'Plano de Continuidade',
        rpo_horas: rpH,
        destinos: destinosList.map((d) => String(d || '').toLowerCase()),
      }
    }

    // 4. Carregar rotinas ativas da organização
    let rotinaRecords = []
    try {
      rotinaRecords = $app.findRecordsByFilter(
        'backup_rotinas',
        `organization = '${organizationId}' && status = 'ativo'`,
        '+nome',
        100,
        0,
      )
    } catch (_) {}

    const rotinasMap = {}
    for (let rI = 0; rI < rotinaRecords.length; rI++) {
      const rot = rotinaRecords[rI]
      const pId = rot.getString('plano')
      const plInfo = planosMap[pId] || null
      rotinasMap[rot.id] = {
        id: rot.id,
        nome: rot.getString('nome') || 'Rotina de Backup',
        plano_id: pId || null,
        plano_nome: plInfo ? plInfo.nome : null,
        rpo_horas: plInfo ? plInfo.rpo_horas : rpoHorasDefault,
        destinos: plInfo ? plInfo.destinos : [],
      }
    }

    // 5. Carregar fontes de backup ativas da organização
    let fonteRecords = []
    try {
      fonteRecords = $app.findRecordsByFilter(
        'backup_fontes',
        `organization = '${organizationId}' && ativo = true`,
        '+created',
        500,
        0,
      )
    } catch (_) {}

    const fontesPorAtivoId = {}
    const fontesPorNomeIdentificacao = {}

    for (let fI = 0; fI < fonteRecords.length; fI++) {
      const fn = fonteRecords[fI]
      const rotId = fn.getString('rotina')
      const rotInfo = rotinasMap[rotId] || null
      const aInvId = fn.getString('ativo_inventario')
      const caminhoIdent = fn.getString('caminho_identificacao') || ''
      const itemFonte = {
        id: fn.id,
        caminho_identificacao: caminhoIdent,
        ativo_inventario: aInvId,
        rotina_id: rotId || null,
        rotina_nome: rotInfo ? rotInfo.nome : null,
        plano_id: rotInfo ? rotInfo.plano_id : null,
        plano_nome: rotInfo ? rotInfo.plano_nome : null,
        rpo_horas: rotInfo ? rotInfo.rpo_horas : rpoHorasDefault,
        destinos: rotInfo ? rotInfo.destinos : [],
      }

      if (aInvId) {
        if (!fontesPorAtivoId[aInvId]) fontesPorAtivoId[aInvId] = []
        fontesPorAtivoId[aInvId].push(itemFonte)
      }

      if (caminhoIdent) {
        const normIdent = normalizarNomeSimples(caminhoIdent)
        if (!fontesPorNomeIdentificacao[normIdent]) fontesPorNomeIdentificacao[normIdent] = []
        fontesPorNomeIdentificacao[normIdent].push(itemFonte)
      }
    }

    // 6. Carregar ocorrências em aberto da organização
    const ocorrenciasAbertasPorAtivo = {}
    try {
      const ocs = $app.findRecordsByFilter(
        'backup_ocorrencias',
        `organization = '${organizationId}' && status != 'resolvida'`,
        '-created',
        200,
        0,
      )
      for (let oI = 0; oI < ocs.length; oI++) {
        const oc = ocs[oI]
        const desc = (oc.getString('descricao') || '') + ' ' + (oc.getString('titulo') || '')
        for (let aI = 0; aI < allAssets.length; aI++) {
          const asName = allAssets[aI].getString('name')
          if (asName && desc.indexOf(asName) !== -1) {
            ocorrenciasAbertasPorAtivo[allAssets[aI].id] =
              (ocorrenciasAbertasPorAtivo[allAssets[aI].id] || 0) + 1
          }
        }
      }
    } catch (_) {}

    // 7. Carregar execuções de backup ordenadas por -data_inicio da organização
    let execucoesRecords = []
    try {
      execucoesRecords = $app.findRecordsByFilter(
        'backup_execucoes',
        `organization = '${organizationId}'`,
        '-data_inicio',
        100,
        0,
      )
    } catch (errExecs) {
      console.error('[confronto] Erro ao carregar backup_execucoes:', errExecs)
    }

    const execucoesNormalizadas = []
    for (let eI = 0; eI < execucoesRecords.length; eI++) {
      const exRec = execucoesRecords[eI]
      const exId = exRec.id
      const exStatus = exRec.getString('status') || 'sucesso'
      const exDataInicio = exRec.getString('data_inicio') || exRec.getString('created')
      const exRotinaId = exRec.getString('rotina') || ''
      const exObs = exRec.getString('observacao') || ''
      const exRotinaInfo = rotinasMap[exRotinaId] || null
      const rotinaNome = exRotinaInfo ? exRotinaInfo.nome : ''

      const confEscopoRaw = exRec.get('confronto_escopo')
      const confEscopoObj = parseJsonSafely(confEscopoRaw)

      const modInferidaExec = inferirModalidadeExecucao(
        exObs,
        rotinaNome,
        exRec.getString('destino'),
      )
      if (isDebug) {
        console.log(
          '[confronto:debug:exec]',
          exId,
          'mod:',
          modInferidaExec,
          'obs:',
          exObs.slice(0, 50),
        )
      }

      const comprovados =
        confEscopoObj && Array.isArray(confEscopoObj.comprovado) ? confEscopoObj.comprovado : []
      const falhas =
        confEscopoObj && Array.isArray(confEscopoObj.falhas) ? confEscopoObj.falhas : []

      const detalhesVmsRaw = exRec.get('detalhes_vms')
      const detalhesVmsObj = parseJsonArraySafely(detalhesVmsRaw)

      execucoesNormalizadas.push({
        id: exId,
        status: exStatus,
        data_inicio: exDataInicio,
        rotina_id: exRotinaId,
        rotina_nome: rotinaNome,
        observacao: exObs,
        modalidade_inferida: modInferidaExec,
        comprovados: comprovados,
        falhas: falhas,
        detalhes_vms: detalhesVmsObj,
        raw_record: exRec,
      })
    }

    // 8. Montar o confronto para cada ativo ativo com exigências configuradas
    const now = new Date()
    const confrontoList = []
    let totalExigidos = 0
    let totalProtegidos = 0
    let totalParcial = 0
    let totalNaoProtegido = 0
    let totalNaoCadastrado = 0

    let alertaFalhaGlobal = null

    for (let aIdx = 0; aIdx < allAssets.length; aIdx++) {
      const asset = allAssets[aIdx]
      const assetId = asset.id
      const assetNome = asset.getString('name') || 'Ativo sem nome'
      const assetTipo = asset.getString('tipo') || 'servidor_virtualizado'
      const assetCriticidade = asset.getString('criticidade') || 'alta'

      const exigeLocal = asset.getBool('exige_backup_local')
      const exigeNuvem = asset.getBool('exige_backup_nuvem')
      const exigeReplicacao = asset.getBool('exige_backup_replicacao')

      let totalExigidasAtivo = 0
      if (exigeLocal) totalExigidasAtivo++
      if (exigeNuvem) totalExigidasAtivo++
      if (exigeReplicacao) totalExigidasAtivo++

      if (totalExigidasAtivo === 0) {
        continue
      }

      totalExigidos++

      const modalidadesExigidasList = []
      if (exigeLocal) modalidadesExigidasList.push('local')
      if (exigeNuvem) modalidadesExigidasList.push('nuvem')
      if (exigeReplicacao) modalidadesExigidasList.push('replicacao')

      const modalidadesResultado = {}
      let totalAtendidasAtivo = 0
      let temFalhaAtivo = false
      let detalheFalhaAtivo = null

      const fontesDoAtivo =
        fontesPorAtivoId[assetId] ||
        fontesPorNomeIdentificacao[normalizarNomeSimples(assetNome)] ||
        []

      for (let mIdx = 0; mIdx < modalidadesExigidasList.length; mIdx++) {
        const mod = modalidadesExigidasList[mIdx]
        const modUpper = mod.toUpperCase()

        let fonteCorrespondente = null
        for (let fK = 0; fK < fontesDoAtivo.length; fK++) {
          const ft = fontesDoAtivo[fK]
          if (ft.destinos && ft.destinos.indexOf(mod) !== -1) {
            fonteCorrespondente = ft
            break
          }
          const modInferidaRotina = inferirModalidadePorTexto(ft.rotina_nome || '')
          if (modInferidaRotina === mod) {
            fonteCorrespondente = ft
            break
          }
        }

        let rotinaCobrindoMod = null
        if (!fonteCorrespondente) {
          for (const rId in rotinasMap) {
            const rObj = rotinasMap[rId]
            if (rObj.destinos && rObj.destinos.indexOf(mod) !== -1) {
              rotinaCobrindoMod = rObj
              break
            }
            if (inferirModalidadePorTexto(rObj.nome || '') === mod) {
              rotinaCobrindoMod = rObj
              break
            }
          }
        }

        const rpoHorasConfigurado = fonteCorrespondente
          ? fonteCorrespondente.rpo_horas
          : rotinaCobrindoMod
            ? rotinaCobrindoMod.rpo_horas
            : rpoHorasDefault

        let statusDaMaisRecente = null
        let dataMaisRecente = null
        let execucaoMaisRecenteId = null
        let rotinaNomeMaisRecente = null
        let jobNomeMaisRecente = null
        let vmsFalhasMaisRecente = []
        let vmsSucessoMaisRecente = []
        let obsMaisRecente = null

        for (let eK = 0; eK < execucoesNormalizadas.length; eK++) {
          const execItem = execucoesNormalizadas[eK]
          const execAtendeModalidade = executionMatchesModalidade(execItem, mod)
          if (!execAtendeModalidade) {
            continue
          }

          const resultadoAtivo = verificarAtivoNaExecucao(execItem, assetId, assetNome, mod)
          if (resultadoAtivo.encontrado) {
            statusDaMaisRecente = resultadoAtivo.status
            dataMaisRecente = execItem.data_inicio
            execucaoMaisRecenteId = execItem.id
            rotinaNomeMaisRecente =
              execItem.rotina_nome || (fonteCorrespondente ? fonteCorrespondente.rotina_nome : null)
            jobNomeMaisRecente = resultadoAtivo.job_nome || execItem.rotina_nome
            vmsFalhasMaisRecente = resultadoAtivo.vms_falhas || []
            vmsSucessoMaisRecente = resultadoAtivo.vms_sucesso || []
            obsMaisRecente = execItem.observacao || resultadoAtivo.motivo || null
            break
          }
        }

        let statusModalidade = 'SEM_FONTE'
        let dentroDoRpo = false
        let horasDesdeUltima = null
        let ultimaComprovacaoData = null
        let ultimaExecucaoFalha = false

        if (statusDaMaisRecente === 'sucesso') {
          ultimaComprovacaoData = dataMaisRecente
          if (dataMaisRecente) {
            const dtComp = new Date(dataMaisRecente)
            horasDesdeUltima = Math.max(
              0,
              Math.round(((now.getTime() - dtComp.getTime()) / (1000 * 60 * 60)) * 10) / 10,
            )
            dentroDoRpo = horasDesdeUltima <= rpoHorasConfigurado
          } else {
            dentroDoRpo = true
            horasDesdeUltima = 0
          }

          if (dentroDoRpo) {
            statusModalidade = 'ATENDIDA'
            totalAtendidasAtivo++
          } else {
            statusModalidade = 'FORA_RPO'
          }
        } else if (statusDaMaisRecente === 'falha') {
          statusModalidade = 'FALHA_ULTIMA_EXECUCAO'
          ultimaExecucaoFalha = true
          temFalhaAtivo = true
          detalheFalhaAtivo = `Falha na execução de ${modUpper} em ${formatarDataSimplesSp(dataMaisRecente)}: ${rotinaNomeMaisRecente || 'Rotina de Backup'}`
          if (!alertaFalhaGlobal) {
            alertaFalhaGlobal = {
              tem_falha: true,
              job_nome: jobNomeMaisRecente,
              rotina_nome: rotinaNomeMaisRecente,
              data: dataMaisRecente,
              mensagem: detalheFalhaAtivo,
              ocorrencias_abertas: ocorrenciasAbertasPorAtivo[assetId] || 0,
            }
          }
        } else {
          if (fonteCorrespondente || rotinaCobrindoMod) {
            statusModalidade = 'NUNCA_COMPROVADA'
          } else {
            statusModalidade = 'SEM_FONTE'
          }
        }

        modalidadesResultado[mod] = {
          cadastrada: Boolean(fonteCorrespondente || rotinaCobrindoMod),
          ultima_comprovacao: ultimaComprovacaoData,
          dentro_do_rpo: dentroDoRpo,
          horas_desde_ultima: horasDesdeUltima,
          rpo_horas_configurado: rpoHorasConfigurado,
          fonte_id: fonteCorrespondente ? fonteCorrespondente.id : null,
          fonte_nome: fonteCorrespondente ? fonteCorrespondente.caminho_identificacao : null,
          rotina_id: fonteCorrespondente
            ? fonteCorrespondente.rotina_id
            : rotinaCobrindoMod
              ? rotinaCobrindoMod.id
              : null,
          rotina_nome:
            rotinaNomeMaisRecente ||
            (fonteCorrespondente
              ? fonteCorrespondente.rotina_nome
              : rotinaCobrindoMod
                ? rotinaCobrindoMod.nome
                : null),
          job_nome: jobNomeMaisRecente,
          plano_id: fonteCorrespondente
            ? fonteCorrespondente.plano_id
            : rotinaCobrindoMod
              ? rotinaCobrindoMod.plano_id
              : null,
          plano_nome: fonteCorrespondente
            ? fonteCorrespondente.plano_nome
            : rotinaCobrindoMod
              ? rotinaCobrindoMod.plano_nome
              : null,
          execucao_id: execucaoMaisRecenteId,
          status_modalidade: statusModalidade,
          ultima_execucao_falha: ultimaExecucaoFalha,
          ultima_execucao_data: dataMaisRecente,
          ultima_execucao_status: statusDaMaisRecente,
          ultima_execucao_obs: obsMaisRecente,
          vms_falhas: vmsFalhasMaisRecente,
          vms_sucesso: vmsSucessoMaisRecente,
          ocorrencias_abertas: ocorrenciasAbertasPorAtivo[assetId] || 0,
        }
      }

      let statusConsolidado = 'NAO_PROTEGIDO'
      if (totalAtendidasAtivo === totalExigidasAtivo) {
        statusConsolidado = 'PROTEGIDO'
        totalProtegidos++
      } else if (totalAtendidasAtivo > 0) {
        statusConsolidado = 'PARCIAL'
        totalParcial++
      } else {
        const allSemFonte = modalidadesExigidasList.every(
          (m) =>
            modalidadesResultado[m] && modalidadesResultado[m].status_modalidade === 'SEM_FONTE',
        )
        if (allSemFonte) {
          statusConsolidado = 'NAO_CADASTRADO'
          totalNaoCadastrado++
        } else {
          statusConsolidado = 'NAO_PROTEGIDO'
          totalNaoProtegido++
        }
      }

      confrontoList.push({
        id: assetId,
        nome: assetNome,
        tipo: assetTipo,
        criticidade: assetCriticidade,
        exigencias: {
          local: Boolean(exigeLocal),
          nuvem: Boolean(exigeNuvem),
          replicacao: Boolean(exigeReplicacao),
          total_exigidas: totalExigidasAtivo,
        },
        modalidades: modalidadesResultado,
        status_consolidado: statusConsolidado,
        total_atendidas: totalAtendidasAtivo,
        tem_falha_recente: temFalhaAtivo,
        falha_detalhe: detalheFalhaAtivo,
        ocorrencias_abertas_count: ocorrenciasAbertasPorAtivo[assetId] || 0,
      })
    }

    // Cálculo de proteção efetiva perante as rotinas:
    // Percentual por ativo = modalidades comprovadas / modalidades exigidas
    // Percentual geral efetivo = média ponderada / média sobre ativos com exigência
    let somaPercentuaisAtivos = 0
    let totalParcialmenteProtegidos = 0
    let totalCompletamenteProtegidos = 0

    for (let cI = 0; cI < confrontoList.length; cI++) {
      const item = confrontoList[cI]
      const totalExig = item.exigencias?.total_exigidas || 0
      const totalAtend = item.total_atendidas || 0
      const pctAtivo = totalExig > 0 ? Math.round((totalAtend / totalExig) * 100) : 0
      item.percentual_protecao = pctAtivo

      if (totalExig > 0) {
        somaPercentuaisAtivos += totalAtend / totalExig
        if (totalAtend === totalExig) {
          totalCompletamenteProtegidos++
        }
        if (totalAtend > 0) {
          totalParcialmenteProtegidos++
        }
      }
    }

    const percentualProtegidoCompleto =
      totalExigidos > 0 ? Math.round((totalProtegidos / totalExigidos) * 100) : 0

    const percentualProtegidoEfetivo =
      totalExigidos > 0 ? Math.round((somaPercentuaisAtivos / totalExigidos) * 100) : 0

    const payload = {
      ok: true,
      data_analise: now.toISOString(),
      organization: organizationId,
      totais: {
        total_ativos_inventario: allAssets.length,
        total_ativos_exigidos: totalExigidos,
        total_protegidos: totalProtegidos,
        total_protegidos_completo: totalCompletamenteProtegidos,
        total_parcial: totalParcial,
        total_parcialmente_protegidos: totalParcialmenteProtegidos,
        total_nao_protegido: totalNaoProtegido,
        total_nao_cadastrado: totalNaoCadastrado,
        percentual_protegido: percentualProtegidoEfetivo,
        percentual_protegido_efetivo: percentualProtegidoEfetivo,
        percentual_protegido_completo: percentualProtegidoCompleto,
      },
      confronto: confrontoList,
      alerta_falha_recente: alertaFalhaGlobal,
    }
    if (isDebug && confrontoList.length > 0) {
      const primeiro = confrontoList[0]
      console.log(
        '[confronto:debug:resumo]',
        primeiro.nome,
        'local:',
        primeiro.modalidades?.local?.status_modalidade,
        'nuvem:',
        primeiro.modalidades?.nuvem?.status_modalidade,
        'replicacao:',
        primeiro.modalidades?.replicacao?.status_modalidade,
        'consolidado:',
        primeiro.status_consolidado,
        'totais:',
        JSON.stringify(payload.totais),
      )
    }
    return e.json(200, payload)
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/backup/confronto',
  (e) => {
    // -------------------------------------------------------------
    // Funções auxiliares escopadas no callback
    // -------------------------------------------------------------
    function normalizarNomeSimples(txt) {
      if (!txt) return ''
      return String(txt)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
    }

    function parseJsonSafely(raw) {
      if (!raw) return null
      if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw
      }
      if (Array.isArray(raw)) {
        try {
          if (raw.length > 0 && typeof raw[0] === 'number') {
            let str = ''
            for (let i = 0; i < raw.length; i++) {
              str += String.fromCharCode(raw[i])
            }
            return JSON.parse(str)
          }
        } catch (_) {}
      }
      if (typeof raw === 'string') {
        const sTrim = raw.trim()
        if (sTrim.startsWith('{') && sTrim.endsWith('}')) {
          try {
            return JSON.parse(sTrim)
          } catch (_) {}
        }
      }
      return null
    }

    function parseJsonArraySafely(raw) {
      if (!raw) return []
      if (Array.isArray(raw)) {
        if (raw.length > 0 && typeof raw[0] === 'number') {
          try {
            let str = ''
            for (let i = 0; i < raw.length; i++) {
              str += String.fromCharCode(raw[i])
            }
            const parsed = JSON.parse(str)
            return Array.isArray(parsed) ? parsed : []
          } catch (_) {}
        }
        return raw
      }
      if (typeof raw === 'string') {
        const sTrim = raw.trim()
        if (sTrim.startsWith('[') && sTrim.endsWith(']')) {
          try {
            const parsed = JSON.parse(sTrim)
            return Array.isArray(parsed) ? parsed : []
          } catch (_) {}
        }
      }
      return []
    }

    function inferirModalidadePorTexto(texto) {
      const t = String(texto || '').trim()
      if (!t) return null

      // Avaliação: nuvem/replicação ANTES de local. Local somente se nenhum qualificador de nuvem/replicação.
      // Replicacao: palavra inteira, excluindo "backup & replication"
      const tSemSignature = t.replace(/backup\s*&\s*replication/gi, '')
      if (
        /\b(?:replicas?|replica[çc][aã]o|replica[çc][oõ]es|replication job)\b/i.test(tSemSignature)
      ) {
        return 'replicacao'
      }

      // Nuvem: palavra inteira
      if (/\b(?:nuvens?|cloud|backup_copy|copy job)\b/i.test(tSemSignature)) {
        return 'nuvem'
      }

      // Local: palavra inteira
      if (/\blocal\b/i.test(tSemSignature)) {
        return 'local'
      }

      return null
    }

    function inferirModalidadeExecucao(observacao, rotinaNome, destino) {
      const obs = String(observacao || '').toLowerCase()
      const rot = String(rotinaNome || '').trim()
      const dest = String(destino || '').trim()

      // 1) Prefixo do tipo do job na observação (PRIORIDADE MÁXIMA, definitivo)
      if (
        obs.indexOf('veeam backup_copy:') !== -1 ||
        obs.indexOf('backup copy job:') !== -1 ||
        obs.indexOf('copy job:') !== -1
      ) {
        return 'nuvem'
      }
      if (obs.indexOf('veeam replication:') !== -1 || obs.indexOf('replication job:') !== -1) {
        return 'replicacao'
      }
      if (obs.indexOf('veeam backup:') !== -1 || obs.indexOf('backup job:') !== -1) {
        return 'local'
      }

      // 2) ÚLTIMO recurso — sufixo ancorado no nome da rotina (regex com âncora de fim, não contenção)
      if (rot) {
        if (/-\s*replicas?$|\breplica[çc][aã]o$/i.test(rot)) {
          return 'replicacao'
        }
        if (/to cloud/i.test(rot) || /-\s*nuvens?$/i.test(rot)) {
          return 'nuvem'
        }
        if (/-\s*local$/i.test(rot)) {
          return 'local'
        }
      }

      // 3) Destino, somente se inequívoco
      if (dest) {
        const destLower = dest.toLowerCase()
        const temLocal = /\blocal\b/i.test(destLower)
        const temNuvem = /\b(?:nuvens?|cloud)\b/i.test(destLower)
        const temReplica = /\b(?:replicas?|replica[çc][aã]o|replication)\b/i.test(destLower)

        // Se tiver mais de um destino (ex.: "Local/Nuvem"), é ambíguo -> não inequívoco
        const count = (temLocal ? 1 : 0) + (temNuvem ? 1 : 0) + (temReplica ? 1 : 0)
        if (count === 1) {
          if (temReplica) return 'replicacao'
          if (temNuvem) return 'nuvem'
          if (temLocal) return 'local'
        }
      }

      // 4) null se nada — execução sem modalidade NUNCA comprova exigência nenhuma
      return null
    }

    function executionMatchesModalidade(execItem, targetModalidade) {
      const target = String(targetModalidade || '').toLowerCase()

      // 1. Se a execução possui modalidade inferida, ela DEVE ser igual à exigência avaliada.
      // Uma execução LOCAL NUNCA pode satisfazer NUVEM ou REPLICAÇÃO, e vice-versa.
      if (execItem.modalidade_inferida) {
        return execItem.modalidade_inferida === target
      }

      // 2. Se a execução não tiver modalidade inferida direta, verificar se comprovados ou falhas
      // trazem a modalidade explicitamente
      const comprovados = execItem.comprovados || []
      for (let i = 0; i < comprovados.length; i++) {
        const m = String(comprovados[i].modalidade || '').toLowerCase()
        if (m === target) return true
      }

      const falhas = execItem.falhas || []
      for (let j = 0; j < falhas.length; j++) {
        const mf = String(falhas[j].modalidade || '').toLowerCase()
        if (mf === target) return true
      }

      // 3. Fallback estrito no nome da rotina (somente se a rotina declarar explicitamente a modalidade)
      const rotMod = inferirModalidadePorTexto(execItem.rotina_nome)
      if (rotMod) {
        return rotMod === target
      }

      return false
    }

    function verificarAtivoNaExecucao(execItem, assetId, assetNome, targetModalidade) {
      const normAssetNome = normalizarNomeSimples(assetNome)
      const targetMod = String(targetModalidade || '').toLowerCase()

      // Regra de Ouro: a execução como um todo deve ser compatível com a modalidade
      if (execItem.modalidade_inferida && execItem.modalidade_inferida !== targetMod) {
        return { encontrado: false }
      }

      // 1. Verificar no array comprovado de confronto_escopo
      const comprovados = execItem.comprovados || []
      for (let i = 0; i < comprovados.length; i++) {
        const comp = comprovados[i]
        const compMod = String(comp.modalidade || '').toLowerCase()
        // Se o item tem modalidade explícita, DEVE bater com targetMod.
        // Se não tem modalidade explícita, a execução DEVE ter modalidade inferida igual a targetMod.
        const modalidadeOk = compMod
          ? compMod === targetMod
          : execItem.modalidade_inferida === targetMod

        if (modalidadeOk) {
          const matchId = comp.ativo_id && comp.ativo_id === assetId
          const matchNome =
            normalizarNomeSimples(comp.ativo_nome) === normAssetNome ||
            normalizarNomeSimples(comp.item_comprovante) === normAssetNome ||
            normalizarNomeSimples(comp.fonte_casada) === normAssetNome

          if (matchId || matchNome) {
            return {
              encontrado: true,
              status: 'sucesso',
              job_nome: comp.job_nome || comp.rotina_nome || execItem.rotina_nome,
              vms_falhas: [],
              vms_sucesso: [assetNome],
            }
          }
        }
      }

      // 2. Verificar no array falhas de confronto_escopo
      const falhas = execItem.falhas || []
      for (let j = 0; j < falhas.length; j++) {
        const falha = falhas[j]
        const falhaMod = String(falha.modalidade || '').toLowerCase()
        const modalidadeOk = falhaMod
          ? falhaMod === targetMod
          : execItem.modalidade_inferida === targetMod

        if (modalidadeOk) {
          const matchId = falha.ativo_id && falha.ativo_id === assetId
          const matchNome =
            normalizarNomeSimples(falha.ativo_nome) === normAssetNome ||
            normalizarNomeSimples(falha.item_comprovante) === normAssetNome

          if (matchId || matchNome) {
            return {
              encontrado: true,
              status: 'falha',
              job_nome: falha.job_nome || falha.rotina_nome || execItem.rotina_nome,
              motivo: falha.motivo,
              vms_falhas: [assetNome],
              vms_sucesso: [],
            }
          }
        }
      }

      // 3. Fallback: verificar em detalhes_vms (apenas se a execução demonstrar a mesma modalidade da exigência)
      const modExec =
        execItem.modalidade_inferida || inferirModalidadePorTexto(execItem.rotina_nome)
      if (modExec === targetMod) {
        const vms = execItem.detalhes_vms || []
        if (vms.length > 0) {
          const vmsFalhasList = []
          const vmsSucessoList = []
          let vmMatch = null

          for (let vI = 0; vI < vms.length; vI++) {
            const vm = vms[vI]
            const vmNome = vm.nome || ''
            const normVm = normalizarNomeSimples(vmNome)
            const st = String(vm.status || '').toLowerCase()
            const isFailed = st === 'failed' || st === 'error' || st === 'erro' || st === 'falha'
            if (isFailed) {
              vmsFalhasList.push(vmNome)
            } else {
              vmsSucessoList.push(vmNome)
            }

            if (vm.ativo_id === assetId || normVm === normAssetNome) {
              vmMatch = vm
            }
          }

          if (vmMatch) {
            const stMatch = String(vmMatch.status || '').toLowerCase()
            const matchFailed =
              stMatch === 'failed' ||
              stMatch === 'error' ||
              stMatch === 'erro' ||
              stMatch === 'falha'
            return {
              encontrado: true,
              status: matchFailed ? 'falha' : 'sucesso',
              job_nome: execItem.rotina_nome,
              vms_falhas: vmsFalhasList,
              vms_sucesso: vmsSucessoList,
            }
          }
        }
      }

      return { encontrado: false }
    }

    function formatarDataSimplesSp(isoStr) {
      if (!isoStr) return ''
      try {
        const d = new Date(isoStr)
        return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      } catch (_) {
        return String(isoStr)
      }
    }

    // -------------------------------------------------------------
    // Execução da requisição POST
    // -------------------------------------------------------------
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const queryParams = e.requestInfo().query || {}
    const bodyParams = e.requestInfo().body || {}
    let organizationId =
      queryParams.organization ||
      bodyParams.organization ||
      bodyParams.organizationId ||
      auth.getString('organization')

    if (!organizationId) {
      try {
        const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
        if (firstOrg.length > 0) {
          organizationId = firstOrg[0].id
        }
      } catch (_) {}
    }

    if (!organizationId) {
      return e.badRequestError('Nenhuma organização associada.')
    }

    const userRole = auth.getString('system_role') || 'usuario'
    if (userRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    const isDebug = false

    let allAssets = []
    try {
      allAssets = $app.findRecordsByFilter(
        'inventory_assets',
        `organization = '${organizationId}' && status = 'ativo'`,
        '+name',
        500,
        0,
      )
    } catch (errAssets) {
      console.error('[confronto] Erro ao carregar inventory_assets:', errAssets)
    }

    let escopoRecords = []
    try {
      escopoRecords = $app.findRecordsByFilter(
        'backup_escopo',
        `organization = '${organizationId}' && status = 'ativo'`,
        '-created',
        50,
        0,
      )
    } catch (_) {}

    let planoRecords = []
    try {
      planoRecords = $app.findRecordsByFilter(
        'backup_planos',
        `organization = '${organizationId}' && status = 'ativo'`,
        '-created',
        50,
        0,
      )
    } catch (_) {}

    let rpoHorasDefault = 24
    const planosMap = {}
    for (let pI = 0; pI < planoRecords.length; pI++) {
      const pl = planoRecords[pI]
      const rpH = pl.getInt('rpo_horas') || 24
      if (rpH > 0 && rpoHorasDefault === 24) {
        rpoHorasDefault = rpH
      }
      let destinosList = []
      try {
        const destRaw = pl.get('destino')
        destinosList = parseJsonArraySafely(destRaw)
      } catch (_) {}

      planosMap[pl.id] = {
        id: pl.id,
        nome: pl.getString('nome') || 'Plano de Continuidade',
        rpo_horas: rpH,
        destinos: destinosList.map((d) => String(d || '').toLowerCase()),
      }
    }

    let rotinaRecords = []
    try {
      rotinaRecords = $app.findRecordsByFilter(
        'backup_rotinas',
        `organization = '${organizationId}' && status = 'ativo'`,
        '+nome',
        100,
        0,
      )
    } catch (_) {}

    const rotinasMap = {}
    for (let rI = 0; rI < rotinaRecords.length; rI++) {
      const rot = rotinaRecords[rI]
      const pId = rot.getString('plano')
      const plInfo = planosMap[pId] || null
      rotinasMap[rot.id] = {
        id: rot.id,
        nome: rot.getString('nome') || 'Rotina de Backup',
        plano_id: pId || null,
        plano_nome: plInfo ? plInfo.nome : null,
        rpo_horas: plInfo ? plInfo.rpo_horas : rpoHorasDefault,
        destinos: plInfo ? plInfo.destinos : [],
      }
    }

    let fonteRecords = []
    try {
      fonteRecords = $app.findRecordsByFilter(
        'backup_fontes',
        `organization = '${organizationId}' && ativo = true`,
        '+created',
        500,
        0,
      )
    } catch (_) {}

    const fontesPorAtivoId = {}
    const fontesPorNomeIdentificacao = {}

    for (let fI = 0; fI < fonteRecords.length; fI++) {
      const fn = fonteRecords[fI]
      const rotId = fn.getString('rotina')
      const rotInfo = rotinasMap[rotId] || null
      const aInvId = fn.getString('ativo_inventario')
      const caminhoIdent = fn.getString('caminho_identificacao') || ''
      const itemFonte = {
        id: fn.id,
        caminho_identificacao: caminhoIdent,
        ativo_inventario: aInvId,
        rotina_id: rotId || null,
        rotina_nome: rotInfo ? rotInfo.nome : null,
        plano_id: rotInfo ? rotInfo.plano_id : null,
        plano_nome: rotInfo ? rotInfo.plano_nome : null,
        rpo_horas: rotInfo ? rotInfo.rpo_horas : rpoHorasDefault,
        destinos: rotInfo ? rotInfo.destinos : [],
      }

      if (aInvId) {
        if (!fontesPorAtivoId[aInvId]) fontesPorAtivoId[aInvId] = []
        fontesPorAtivoId[aInvId].push(itemFonte)
      }

      if (caminhoIdent) {
        const normIdent = normalizarNomeSimples(caminhoIdent)
        if (!fontesPorNomeIdentificacao[normIdent]) fontesPorNomeIdentificacao[normIdent] = []
        fontesPorNomeIdentificacao[normIdent].push(itemFonte)
      }
    }

    const ocorrenciasAbertasPorAtivo = {}
    try {
      const ocs = $app.findRecordsByFilter(
        'backup_ocorrencias',
        `organization = '${organizationId}' && status != 'resolvida'`,
        '-created',
        200,
        0,
      )
      for (let oI = 0; oI < ocs.length; oI++) {
        const oc = ocs[oI]
        const desc = (oc.getString('descricao') || '') + ' ' + (oc.getString('titulo') || '')
        for (let aI = 0; aI < allAssets.length; aI++) {
          const asName = allAssets[aI].getString('name')
          if (asName && desc.indexOf(asName) !== -1) {
            ocorrenciasAbertasPorAtivo[allAssets[aI].id] =
              (ocorrenciasAbertasPorAtivo[allAssets[aI].id] || 0) + 1
          }
        }
      }
    } catch (_) {}

    let execucoesRecords = []
    try {
      execucoesRecords = $app.findRecordsByFilter(
        'backup_execucoes',
        `organization = '${organizationId}'`,
        '-data_inicio',
        100,
        0,
      )
    } catch (errExecs) {
      console.error('[confronto] Erro ao carregar backup_execucoes:', errExecs)
    }

    const execucoesNormalizadas = []
    for (let eI = 0; eI < execucoesRecords.length; eI++) {
      const exRec = execucoesRecords[eI]
      const exId = exRec.id
      const exStatus = exRec.getString('status') || 'sucesso'
      const exDataInicio = exRec.getString('data_inicio') || exRec.getString('created')
      const exRotinaId = exRec.getString('rotina') || ''
      const exObs = exRec.getString('observacao') || ''
      const exRotinaInfo = rotinasMap[exRotinaId] || null
      const rotinaNome = exRotinaInfo ? exRotinaInfo.nome : ''

      const confEscopoRaw = exRec.get('confronto_escopo')
      const confEscopoObj = parseJsonSafely(confEscopoRaw)

      const modInferidaExec = inferirModalidadeExecucao(
        exObs,
        rotinaNome,
        exRec.getString('destino'),
      )
      if (isDebug) {
        console.log(
          '[confronto:debug:exec]',
          exId,
          'mod:',
          modInferidaExec,
          'obs:',
          exObs.slice(0, 50),
        )
      }

      const comprovados =
        confEscopoObj && Array.isArray(confEscopoObj.comprovado) ? confEscopoObj.comprovado : []
      const falhas =
        confEscopoObj && Array.isArray(confEscopoObj.falhas) ? confEscopoObj.falhas : []

      const detalhesVmsRaw = exRec.get('detalhes_vms')
      const detalhesVmsObj = parseJsonArraySafely(detalhesVmsRaw)

      execucoesNormalizadas.push({
        id: exId,
        status: exStatus,
        data_inicio: exDataInicio,
        rotina_id: exRotinaId,
        rotina_nome: rotinaNome,
        observacao: exObs,
        modalidade_inferida: modInferidaExec,
        comprovados: comprovados,
        falhas: falhas,
        detalhes_vms: detalhesVmsObj,
        raw_record: exRec,
      })
    }

    const now = new Date()
    const confrontoList = []
    let totalExigidos = 0
    let totalProtegidos = 0
    let totalParcial = 0
    let totalNaoProtegido = 0
    let totalNaoCadastrado = 0

    let alertaFalhaGlobal = null

    for (let aIdx = 0; aIdx < allAssets.length; aIdx++) {
      const asset = allAssets[aIdx]
      const assetId = asset.id
      const assetNome = asset.getString('name') || 'Ativo sem nome'
      const assetTipo = asset.getString('tipo') || 'servidor_virtualizado'
      const assetCriticidade = asset.getString('criticidade') || 'alta'

      const exigeLocal = asset.getBool('exige_backup_local')
      const exigeNuvem = asset.getBool('exige_backup_nuvem')
      const exigeReplicacao = asset.getBool('exige_backup_replicacao')

      let totalExigidasAtivo = 0
      if (exigeLocal) totalExigidasAtivo++
      if (exigeNuvem) totalExigidasAtivo++
      if (exigeReplicacao) totalExigidasAtivo++

      if (totalExigidasAtivo === 0) {
        continue
      }

      totalExigidos++

      const modalidadesExigidasList = []
      if (exigeLocal) modalidadesExigidasList.push('local')
      if (exigeNuvem) modalidadesExigidasList.push('nuvem')
      if (exigeReplicacao) modalidadesExigidasList.push('replicacao')

      const modalidadesResultado = {}
      let totalAtendidasAtivo = 0
      let temFalhaAtivo = false
      let detalheFalhaAtivo = null

      const fontesDoAtivo =
        fontesPorAtivoId[assetId] ||
        fontesPorNomeIdentificacao[normalizarNomeSimples(assetNome)] ||
        []

      for (let mIdx = 0; mIdx < modalidadesExigidasList.length; mIdx++) {
        const mod = modalidadesExigidasList[mIdx]
        const modUpper = mod.toUpperCase()

        let fonteCorrespondente = null
        for (let fK = 0; fK < fontesDoAtivo.length; fK++) {
          const ft = fontesDoAtivo[fK]
          if (ft.destinos && ft.destinos.indexOf(mod) !== -1) {
            fonteCorrespondente = ft
            break
          }
          const modInferidaRotina = inferirModalidadePorTexto(ft.rotina_nome || '')
          if (modInferidaRotina === mod) {
            fonteCorrespondente = ft
            break
          }
        }

        let rotinaCobrindoMod = null
        if (!fonteCorrespondente) {
          for (const rId in rotinasMap) {
            const rObj = rotinasMap[rId]
            if (rObj.destinos && rObj.destinos.indexOf(mod) !== -1) {
              rotinaCobrindoMod = rObj
              break
            }
            if (inferirModalidadePorTexto(rObj.nome || '') === mod) {
              rotinaCobrindoMod = rObj
              break
            }
          }
        }

        const rpoHorasConfigurado = fonteCorrespondente
          ? fonteCorrespondente.rpo_horas
          : rotinaCobrindoMod
            ? rotinaCobrindoMod.rpo_horas
            : rpoHorasDefault

        let statusDaMaisRecente = null
        let dataMaisRecente = null
        let execucaoMaisRecenteId = null
        let rotinaNomeMaisRecente = null
        let jobNomeMaisRecente = null
        let vmsFalhasMaisRecente = []
        let vmsSucessoMaisRecente = []
        let obsMaisRecente = null

        for (let eK = 0; eK < execucoesNormalizadas.length; eK++) {
          const execItem = execucoesNormalizadas[eK]
          const execAtendeModalidade = executionMatchesModalidade(execItem, mod)
          if (!execAtendeModalidade) {
            continue
          }

          const resultadoAtivo = verificarAtivoNaExecucao(execItem, assetId, assetNome, mod)
          if (resultadoAtivo.encontrado) {
            statusDaMaisRecente = resultadoAtivo.status
            dataMaisRecente = execItem.data_inicio
            execucaoMaisRecenteId = execItem.id
            rotinaNomeMaisRecente =
              execItem.rotina_nome || (fonteCorrespondente ? fonteCorrespondente.rotina_nome : null)
            jobNomeMaisRecente = resultadoAtivo.job_nome || execItem.rotina_nome
            vmsFalhasMaisRecente = resultadoAtivo.vms_falhas || []
            vmsSucessoMaisRecente = resultadoAtivo.vms_sucesso || []
            obsMaisRecente = execItem.observacao || resultadoAtivo.motivo || null
            break
          }
        }

        let statusModalidade = 'SEM_FONTE'
        let dentroDoRpo = false
        let horasDesdeUltima = null
        let ultimaComprovacaoData = null
        let ultimaExecucaoFalha = false

        if (statusDaMaisRecente === 'sucesso') {
          ultimaComprovacaoData = dataMaisRecente
          if (dataMaisRecente) {
            const dtComp = new Date(dataMaisRecente)
            horasDesdeUltima = Math.max(
              0,
              Math.round(((now.getTime() - dtComp.getTime()) / (1000 * 60 * 60)) * 10) / 10,
            )
            dentroDoRpo = horasDesdeUltima <= rpoHorasConfigurado
          } else {
            dentroDoRpo = true
            horasDesdeUltima = 0
          }

          if (dentroDoRpo) {
            statusModalidade = 'ATENDIDA'
            totalAtendidasAtivo++
          } else {
            statusModalidade = 'FORA_RPO'
          }
        } else if (statusDaMaisRecente === 'falha') {
          statusModalidade = 'FALHA_ULTIMA_EXECUCAO'
          ultimaExecucaoFalha = true
          temFalhaAtivo = true
          detalheFalhaAtivo = `Falha na execução de ${modUpper} em ${formatarDataSimplesSp(dataMaisRecente)}: ${rotinaNomeMaisRecente || 'Rotina de Backup'}`
          if (!alertaFalhaGlobal) {
            alertaFalhaGlobal = {
              tem_falha: true,
              job_nome: jobNomeMaisRecente,
              rotina_nome: rotinaNomeMaisRecente,
              data: dataMaisRecente,
              mensagem: detalheFalhaAtivo,
              ocorrencias_abertas: ocorrenciasAbertasPorAtivo[assetId] || 0,
            }
          }
        } else {
          if (fonteCorrespondente || rotinaCobrindoMod) {
            statusModalidade = 'NUNCA_COMPROVADA'
          } else {
            statusModalidade = 'SEM_FONTE'
          }
        }

        modalidadesResultado[mod] = {
          cadastrada: Boolean(fonteCorrespondente || rotinaCobrindoMod),
          ultima_comprovacao: ultimaComprovacaoData,
          dentro_do_rpo: dentroDoRpo,
          horas_desde_ultima: horasDesdeUltima,
          rpo_horas_configurado: rpoHorasConfigurado,
          fonte_id: fonteCorrespondente ? fonteCorrespondente.id : null,
          fonte_nome: fonteCorrespondente ? fonteCorrespondente.caminho_identificacao : null,
          rotina_id: fonteCorrespondente
            ? fonteCorrespondente.rotina_id
            : rotinaCobrindoMod
              ? rotinaCobrindoMod.id
              : null,
          rotina_nome:
            rotinaNomeMaisRecente ||
            (fonteCorrespondente
              ? fonteCorrespondente.rotina_nome
              : rotinaCobrindoMod
                ? rotinaCobrindoMod.nome
                : null),
          job_nome: jobNomeMaisRecente,
          plano_id: fonteCorrespondente
            ? fonteCorrespondente.plano_id
            : rotinaCobrindoMod
              ? rotinaCobrindoMod.plano_id
              : null,
          plano_nome: fonteCorrespondente
            ? fonteCorrespondente.plano_nome
            : rotinaCobrindoMod
              ? rotinaCobrindoMod.plano_nome
              : null,
          execucao_id: execucaoMaisRecenteId,
          status_modalidade: statusModalidade,
          ultima_execucao_falha: ultimaExecucaoFalha,
          ultima_execucao_data: dataMaisRecente,
          ultima_execucao_status: statusDaMaisRecente,
          ultima_execucao_obs: obsMaisRecente,
          vms_falhas: vmsFalhasMaisRecente,
          vms_sucesso: vmsSucessoMaisRecente,
          ocorrencias_abertas: ocorrenciasAbertasPorAtivo[assetId] || 0,
        }
      }

      let statusConsolidado = 'NAO_PROTEGIDO'
      if (totalAtendidasAtivo === totalExigidasAtivo) {
        statusConsolidado = 'PROTEGIDO'
        totalProtegidos++
      } else if (totalAtendidasAtivo > 0) {
        statusConsolidado = 'PARCIAL'
        totalParcial++
      } else {
        const allSemFonte = modalidadesExigidasList.every(
          (m) =>
            modalidadesResultado[m] && modalidadesResultado[m].status_modalidade === 'SEM_FONTE',
        )
        if (allSemFonte) {
          statusConsolidado = 'NAO_CADASTRADO'
          totalNaoCadastrado++
        } else {
          statusConsolidado = 'NAO_PROTEGIDO'
          totalNaoProtegido++
        }
      }

      confrontoList.push({
        id: assetId,
        nome: assetNome,
        tipo: assetTipo,
        criticidade: assetCriticidade,
        exigencias: {
          local: Boolean(exigeLocal),
          nuvem: Boolean(exigeNuvem),
          replicacao: Boolean(exigeReplicacao),
          total_exigidas: totalExigidasAtivo,
        },
        modalidades: modalidadesResultado,
        status_consolidado: statusConsolidado,
        total_atendidas: totalAtendidasAtivo,
        tem_falha_recente: temFalhaAtivo,
        falha_detalhe: detalheFalhaAtivo,
        ocorrencias_abertas_count: ocorrenciasAbertasPorAtivo[assetId] || 0,
      })
    }

    // Cálculo de proteção efetiva perante as rotinas:
    // Percentual por ativo = modalidades comprovadas / modalidades exigidas
    // Percentual geral efetivo = média ponderada / média sobre ativos com exigência
    let somaPercentuaisAtivos = 0
    let totalParcialmenteProtegidos = 0
    let totalCompletamenteProtegidos = 0

    for (let cI = 0; cI < confrontoList.length; cI++) {
      const item = confrontoList[cI]
      const totalExig = item.exigencias?.total_exigidas || 0
      const totalAtend = item.total_atendidas || 0
      const pctAtivo = totalExig > 0 ? Math.round((totalAtend / totalExig) * 100) : 0
      item.percentual_protecao = pctAtivo

      if (totalExig > 0) {
        somaPercentuaisAtivos += totalAtend / totalExig
        if (totalAtend === totalExig) {
          totalCompletamenteProtegidos++
        }
        if (totalAtend > 0) {
          totalParcialmenteProtegidos++
        }
      }
    }

    const percentualProtegidoCompleto =
      totalExigidos > 0 ? Math.round((totalProtegidos / totalExigidos) * 100) : 0

    const percentualProtegidoEfetivo =
      totalExigidos > 0 ? Math.round((somaPercentuaisAtivos / totalExigidos) * 100) : 0

    const payload = {
      ok: true,
      data_analise: now.toISOString(),
      organization: organizationId,
      totais: {
        total_ativos_inventario: allAssets.length,
        total_ativos_exigidos: totalExigidos,
        total_protegidos: totalProtegidos,
        total_protegidos_completo: totalCompletamenteProtegidos,
        total_parcial: totalParcial,
        total_parcialmente_protegidos: totalParcialmenteProtegidos,
        total_nao_protegido: totalNaoProtegido,
        total_nao_cadastrado: totalNaoCadastrado,
        percentual_protegido: percentualProtegidoEfetivo,
        percentual_protegido_efetivo: percentualProtegidoEfetivo,
        percentual_protegido_completo: percentualProtegidoCompleto,
      },
      confronto: confrontoList,
      alerta_falha_recente: alertaFalhaGlobal,
    }
    if (isDebug && confrontoList.length > 0) {
      const primeiro = confrontoList[0]
      console.log(
        '[confronto:debug:resumo]',
        primeiro.nome,
        'local:',
        primeiro.modalidades?.local?.status_modalidade,
        'nuvem:',
        primeiro.modalidades?.nuvem?.status_modalidade,
        'replicacao:',
        primeiro.modalidades?.replicacao?.status_modalidade,
        'consolidado:',
        primeiro.status_consolidado,
        'totais:',
        JSON.stringify(payload.totais),
      )
    }

    return e.json(200, payload)
  },
  $apis.requireAuth(),
)
