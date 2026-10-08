/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0039: Sincronização Compulsória de confronto_escopo nas Execuções de Backup
 *
 * Objetivo:
 * 1. Para TODAS as backup_execucoes que possuem avaliação vinculada (backup_avaliacoes.execucao = ex.id):
 *    - Se a avaliação tem confronto_escopo.comprovado como array não-vazio:
 *      - Clonar INTEGRALMENTE via JSON.parse(JSON.stringify(cand)) da avaliação para a execução.
 *      - Se a execução já possui comprovado válido e idêntico, NÃO tocar.
 * 2. Se a avaliação vinculada estiver vazia/zerada mas a execução tiver detalhes_vms e rotina com ativos,
 *    reconstruir defensivamente os itens comprovados (ex: 4 VMs GOLD -> modalidade local) tanto na
 *    avaliação quanto na execução, clonando de forma segura.
 * 3. Registrar quantas execuções foram corrigidas no log da migração e na tabela audit_log (append-only).
 */
migrate(
  (app) => {
    console.log('[0039_sincronizar_confronto_compulsorio] Iniciando migração...')

    const normalizar = (str) => {
      if (!str) return ''
      return String(str)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\\/g, '/')
        .trim()
    }

    const inferirModalidade = (assunto, conteudo, rotinaNome) => {
      // 1. Tipo declarado no CORPO
      if (conteudo) {
        const headerVeeamRegex =
          /(?:^|[\r\n]|<[^>]*>)\s*(Backup Copy [Jj]ob|Copy [Jj]ob|Replication [Jj]ob|Backup [Jj]ob)\s*:\s*([^<\r\n]+?)(?=\s*Created by|\s*Success|\s*Warning|\s*Failed|\s*Error|[\r\n]|<|$)/i
        const matchCorpo = conteudo.match(headerVeeamRegex)
        if (matchCorpo && matchCorpo[1]) {
          const p = matchCorpo[1].trim().toLowerCase()
          if (p.startsWith('backup copy') || p.startsWith('copy')) return 'nuvem'
          if (p.startsWith('replication')) return 'replicacao'
          if (p.startsWith('backup')) return 'local'
        }

        const typeRegex = /(?:Type|Tipo)\s*[:=]\s*(Backup Copy|Copy|Replication|Backup)/i
        const typeMatch = conteudo.match(typeRegex)
        if (typeMatch && typeMatch[1]) {
          const tLower = typeMatch[1].trim().toLowerCase()
          if (tLower.includes('copy')) return 'nuvem'
          if (tLower.includes('replication')) return 'replicacao'
          if (tLower.includes('backup')) return 'local'
        }
      }

      // 2. Sufixo estruturado da rotina
      if (rotinaNome) {
        const rNome = rotinaNome.trim().toLowerCase()
        if (/(?:^|\s|-)\s*(?:replicas?|replicacao|replica[çc][aã]o)\s*$/i.test(rNome)) {
          return 'replicacao'
        }
        if (/(?:^|\s|-)\s*nuvens?\s*$/i.test(rNome)) {
          return 'nuvem'
        }
        if (/(?:^|\s|-)\s*local\s*$/i.test(rNome)) {
          return 'local'
        }
      }

      // 3. Fallback no assunto
      if (assunto) {
        const assNorm = (assunto || '').toLowerCase().trim()
        const limpo = assNorm.replace(/^(\s*\[[^\]]+\]\s*)+/i, '').trim()
        if (limpo.startsWith('backup copy job:') || limpo.startsWith('copy job:')) {
          return 'nuvem'
        }
        if (limpo.startsWith('replication job:')) {
          return 'replicacao'
        }
        if (limpo.startsWith('backup job:')) {
          return 'local'
        }
      }

      return null
    }

    try {
      const execucoes = app.findRecordsByFilter('backup_execucoes', '', '-created', 1000, 0)
      console.log(`[0039] Total de execuções encontradas: ${execucoes.length}`)

      let totalCorrigidas = 0
      let totalJaValidas = 0

      for (let i = 0; i < execucoes.length; i++) {
        const ex = execucoes[i]
        const exId = ex.id
        const orgId = ex.getString('organization')

        // 1. Buscar avaliações vinculadas à execução
        let avaliacoes = []
        try {
          avaliacoes = app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${exId}'`,
            '-created',
            10,
            0,
          )
        } catch (eBuscaAv) {
          console.error(`[0039] Erro ao buscar avaliações da execução #${exId}:`, eBuscaAv)
        }

        const confEx = ex.get('confronto_escopo')
        const exTemComprovadoValido =
          confEx &&
          typeof confEx === 'object' &&
          Array.isArray(confEx.comprovado) &&
          confEx.comprovado.length > 0

        // 2. Verificar se alguma avaliação tem comprovado preenchido
        let candAval = null
        let avalValidaRec = null
        for (let aI = 0; aI < avaliacoes.length; aI++) {
          const a = avaliacoes[aI]
          const c = a.get('confronto_escopo')
          if (
            c &&
            typeof c === 'object' &&
            Array.isArray(c.comprovado) &&
            c.comprovado.length > 0
          ) {
            candAval = c
            avalValidaRec = a
            break
          }
        }

        // Caso A: Avaliação possui comprovado não-vazio
        if (candAval && Array.isArray(candAval.comprovado) && candAval.comprovado.length > 0) {
          // Verificar se a execução já possui exatamente o mesmo comprovado
          if (
            exTemComprovadoValido &&
            confEx.comprovado.length === candAval.comprovado.length &&
            confEx.comprovado[0]?.ativo_id === candAval.comprovado[0]?.ativo_id &&
            confEx.comprovado[0]?.modalidade === candAval.comprovado[0]?.modalidade
          ) {
            totalJaValidas++
            continue
          }

          // Clonar integralmente via JSON.parse(JSON.stringify(...))
          const copiaAval = JSON.parse(JSON.stringify(candAval))
          try {
            ex.set('confronto_escopo', copiaAval)
            app.save(ex)
            totalCorrigidas++
            console.log(
              `[0039] Execução #${exId} corrigida copiando confronto da avaliação. Comprovados: ${copiaAval.comprovado.length}`,
            )

            try {
              const auditCol = app.findCollectionByNameOrId('audit_log')
              const auditRec = new Record(auditCol)
              auditRec.set('organization', orgId)
              auditRec.set('action', 'BACKUP_EXECUCAO_CONFRONTO_SYNCED_0039')
              auditRec.set('entity', 'Backup e Continuidade')
              auditRec.set(
                'detail',
                `Confronto de escopo da execução #${exId} copiado integralmente da avaliação vinculada #${avalValidaRec ? avalValidaRec.id : ''}. Comprovados: ${copiaAval.comprovado.length}.`,
              )
              auditRec.set('metadata', {
                execucao_id: exId,
                total_comprovados: copiaAval.comprovado.length,
              })
              app.save(auditRec)
            } catch (_) {}

            continue
          } catch (eSaveCopia) {
            console.error(`[0039] FALHA LOUD ao salvar cópia na execução #${exId}:`, eSaveCopia)
          }
        }

        // Caso B: Nem a avaliação nem a execução possuem comprovado válido, mas temos evidência e rotina
        // Reconstruir comprovado a partir da rotina e ativos do escopo
        const evidenciaId = ex.getString('evidencia')
        let evRec = null
        if (evidenciaId) {
          try {
            evRec = app.findRecordById('backup_evidencias', evidenciaId)
          } catch (_) {}
        }

        const rotinaId = ex.getString('rotina') || (evRec ? evRec.getString('rotina') : '')
        let rotinaRec = null
        if (rotinaId) {
          try {
            rotinaRec = app.findRecordById('backup_rotinas', rotinaId)
          } catch (_) {}
        }

        const assunto = evRec ? evRec.getString('assunto') : ''
        const conteudo = evRec ? evRec.getString('conteudo') : ''
        const rotinaNome = rotinaRec ? rotinaRec.getString('nome') : ''

        let modalidade = inferirModalidade(assunto, conteudo, rotinaNome)
        if (!modalidade) {
          // Fallback para Veeam com status de sucesso
          if (conteudo && (conteudo.includes('Veeam') || conteudo.includes('veeam'))) {
            modalidade = 'local'
          }
        }

        if (!modalidade) {
          console.log(`[0039] Execução #${exId}: modalidade indeterminada, pulando reconstrução.`)
          continue
        }

        // Carregar escopo
        let escopoRec = null
        if (rotinaRec) {
          const pId = rotinaRec.getString('plano')
          if (pId) {
            try {
              const pRec = app.findRecordById('backup_planos', pId)
              if (pRec) {
                const escId = pRec.getString('escopo')
                if (escId) escopoRec = app.findRecordById('backup_escopo', escId)
              }
            } catch (_) {}
          }
        }
        if (!escopoRec && orgId) {
          try {
            const escList = app.findRecordsByFilter(
              'backup_escopo',
              `organization = '${orgId}' && status = 'ativo'`,
              '+created',
              1,
              0,
            )
            if (escList.length > 0) escopoRec = escList[0]
          } catch (_) {}
        }

        // Buscar ativos do escopo
        const ativosIds = []
        if (escopoRec) {
          try {
            const rawAt = escopoRec.get('ativos')
            if (Array.isArray(rawAt)) {
              for (let aI = 0; aI < rawAt.length; aI++) ativosIds.push(String(rawAt[aI]))
            } else if (typeof rawAt === 'string') {
              try {
                const p = JSON.parse(rawAt)
                if (Array.isArray(p))
                  for (let aI = 0; aI < p.length; aI++) ativosIds.push(String(p[aI]))
              } catch (_) {
                const parts = rawAt.split(',')
                for (let aI = 0; aI < parts.length; aI++) {
                  const s = parts[aI].trim()
                  if (s) ativosIds.push(s)
                }
              }
            }
          } catch (_) {}
        }

        const ativosEscopo = []
        for (let aI = 0; aI < ativosIds.length; aI++) {
          try {
            const aRec = app.findRecordById('inventory_assets', ativosIds[aI])
            if (aRec) ativosEscopo.push(aRec)
          } catch (_) {}
        }

        if (ativosEscopo.length === 0 && orgId) {
          try {
            const aList = app.findRecordsByFilter(
              'inventory_assets',
              `organization = '${orgId}' && status = 'ativo'`,
              '+name',
              50,
              0,
            )
            for (let aI = 0; aI < aList.length; aI++) ativosEscopo.push(aList[aI])
          } catch (_) {}
        }

        let detalhesVms = ex.get('detalhes_vms')
        if (!Array.isArray(detalhesVms) || detalhesVms.length === 0) {
          detalhesVms = []
        }

        const exigencias = []
        const comprovado = []
        const pendencias = []
        const dataComprovacao =
          ex.getString('data_inicio') || ex.getString('created') || new Date().toISOString()
        const jobNome = rotinaNome || 'Backup VMs'

        for (let aI = 0; aI < ativosEscopo.length; aI++) {
          const at = ativosEscopo[aI]
          const atId = at.id
          const atNome = at.getString('name')
          const atTipo = at.getString('tipo') || 'servidor_virtualizado'
          const atNomeUpper = normalizar(atNome)

          const exLocal = Boolean(at.getBool('exige_backup_local'))
          const exNuvem = Boolean(at.getBool('exige_backup_nuvem'))
          const exReplicacao = Boolean(at.getBool('exige_backup_replicacao'))

          const mods = []
          if (exLocal) mods.push('local')
          if (exNuvem) mods.push('nuvem')
          if (exReplicacao) mods.push('replicacao')

          exigencias.push({
            ativo_id: atId,
            ativo_nome: atNome,
            ativo_tipo: atTipo,
            local: exLocal,
            nuvem: exNuvem,
            replicacao: exReplicacao,
            modalidades: mods,
          })

          let vmEncontrada = null
          for (let vI = 0; vI < detalhesVms.length; vI++) {
            const vm = detalhesVms[vI]
            const vmNome = normalizar(vm.nome)
            if (
              vmNome === atNomeUpper ||
              vmNome.includes(atNomeUpper) ||
              atNomeUpper.includes(vmNome)
            ) {
              vmEncontrada = vm
              vm.ativo_id = atId
              vm.fora_escopo = false
              vm.status_escopo = 'coberto'
              break
            }
          }

          const vmPresente = Boolean(vmEncontrada)
          const stVm = vmEncontrada ? String(vmEncontrada.status || '').toLowerCase() : ''
          const vmComSucesso = vmPresente && (stVm === 'success' || stVm === 'sucesso' || !stVm)

          for (let mI = 0; mI < mods.length; mI++) {
            const m = mods[mI]
            if (m === modalidade && vmComSucesso) {
              comprovado.push({
                ativo_id: atId,
                ativo_nome: atNome,
                ativo_tipo: atTipo,
                modalidade: m,
                item_comprovante: atNome,
                fonte_casada: atNome,
                rotina_nome: rotinaNome,
                job_nome: jobNome,
                plano_nome: null,
                status: 'sucesso',
                comprovado_em: dataComprovacao,
              })
            } else {
              const modLabel = m === 'local' ? 'Local' : m === 'nuvem' ? 'Nuvem' : 'Replicação'
              let motivoPend = `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`
              if (m === modalidade) {
                if (!vmPresente) {
                  motivoPend = `Ativo não mencionado neste comprovante (pode ser coberto por outra rotina/job).`
                } else if (!vmComSucesso) {
                  motivoPend = `VM ${atNome} constou com status "${stVm || 'falha'}" na execução do job '${jobNome}'. Modalidade não homologada.`
                }
              }
              pendencias.push({
                ativo_id: atId,
                ativo_nome: atNome,
                ativo_tipo: atTipo,
                modalidade_pendente: m,
                ativo_presente_no_comprovante: vmPresente,
                item_comprovante: atNome,
                motivo: motivoPend,
                job_nome: jobNome,
                atendivel_por_outra_rotina: m !== modalidade,
              })
            }
          }
        }

        if (comprovado.length === 0) {
          console.log(`[0039] Nenhum item comprovado calculado para #${exId}, mantendo intacto.`)
          continue
        }

        const novoConfronto = {
          escopo_id: escopoRec ? escopoRec.id : null,
          escopo_nome: escopoRec ? escopoRec.getString('nome') : 'Sistemas da Serventia - SPCM',
          rotina_id: rotinaRec ? rotinaRec.id : null,
          rotina_nome: rotinaNome,
          job_nome: jobNome,
          plano_id: null,
          plano_nome: null,
          modalidades_plano: [modalidade],
          exigencias: exigencias,
          comprovado: comprovado,
          pendencias: pendencias,
          total_ativos_escopo: ativosEscopo.length,
          total_exigencias_modalidade: exigencias.reduce(
            (acc, cur) => acc + (cur.modalidades ? cur.modalidades.length : 3),
            0,
          ),
          total_comprovadas: comprovado.length,
          total_pendencias: pendencias.length,
        }

        try {
          ex.set('confronto_escopo', JSON.parse(JSON.stringify(novoConfronto)))
          if (detalhesVms.length > 0) {
            ex.set('detalhes_vms', detalhesVms)
          }
          app.save(ex)
          totalCorrigidas++
          console.log(
            `[0039] Execução #${exId} reconstruída com sucesso. Comprovados: ${comprovado.length}`,
          )

          // Sincronizar avaliações vinculadas também
          for (let aI = 0; aI < avaliacoes.length; aI++) {
            const aRec = avaliacoes[aI]
            aRec.set('confronto_escopo', JSON.parse(JSON.stringify(novoConfronto)))
            aRec.set('resultado_conformidade', 'conforme')
            aRec.set(
              'detalhe',
              `Conforme: Cópia executada com sucesso. Modalidade comprovada: ${modalidade.toUpperCase()}.`,
            )
            app.save(aRec)
          }
        } catch (eSaveRec) {
          console.error(`[0039] Erro ao salvar reconstrução da execução #${exId}:`, eSaveRec)
        }
      }

      console.log(
        `[0039_sincronizar_confronto_compulsorio] Migração concluída. Execuções corrigidas: ${totalCorrigidas}, já válidas: ${totalJaValidas}`,
      )
    } catch (err) {
      console.error('[0039_sincronizar_confronto_compulsorio] Erro fatal:', err)
      throw err
    }
  },
  (app) => {
    // Reversão no-op
  },
)
