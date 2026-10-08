/**
 * Motor de Confronto de Proteção por Ativo (Estilo Veeam ONE)
 * Rota: GET /backend/v1/backup/confronto
 *
 * Princípio fundamental:
 * Proteção NÃO é mero cadastro — proteção é prova recente.
 * Uma máquina cadastrada em rotina cuja última evidência ocorreu além do RPO
 * (ou que nunca teve evidência) está DESPROTEGIDA / FORA DO RPO.
 *
 * Regra de Ouro (Fonte única de verdade):
 * Cada execução comprova SOMENTE a modalidade que a evidência demonstra
 * ("backup copy job:" ou "copy job:" -> 'nuvem'; "replication job:" -> 'replicacao';
 * "backup job:" -> 'local'; ambíguo -> null). O plano NÃO transfere modalidades.
 * job_name e caminho de pasta Veeam NUNCA determinam modalidade.
 *
 * Regras inegociáveis:
 * - Multi-tenant: isolamento estrito por organization;
 * - RBAC: apenas usuários autenticados com acesso à própria organização;
 * - Zero dados fictícios / mocks — ausência de evidência = "nunca comprovada".
 * - PROTEÇÃO CONTRA SOBRESCRITA DESTRUTIVA: reconciliarExecucoesComprovadas JAMAIS grava
 *   comprovado=[] por cima de dados válidos já persistidos na execução. Se houver avaliação
 *   com comprovado não-vazio, clona integralmente (JSON.parse(JSON.stringify)). Se não houver,
 *   preserva o comprovado existente. Se novoComprovado estiver vazio, NUNCA sobrescreve.
 */

routerAdd(
  'GET',
  '/backend/v1/backup/confronto',
  (e) => {
    const normalizarJson = (valor) => {
      if (valor === null || valor === undefined) return null

      // Helper para converter array de bytes (números) em string UTF-8 por chunks seguros
      const bytesParaString = (bytesArr) => {
        try {
          const CHUNK_SIZE = 8192
          let res = ''
          for (let i = 0; i < bytesArr.length; i += CHUNK_SIZE) {
            const pedaco = bytesArr.slice(i, i + CHUNK_SIZE)
            res += String.fromCharCode.apply(null, pedaco)
          }
          return res
        } catch (_) {
          return null
        }
      }

      // Caso A: Array de números/bytes (ex.: [123, 34, ...]) vindo do Goja/PocketBase para campos JSON
      if (Array.isArray(valor)) {
        if (valor.length > 0 && typeof valor[0] === 'number') {
          const strDecodificada = bytesParaString(valor)
          if (strDecodificada) {
            const sTrim = strDecodificada.trim()
            if (
              (sTrim.startsWith('{') && sTrim.endsWith('}')) ||
              (sTrim.startsWith('[') && sTrim.endsWith(']'))
            ) {
              try {
                return JSON.parse(sTrim)
              } catch (eParseByteArr) {
                console.error(
                  '[normalizarJson] Falha ao fazer JSON.parse de array de bytes:',
                  'tam=' + valor.length,
                  sTrim.substring(0, 80),
                  eParseByteArr?.message || eParseByteArr,
                )
                return null
              }
            }
          }
        }
        // Array comum já deserializado (ex.: lista de objetos) -> clonagem profunda
        try {
          return JSON.parse(JSON.stringify(valor))
        } catch (_) {
          return valor
        }
      }

      // Caso B: String JSON normal
      if (typeof valor === 'string') {
        const s = valor.trim()
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
          try {
            return JSON.parse(s)
          } catch (eStr) {
            console.error(
              '[normalizarJson] Falha ao fazer JSON.parse de string JSON:',
              'tipo=' + typeof valor,
              s.substring(0, 80),
              eStr?.message || eStr,
            )
            return null
          }
        }
        return valor
      }

      // Caso C: Objeto Go / JSONRaw com método .string() antes de desistir
      if (typeof valor === 'object') {
        if (typeof valor.string === 'function') {
          try {
            const rawStr = valor.string()
            if (typeof rawStr === 'string') {
              const sTrim = rawStr.trim()
              if (
                (sTrim.startsWith('{') && sTrim.endsWith('}')) ||
                (sTrim.startsWith('[') && sTrim.endsWith(']'))
              ) {
                return JSON.parse(sTrim)
              }
            }
          } catch (eGoRaw) {
            console.error(
              '[normalizarJson] Falha ao ler objeto Go via .string():',
              eGoRaw?.message || eGoRaw,
            )
          }
        }
        // Objeto JS normal -> clonagem profunda
        try {
          return JSON.parse(JSON.stringify(valor))
        } catch (eObj) {
          console.error(
            '[normalizarJson] Falha ao clonar objeto normal:',
            'tipo=' + typeof valor,
            String(valor).substring(0, 80),
            eObj?.message || eObj,
          )
          return null
        }
      }

      // Qualquer outro tipo inesperado que falhar
      console.error(
        '[normalizarJson] Tipo não reconhecido para campo JSON:',
        'tipo=' + typeof valor,
        String(valor).substring(0, 80),
      )
      return null
    }
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

    // Helper: normalizar string para matching de caminhos/aliases/nomes
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

    // Helper: normalizar string compacta (sem pontuação nem espaços) para match tolerante
    const normalizarCompacto = (str) => {
      if (!str) return ''
      return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
    }

    // Helper: extrair array de detalhes_vms de uma execução, com fallback em backup_processamentos ou backup_avaliacoes
    const obterDetalhesVmsExecucao = (exRec) => {
      if (!exRec) return []
      let dVms = normalizarJson(exRec.get('detalhes_vms'))
      if (Array.isArray(dVms) && dVms.length > 0) {
        return dVms
      }
      // Fallback 1: buscar em backup_processamentos se a execução não tiver persistido
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
            const resProc = normalizarJson(procs[0].get('resultado'))
            if (resProc && Array.isArray(resProc.vms) && resProc.vms.length > 0) {
              return resProc.vms
            }
          }
        } catch (_) {}
      }
      // Fallback 2: buscar em backup_avaliacoes correspondente (itens_avaliados ou confronto_escopo.comprovado)
      try {
        const avals = $app.findRecordsByFilter(
          'backup_avaliacoes',
          `execucao = '${exRec.id}'`,
          '-created',
          1,
          0,
        )
        if (avals.length > 0) {
          const cEsc = normalizarJson(avals[0].get('confronto_escopo'))
          if (cEsc && Array.isArray(cEsc.comprovado) && cEsc.comprovado.length > 0) {
            return cEsc.comprovado.map((comp) => ({
              nome: comp.ativo_nome || comp.item_comprovante,
              status: comp.status || 'success',
              ativo_id: comp.ativo_id,
              status_escopo: 'coberto',
              fora_escopo: false,
            }))
          }
        }
      } catch (_) {}
      return []
    }

    // Helper: extrair nome amigável do Job para exibição
    const extrairNomeJob = (execRec, rotinaRec) => {
      if (!execRec) return ''
      let jobNome = ''

      const obs = execRec.getString('observacao') || ''
      if (obs) {
        const obsMatch = obs.match(/"([^"]+)"/)
        if (obsMatch && obsMatch[1]) {
          jobNome = obsMatch[1].trim()
        }
      }

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
            const itensAv = normalizarJson(avals[0].get('itens_avaliados'))
            if (itensAv && typeof itensAv === 'object' && itensAv.job_name) {
              jobNome = String(itensAv.job_name).trim()
            }
          }
        } catch (_) {}
      }

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
              const resProc = normalizarJson(procs[0].get('resultado'))
              if (resProc && typeof resProc === 'object' && resProc.job_name) {
                jobNome = String(resProc.job_name).trim()
              }
            }
          } catch (_) {}
        }
      }

      if (!jobNome && rotinaRec) {
        jobNome = rotinaRec.getString('nome') || ''
      }

      return jobNome
    }

    // Helper: inferir modalidade comprovada pelo conteúdo REAL em 4 camadas (FIX 4):
    // a) Assinatura da ferramenta / adaptador no comprovante/avaliação
    // b) Modalidade pelo TIPO DO JOB no CORPO: "Backup job:" -> 'local'; "Backup Copy job:" -> 'nuvem'; "Replication job:" -> 'replicacao'
    //    ou Adaptador ACRONIS_PDF -> 'nuvem'
    //    NUNCA usar o caminho da pasta do job (ex. "to Cloud" em "Backup VMs to Cloud\...") e NUNCA depender do assunto.
    // c) Fallback pelo nome da rotina vinculada (- LOCAL, - NUVEM, - REPLICA)
    // d) Ambíguo -> null (fail-closed mantido)
    const inferirModalidadeComprovante = (execRec, rotinaRec) => {
      if (!execRec) return null

      let assuntoEvidencia = ''
      let corpoEvidencia = ''
      let adaptadorCodigo = ''
      let jobNameLaudo = ''

      let evidenciaId = ''
      try {
        evidenciaId = execRec.getString('evidencia') || ''
      } catch (_) {}

      try {
        const avals = $app.findRecordsByFilter(
          'backup_avaliacoes',
          `execucao = '${execRec.id}'`,
          '-created',
          1,
          0,
        )
        if (avals.length > 0) {
          const itensAv = normalizarJson(avals[0].get('itens_avaliados'))
          if (itensAv && typeof itensAv === 'object') {
            jobNameLaudo = String(itensAv.job_name || '')
            adaptadorCodigo = String(itensAv.adaptador || '')
          }
          const laudoObj = normalizarJson(avals[0].get('laudo_tecnico'))
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

      if (!evidenciaId || !adaptadorCodigo) {
        try {
          const procs = $app.findRecordsByFilter(
            'backup_processamentos',
            `execucao = '${execRec.id}'`,
            '-created',
            1,
            0,
          )
          if (procs.length > 0) {
            if (!evidenciaId) evidenciaId = procs[0].getString('evidencia')
            if (!adaptadorCodigo) {
              adaptadorCodigo = procs[0].getString('adaptador_usado') || ''
            }
            const resProc = normalizarJson(procs[0].get('resultado'))
            if (resProc && typeof resProc === 'object' && resProc.job_name) {
              if (!jobNameLaudo) jobNameLaudo = String(resProc.job_name || '')
            }
          }
        } catch (_) {}
      }

      if (evidenciaId) {
        try {
          const evRec = $app.findRecordById('backup_evidencias', evidenciaId)
          if (evRec) {
            if (!assuntoEvidencia) assuntoEvidencia = evRec.getString('assunto') || ''
            corpoEvidencia = evRec.getString('conteudo') || ''
          }
        } catch (_) {}
      }

      if ((!assuntoEvidencia || !corpoEvidencia) && rotinaRec) {
        try {
          const evList = $app.findRecordsByFilter(
            'backup_evidencias',
            `rotina = '${rotinaRec.id}'`,
            '-created',
            1,
            0,
          )
          if (evList.length > 0) {
            if (!assuntoEvidencia) assuntoEvidencia = evList[0].getString('assunto') || ''
            if (!corpoEvidencia) corpoEvidencia = evList[0].getString('conteudo') || ''
          }
        } catch (_) {}
      }

      const rotinaNome = rotinaRec ? rotinaRec.getString('nome') : ''

      // Adaptador ACRONIS_PDF comprova nuvem diretamente
      if (adaptadorCodigo && adaptadorCodigo.toUpperCase() === 'ACRONIS_PDF') {
        return 'nuvem'
      }

      // CAMADA B (Prioridade máxima de conteúdo): Tipo declarado NO CORPO do comprovante
      // NUNCA usar pasta de job ("to Cloud") nem assinatura da ferramenta ("Backup & Replication").
      if (corpoEvidencia) {
        const headerVeeamRegex =
          /(?:^|[\r\n]|<[^>]*>)\s*(Backup Copy [Jj]ob|Copy [Jj]ob|Replication [Jj]ob|Backup [Jj]ob)\s*:\s*([^<\r\n]+?)(?=\s*Created by|\s*Success|\s*Warning|\s*Failed|\s*Error|[\r\n]|<|$)/i
        const matchCorpo = corpoEvidencia.match(headerVeeamRegex)
        if (matchCorpo && matchCorpo[1]) {
          const prefixoCorpo = matchCorpo[1].trim().toLowerCase()
          if (prefixoCorpo.startsWith('backup copy') || prefixoCorpo.startsWith('copy')) {
            return 'nuvem'
          }
          if (prefixoCorpo.startsWith('replication')) {
            return 'replicacao'
          }
          if (prefixoCorpo.startsWith('backup')) {
            return 'local'
          }
        }

        // Tipo explícito no corpo/HTML: "Type: Backup" / "Type: Backup Copy" / "Type: Replication"
        const typeRegex = /(?:Type|Tipo)\s*[:=]\s*(Backup Copy|Copy|Replication|Backup)/i
        const typeMatch = corpoEvidencia.match(typeRegex)
        if (typeMatch && typeMatch[1]) {
          const tLower = typeMatch[1].trim().toLowerCase()
          if (tLower.includes('copy')) return 'nuvem'
          if (tLower.includes('replication')) return 'replicacao'
          if (tLower.includes('backup')) return 'local'
        }
      }

      // CAMADA C: Marcador explícito no NOME DA ROTINA (- LOCAL, - NUVEM/- NUVENS, - REPLICA/- REPLICAS/- REPLICACAO)
      if (rotinaNome) {
        const rNome = rotinaNome.trim().toLowerCase()
        if (/(?:^|\s|-)\s*(?:replicas?|replicacao|replica[çc][aã]o)(?:\s*|$)/i.test(rNome)) {
          return 'replicacao'
        }
        if (/(?:^|\s|-)\s*nuvens?(?:\s*|$)/i.test(rNome)) {
          return 'nuvem'
        }
        if (/(?:^|\s|-)\s*local(?:\s*|$)/i.test(rNome)) {
          return 'local'
        }
      }

      // CAMADA A/Fallback de assunto (só se corpo e rotina não definiram)
      if (assuntoEvidencia) {
        const assuntoLimpo = String(assuntoEvidencia)
          .replace(/^(\s*\[[^\]]+\]\s*)+/i, '')
          .trim()
          .toLowerCase()
        if (assuntoLimpo.startsWith('backup copy job:') || assuntoLimpo.startsWith('copy job:')) {
          return 'nuvem'
        }
        if (assuntoLimpo.startsWith('replication job:')) {
          return 'replicacao'
        }
        if (assuntoLimpo.startsWith('backup job:')) {
          return 'local'
        }
      }

      // CAMADA D: Ambíguo -> null (fail-closed mantido)
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

      // Se não encontrou por ativo_inventario direto, tentar correspondência por caminho_identificacao ou nome
      if (fontesDoAtivo.length === 0) {
        const nomeNorm = normalizarString(assetNome)
        const nomeComp = normalizarCompacto(assetNome)
        for (let fi = 0; fi < todasFontes.length; fi++) {
          const f = todasFontes[fi]
          const camNorm = normalizarString(f.getString('caminho_identificacao'))
          const fNomeNorm = normalizarString(f.getString('nome'))
          const camComp = normalizarCompacto(f.getString('caminho_identificacao'))
          const fNomeComp = normalizarCompacto(f.getString('nome'))

          if (
            (camNorm &&
              (camNorm === nomeNorm || camNorm.includes(nomeNorm) || nomeNorm.includes(camNorm))) ||
            (fNomeNorm &&
              (fNomeNorm === nomeNorm ||
                fNomeNorm.includes(nomeNorm) ||
                nomeNorm.includes(fNomeNorm))) ||
            (camComp &&
              (camComp === nomeComp || camComp.includes(nomeComp) || nomeComp.includes(camComp))) ||
            (fNomeComp &&
              (fNomeComp === nomeComp ||
                fNomeComp.includes(nomeComp) ||
                nomeComp.includes(fNomeComp)))
          ) {
            fontesDoAtivo.push(f)
          }
        }
      }

      if (fontesDoAtivo.length === 0 && todasFontes.length > 0) {
        fontesDoAtivo = todasFontes
      }

      const avaliarModalidade = (modalidadeNomeParam) => {
        const modalidadeNome = String(modalidadeNomeParam || '').toLowerCase()
        const fontesCandidatas = []
        for (let fi = 0; fi < fontesDoAtivo.length; fi++) {
          const f = fontesDoAtivo[fi]
          const rotinaId = f.getString('rotina')
          const rotina = rotinasMap[rotinaId]
          if (!rotina) continue

          const planoId = rotina.getString('plano')
          const plano = planosMap[planoId]
          if (!plano) continue

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
          const caminhoComp = normalizarCompacto(
            cand.fonte.getString('caminho_identificacao') || assetNome,
          )

          for (let ei = 0; ei < execucoes.length; ei++) {
            const ex = execucoes[ei]
            if (ex.getString('rotina') !== rotinaId) continue

            // REGRA FUNDAMENTAL: A avaliação de proteção de cada ativo deve usar
            // como FONTE PRIMÁRIA o campo confronto_escopo JÁ GRAVADO na execução
            // (lido com normalizarJson(ex.get('confronto_escopo'))). Se comprovado (array)
            // estiver não-vazio, use esses itens diretamente para marcar as modalidades
            // como comprovadas por ativo (campo ativo_id, modalidade, comprovado_em, fonte_casada)
            // — SEM executar o recálculo de inferência para essa execução.
            const confGravadoEx = normalizarJson(ex.get('confronto_escopo'))
            let itemGravadoComprovado = null

            // Helper de correspondência de ativo em itens de confronto_escopo
            const verificarMatchAtivo = (listaComprovados) => {
              if (!Array.isArray(listaComprovados) || listaComprovados.length === 0) return null
              const aNomeNorm = normalizarString(assetNome)
              const aNomeComp = normalizarCompacto(assetNome)
              const cNorm = caminhoNorm
              const cComp = caminhoComp

              for (let cidx = 0; cidx < listaComprovados.length; cidx++) {
                const item = listaComprovados[cidx]
                if (!item) continue
                const itemNome = item.ativo_nome || item.item_comprovante || item.fonte_casada || ''
                const itemNorm = normalizarString(itemNome)
                const itemComp = normalizarCompacto(itemNome)

                const bateu =
                  item.ativo_id === assetId ||
                  (itemNorm &&
                    (itemNorm === aNomeNorm ||
                      itemNorm === cNorm ||
                      (aNomeNorm && itemNorm.includes(aNomeNorm)) ||
                      (aNomeNorm && aNomeNorm.includes(itemNorm)) ||
                      (cNorm && itemNorm.includes(cNorm)) ||
                      (cNorm && cNorm.includes(itemNorm)))) ||
                  (itemComp &&
                    (itemComp === aNomeComp ||
                      itemComp === cComp ||
                      (aNomeComp && itemComp.includes(aNomeComp)) ||
                      (aNomeComp && aNomeComp.includes(itemComp)) ||
                      (cComp && itemComp.includes(cComp)) ||
                      (cComp && cComp.includes(itemComp))))

                if (bateu) {
                  return item
                }
              }
              return null
            }

            // 1. FONTE PRIMÁRIA: confronto_escopo gravado na execução
            let itemGravadoFalha = null
            if (confGravadoEx && typeof confGravadoEx === 'object') {
              if (Array.isArray(confGravadoEx.comprovado) && confGravadoEx.comprovado.length > 0) {
                const matched = verificarMatchAtivo(confGravadoEx.comprovado)
                if (matched && String(matched.modalidade || '').toLowerCase() === modalidadeNome) {
                  itemGravadoComprovado = matched
                }
              }
              if (
                !itemGravadoComprovado &&
                Array.isArray(confGravadoEx.falhas) &&
                confGravadoEx.falhas.length > 0
              ) {
                const matchedFalha = verificarMatchAtivo(confGravadoEx.falhas)
                if (
                  matchedFalha &&
                  String(matchedFalha.modalidade || '').toLowerCase() === modalidadeNome
                ) {
                  itemGravadoFalha = matchedFalha
                }
              }
            }

            // 2. FONTE SECUNDÁRIA (Fallback se gravado na execução estiver vazio/ausente): backup_avaliacoes
            if (!itemGravadoComprovado && !itemGravadoFalha) {
              try {
                const avalsEx = $app.findRecordsByFilter(
                  'backup_avaliacoes',
                  `execucao = '${ex.id}'`,
                  '-created',
                  1,
                  0,
                )
                if (avalsEx.length > 0) {
                  const confAval = normalizarJson(avalsEx[0].get('confronto_escopo'))
                  if (confAval && typeof confAval === 'object') {
                    if (Array.isArray(confAval.comprovado) && confAval.comprovado.length > 0) {
                      const matched = verificarMatchAtivo(confAval.comprovado)
                      if (
                        matched &&
                        String(matched.modalidade || '').toLowerCase() === modalidadeNome
                      ) {
                        itemGravadoComprovado = matched
                      }
                    }
                    if (
                      !itemGravadoComprovado &&
                      Array.isArray(confAval.falhas) &&
                      confAval.falhas.length > 0
                    ) {
                      const matchedF = verificarMatchAtivo(confAval.falhas)
                      if (
                        matchedF &&
                        String(matchedF.modalidade || '').toLowerCase() === modalidadeNome
                      ) {
                        itemGravadoFalha = matchedF
                      }
                    }
                  }
                }
              } catch (_) {}
            }

            let cobreAtivoNaExecucao = false
            let statusIndividualAtivo = null
            let motivoIndividualAtivo = ''

            // Se o item JÁ ESTÁ COMPROVADO no campo gravado para esta modalidade,
            // aceitamos DIRETO sem executar recálculo de inferência!
            if (itemGravadoComprovado) {
              cobreAtivoNaExecucao = true
              const st = String(itemGravadoComprovado.status || '').toLowerCase()
              statusIndividualAtivo = st === 'success' || st === 'sucesso' || !st ? 'sucesso' : st
            } else if (itemGravadoFalha) {
              cobreAtivoNaExecucao = true
              statusIndividualAtivo = 'erro'
              motivoIndividualAtivo =
                itemGravadoFalha.motivo || `Item reportou falha na execução gravada.`
            } else {
              // Recálculo ao vivo (inferência de modalidade + casamento de fonte)
              let modalidadeRecalculada = inferirModalidadeComprovante(ex, cand.rotina)
              if (String(modalidadeRecalculada || '').toLowerCase() === modalidadeNome) {
                const dVms = obterDetalhesVmsExecucao(ex)
                const assetNomeNorm = normalizarString(assetNome)
                const assetNomeComp = normalizarCompacto(assetNome)

                if (Array.isArray(dVms) && dVms.length > 0) {
                  for (let vi = 0; vi < dVms.length; vi++) {
                    const vm = dVms[vi]
                    const vmNomeNorm = normalizarString(vm.nome)
                    const vmNomeComp = normalizarCompacto(vm.nome)
                    if (!vmNomeNorm && !vmNomeComp) continue

                    const bateu =
                      vmNomeNorm === assetNomeNorm ||
                      vmNomeNorm === caminhoNorm ||
                      vmNomeComp === assetNomeComp ||
                      vmNomeComp === caminhoComp ||
                      (assetNomeNorm && vmNomeNorm.includes(assetNomeNorm)) ||
                      (assetNomeNorm && assetNomeNorm.includes(vmNomeNorm)) ||
                      (caminhoNorm && vmNomeNorm.includes(caminhoNorm)) ||
                      (caminhoNorm && caminhoNorm.includes(vmNomeNorm)) ||
                      (assetNomeComp && vmNomeComp.includes(assetNomeComp)) ||
                      (assetNomeComp && assetNomeComp.includes(vmNomeComp))

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
                } else {
                  cobreAtivoNaExecucao = true
                  const stEx = ex.getString('status')
                  statusIndividualAtivo = stEx === 'sucesso' ? 'sucesso' : 'erro'
                  if (statusIndividualAtivo !== 'sucesso') {
                    motivoIndividualAtivo = `Execução reportou status "${stEx}".`
                  }
                }
              }
            }
            if (cobreAtivoNaExecucao) {
              const dtIso =
                (itemGravadoComprovado && itemGravadoComprovado.comprovado_em) ||
                extrairDataExecucao(ex)
              if (dtIso) {
                const dtTime = new Date(dtIso).getTime()
                const nomeJobExec =
                  (itemGravadoComprovado &&
                    (itemGravadoComprovado.job_nome || itemGravadoComprovado.rotina_nome)) ||
                  extrairNomeJob(ex, cand.rotina)

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

        // Se a execução mais recente aplicável ao ativo falhou para esta modalidade
        // e não há comprovação posterior válida dentro da janela cronológica:
        const ultimaFalhou =
          ultimaExecucaoCronologica &&
          ultimaExecucaoCronologica.status !== 'sucesso' &&
          ultimaExecucaoCronologicaTime >= melhorDataTime

        if (ultimaFalhou) {
          const horasDesdeFalha = (nowTime - ultimaExecucaoCronologicaTime) / (1000 * 60 * 60)
          // Coletar VMs com falha da execução falhada para exibir em tooltip/detalhe
          let vmsFalhasLista = []
          try {
            if (ultimaExecucaoCronologica && ultimaExecucaoCronologica.execucaoId) {
              const exRecFalha = $app.findRecordById(
                'backup_execucoes',
                ultimaExecucaoCronologica.execucaoId,
              )
              const dVmsF = obterDetalhesVmsExecucao(exRecFalha)
              if (Array.isArray(dVmsF) && dVmsF.length > 0) {
                for (let vfi = 0; vfi < dVmsF.length; vfi++) {
                  const stV = String(dVmsF[vfi].status || '').toLowerCase()
                  if (stV === 'failed' || stV === 'error' || stV === 'erro' || stV === 'falha') {
                    vmsFalhasLista.push(dVmsF[vfi].nome)
                  }
                }
              } else {
                // Verificar campo falhas gravado no confronto_escopo
                const cEscF = normalizarJson(exRecFalha.get('confronto_escopo'))
                if (cEscF && Array.isArray(cEscF.falhas) && cEscF.falhas.length > 0) {
                  for (let ffi = 0; ffi < cEscF.falhas.length; ffi++) {
                    const fnome = cEscF.falhas[ffi].ativo_nome || cEscF.falhas[ffi].item_comprovante
                    if (fnome && !vmsFalhasLista.includes(fnome)) {
                      vmsFalhasLista.push(fnome)
                    }
                  }
                }
              }
            }
          } catch (_) {}

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
            vms_falhas: vmsFalhasLista.length > 0 ? vmsFalhasLista : [assetNome],
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

    // -----------------------------------------------------------------
    // RECONCILIAÇÃO SEGURA E NÃO-DESTRUTIVA DAS EXECUÇÕES
    // Regra inegociável: NUNCA sobrescrever comprovado com array vazio [].
    // Se a avaliação vinculada possui confronto_escopo.comprovado válido (não-vazio),
    // copia INTEGRALMENTE para a execução clonando com JSON.parse(JSON.stringify(...)).
    // Se a execução já possui confronto_escopo gravado com comprovado não-vazio,
    // use-o como FONTE ÚNICA DE VERDADE e sincronize com a avaliação.
    // NUNCA re-inferir ou recalcular se já existe campo gravado preenchido!
    // -----------------------------------------------------------------
    let totalExecucoesReconciliadas = 0
    try {
      for (let ei = 0; ei < execucoes.length; ei++) {
        const ex = execucoes[ei]
        const rotinaId = ex.getString('rotina')
        const rotina = rotinasMap[rotinaId]

        // Log de diagnóstico TEMPORÁRIO para a execução vjqzacdotk6v1xr
        if (ex.id === 'vjqzacdotk6v1xr') {
          const rawEscopo = ex.get('confronto_escopo')
          const isArr = Array.isArray(rawEscopo)
          let preview = ''
          try {
            if (isArr) {
              preview = `[array len=${rawEscopo.length}, first=${rawEscopo[0]}, sample=${JSON.stringify(rawEscopo.slice(0, 20))}]`
            } else if (typeof rawEscopo === 'object' && rawEscopo !== null) {
              preview = JSON.stringify(rawEscopo).substring(0, 80)
            } else {
              preview = String(rawEscopo).substring(0, 80)
            }
          } catch (_) {
            preview = String(rawEscopo).substring(0, 80)
          }
          console.log(
            `[confronto:debug] vjqzacdotk6v1xr raw typeof=${typeof rawEscopo} isArray=${isArr} preview=${preview}`,
          )
        }

        // 1. Verificar FONTE PRIMÁRIA gravada na execução
        const confExistenteEx = normalizarJson(ex.get('confronto_escopo'))
        const temComprovadoValidoEx =
          confExistenteEx &&
          typeof confExistenteEx === 'object' &&
          Array.isArray(confExistenteEx.comprovado) &&
          confExistenteEx.comprovado.length > 0

        // 2. Verificar se a avaliação possui confronto gravado
        let avalRecEncontrada = null
        let confrontoCopiadoDaAvaliacao = null
        try {
          const avalsExistentes = $app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${ex.id}'`,
            '-created',
            1,
            0,
          )
          if (avalsExistentes.length > 0) {
            avalRecEncontrada = avalsExistentes[0]
            const cAval = normalizarJson(avalRecEncontrada.get('confronto_escopo'))
            if (
              cAval &&
              typeof cAval === 'object' &&
              Array.isArray(cAval.comprovado) &&
              cAval.comprovado.length > 0
            ) {
              confrontoCopiadoDaAvaliacao = JSON.parse(JSON.stringify(cAval))
            }
          }
        } catch (errBuscaAval) {
          console.error(
            '[confronto:reconciliacao] Erro ao buscar avaliação para a execução #' + ex.id + ':',
            errBuscaAval?.message || errBuscaAval,
          )
        }

        // Se a execução já possui comprovado válido, ela é a FONTE PRIMÁRIA
        if (temComprovadoValidoEx) {
          if (avalRecEncontrada) {
            try {
              const cAval = normalizarJson(avalRecEncontrada.get('confronto_escopo'))
              if (
                !cAval ||
                !Array.isArray(cAval.comprovado) ||
                cAval.comprovado.length !== confExistenteEx.comprovado.length
              ) {
                avalRecEncontrada.set(
                  'confronto_escopo',
                  JSON.parse(JSON.stringify(confExistenteEx)),
                )
                $app.save(avalRecEncontrada)
              }
            } catch (errSyncAval) {
              console.error(
                `[confronto:reconciliacao] Falha ao sincronizar avaliação a partir da execução #${ex.id}:`,
                errSyncAval?.message || errSyncAval,
              )
            }
          }
          continue
        }

        // Se a execução não possui comprovado válido mas a avaliação possui, copiar da avaliação
        if (confrontoCopiadoDaAvaliacao) {
          try {
            ex.set('confronto_escopo', JSON.parse(JSON.stringify(confrontoCopiadoDaAvaliacao)))
            $app.save(ex)
            totalExecucoesReconciliadas++
            console.log(
              `[confronto:reconciliacao] Confronto copiado com sucesso da avaliação para a execução #${ex.id}. Comprovados: ${confrontoCopiadoDaAvaliacao.comprovado.length}.`,
            )
          } catch (errSaveCopia) {
            console.error(
              `[confronto:reconciliacao] FALHA LOUD ao salvar confronto copiado na execução #${ex.id}:`,
              errSaveCopia?.message || errSaveCopia,
            )
          }
          continue
        }

        const modalidadeEx = inferirModalidadeComprovante(ex, rotina)
        if (!modalidadeEx) continue

        // 1. Garantir detalhes_vms se disponíveis em outros registros
        let dVmsEx = obterDetalhesVmsExecucao(ex)
        const temDetalhesVms = Array.isArray(dVmsEx) && dVmsEx.length > 0
        const dVmsGravados = normalizarJson(ex.get('detalhes_vms'))
        if ((!Array.isArray(dVmsGravados) || dVmsGravados.length === 0) && temDetalhesVms) {
          try {
            ex.set('detalhes_vms', JSON.parse(JSON.stringify(dVmsEx)))
            $app.save(ex)
          } catch (errSaveDv) {
            console.error(
              '[confronto:reconciliacao] Falha ao salvar detalhes_vms na execução #' + ex.id + ':',
              errSaveDv?.message || errSaveDv,
            )
          }
        }

        // CENÁRIO C: Nem a avaliação nem a execução têm comprovado preenchido.
        // Tentar calcular NOVO confronto a partir dos ativos exigidos e dos detalhes de VMs.
        const nomeJobReconciliado = extrairNomeJob(ex, rotina)
        const novoComprovado = []
        const novasFalhas = []
        const novasPendencias = []

        for (let ai = 0; ai < assetsExigidos.length; ai++) {
          const a = assetsExigidos[ai]
          const aId = a.id
          const aNome = a.getString('name')
          const aTipo = a.getString('tipo')
          const aNomeNorm = normalizarString(aNome)
          const aNomeComp = normalizarCompacto(aNome)
          const exLoc = Boolean(a.getBool('exige_backup_local'))
          const exNuv = Boolean(a.getBool('exige_backup_nuvem'))
          const exRep = Boolean(a.getBool('exige_backup_replicacao'))

          const mods = []
          if (exLoc) mods.push('local')
          if (exNuv) mods.push('nuvem')
          if (exRep) mods.push('replicacao')

          let vmPresente = false
          let vmComSucesso = false
          let vmMotivoErro = ''

          if (temDetalhesVms) {
            for (let vi = 0; vi < dVmsEx.length; vi++) {
              const vmObj = dVmsEx[vi]
              const vmNorm = normalizarString(vmObj.nome)
              const vmComp = normalizarCompacto(vmObj.nome)
              const bateuVm =
                (vmNorm &&
                  (vmNorm === aNomeNorm ||
                    vmNorm.includes(aNomeNorm) ||
                    aNomeNorm.includes(vmNorm))) ||
                (vmComp &&
                  (vmComp === aNomeComp ||
                    vmComp.includes(aNomeComp) ||
                    aNomeComp.includes(vmComp)))

              if (bateuVm) {
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

          const modalidadeExNorm = String(modalidadeEx || '').toLowerCase()
          for (let mi = 0; mi < mods.length; mi++) {
            const m = String(mods[mi] || '').toLowerCase()
            if (m === modalidadeExNorm && vmComSucesso) {
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
              if (m === modalidadeExNorm && vmPresente && !vmComSucesso) {
                novasFalhas.push({
                  ativo_id: aId,
                  ativo_nome: aNome,
                  ativo_tipo: aTipo,
                  modalidade: m,
                  rotina: rotinaId || null,
                  rotina_nome: rotina ? rotina.getString('nome') : null,
                  job_nome: nomeJobReconciliado || (rotina ? rotina.getString('nome') : null),
                  data_execucao: extrairDataExecucao(ex) || now.toISOString(),
                  status: 'erro',
                  motivo: vmMotivoErro || `Falha na execução da VM ${aNome}.`,
                })
              }

              const modLabel = m === 'local' ? 'Local' : m === 'nuvem' ? 'Nuvem' : 'Replicação'
              let motivoPend = `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`
              if (m === modalidadeExNorm) {
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
                atendivel_por_outra_rotina: m !== modalidadeExNorm,
              })
            }
          }
        }

        // REGRA DE OURO FIX 1: Não persistir escopo vazio se nem comprovado nem falhas foram encontrados.
        // Se houver comprovações OU falhas registradas, persistir o escopo completo!
        if (novoComprovado.length === 0 && novasFalhas.length === 0) {
          console.warn(
            `[confronto:reconciliacao] Nenhum item comprovado nem falha foi calculado para a execução #${ex.id}. Sobrescrita destrutiva neutralizada: registro mantido intacto.`,
          )
          continue
        }
        // Resolução robusta de escopo
        let escIdReconciliado =
          confExistenteEx && confExistenteEx.escopo_id ? confExistenteEx.escopo_id : null
        let escNomeReconciliado =
          confExistenteEx && confExistenteEx.escopo_nome ? confExistenteEx.escopo_nome : null

        if (!escIdReconciliado && rotina) {
          const pId = rotina.getString('plano')
          const pRec = pId ? planosMap[pId] : null
          if (pRec) {
            const eId = pRec.getString('escopo')
            if (eId) {
              try {
                const eRec = $app.findRecordById('backup_escopo', eId)
                if (eRec) {
                  escIdReconciliado = eRec.id
                  escNomeReconciliado = eRec.getString('nome')
                }
              } catch (_) {}
            }
          }
        }

        if (!escIdReconciliado) {
          try {
            const escOrg = $app.findRecordsByFilter(
              'backup_escopo',
              `organization = '${targetOrgId}' && status = 'ativo'`,
              '+created',
              1,
              0,
            )
            if (escOrg.length > 0) {
              escIdReconciliado = escOrg[0].id
              escNomeReconciliado = escOrg[0].getString('nome')
            }
          } catch (_) {}
        }

        let exigenciasReconciliadas =
          confExistenteEx &&
          Array.isArray(confExistenteEx.exigencias) &&
          confExistenteEx.exigencias.length > 0
            ? confExistenteEx.exigencias
            : []

        if (exigenciasReconciliadas.length === 0) {
          for (let ai = 0; ai < assetsExigidos.length; ai++) {
            const a = assetsExigidos[ai]
            const exLoc = Boolean(a.getBool('exige_backup_local'))
            const exNuv = Boolean(a.getBool('exige_backup_nuvem'))
            const exRep = Boolean(a.getBool('exige_backup_replicacao'))
            const mods = []
            if (exLoc) mods.push('local')
            if (exNuv) mods.push('nuvem')
            if (exRep) mods.push('replicacao')
            exigenciasReconciliadas.push({
              ativo_id: a.id,
              ativo_nome: a.getString('name'),
              ativo_tipo: a.getString('tipo') || '',
              local: exLoc,
              nuvem: exNuv,
              replicacao: exRep,
              modalidades: mods,
            })
          }
        }

        const novoConfronto = {
          escopo_id: escIdReconciliado,
          escopo_nome: escNomeReconciliado || 'Base Principal dos Sistemas da Serventia',
          rotina_id: rotinaId,
          rotina_nome: rotina ? rotina.getString('nome') : null,
          job_nome: nomeJobReconciliado || (rotina ? rotina.getString('nome') : null),
          plano_id: rotina ? rotina.getString('plano') : null,
          plano_nome:
            rotina && planosMap[rotina.getString('plano')]
              ? planosMap[rotina.getString('plano')].getString('nome')
              : null,
          modalidades_plano: [modalidadeEx],
          exigencias: exigenciasReconciliadas,
          comprovado: novoComprovado,
          pendencias: novasPendencias,
          falhas: novasFalhas,
          total_ativos_escopo: assetsExigidos.length,
          total_exigencias_modalidade: exigenciasReconciliadas.reduce(
            (acc, cur) => acc + (cur.modalidades ? cur.modalidades.length : 3),
            0,
          ),
          total_comprovadas: novoComprovado.length,
          total_falhas: novasFalhas.length,
          total_pendencias: novasPendencias.length,
        }
        // Persistir novo confronto válido na execução
        try {
          ex.set('confronto_escopo', JSON.parse(JSON.stringify(novoConfronto)))
          $app.save(ex)
          totalExecucoesReconciliadas++
        } catch (errSaveEx) {
          console.error(
            `[confronto:reconciliacao] FALHA LOUD ao salvar confronto recalculado na execução #${ex.id}:`,
            errSaveEx?.message || errSaveEx,
          )
          try {
            const auditCol = $app.findCollectionByNameOrId('audit_log')
            const auditRec = new Record(auditCol)
            auditRec.set('organization', targetOrgId)
            auditRec.set('action', 'BACKUP_EXECUCAO_UPDATE_ERROR')
            auditRec.set('entity', 'Backup e Continuidade')
            auditRec.set(
              'detail',
              `FALHA ao salvar confronto recalculado na execução #${ex.id}: ${errSaveEx?.message || String(errSaveEx)}`,
            )
            auditRec.set('metadata', { execucao_id: ex.id, error: String(errSaveEx) })
            $app.save(auditRec)
          } catch (_) {}
        }

        // Persistir na avaliação correspondente (Fonte Única de Verdade)
        if (avalRecEncontrada) {
          try {
            avalRecEncontrada.set('confronto_escopo', JSON.parse(JSON.stringify(novoConfronto)))
            $app.save(avalRecEncontrada)
          } catch (errAv) {
            console.error(
              '[confronto:reconciliacao] Falha ao atualizar backup_avaliacoes da execução #' +
                ex.id +
                ':',
              errAv?.message || errAv,
            )
          }
        }
      }

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
            `Reconciliação segura de confronto executada. ${totalExecucoesReconciliadas} execução(ões) sincronizada(s) pela regra estrita de comprovação.`,
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
    } catch (errReconciliacao) {
      console.error(
        '[confronto:reconciliacao] Exceção durante a reconciliação segura:',
        errReconciliacao?.message || errReconciliacao,
      )
    }

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
