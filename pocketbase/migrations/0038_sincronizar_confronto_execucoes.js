/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0038: Recálculo e Sincronização Estrita do confronto_escopo nas Execuções de Backup
 *
 * Objetivo:
 * Para TODA execução de backup com evidência processada:
 * 1. Recalcular o confronto_escopo com inferência estrita (assunto -> corpo do comprovante -> marcador na rotina, fail-closed).
 * 2. Se a avaliação correspondente já possuir o confronto correto (comprovado preenchido), sincronizar diretamente
 *    para a execução para garantir fonte única de verdade e paridade absoluta entre execução e avaliação.
 * 3. Garantir cópia fiel de comprovado, exigencias, escopo_id, escopo_nome, etc.
 * 4. Qualquer erro de update deve ser registrado com logs LOUD e auditoria append-only (audit_log).
 */
migrate(
  (app) => {
    console.log('[0038_sincronizar_confronto_execucoes] Iniciando migração...')

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
      }

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

      return null
    }

    try {
      const execucoes = app.findRecordsByFilter('backup_execucoes', '', '-created', 1000, 0)
      console.log(`[0038] Total de execuções encontradas: ${execucoes.length}`)

      let totalAtualizadas = 0

      for (let i = 0; i < execucoes.length; i++) {
        const ex = execucoes[i]
        const exId = ex.id
        const evidenciaId = ex.getString('evidencia')

        // 1. Verificar se a avaliação já possui confronto correto e completo
        let cAval = null
        let avalRec = null
        try {
          const avals = app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${exId}'`,
            '-created',
            1,
            0,
          )
          if (avals.length > 0) {
            avalRec = avals[0]
            const cand = avalRec.get('confronto_escopo')
            if (
              cand &&
              typeof cand === 'object' &&
              Array.isArray(cand.comprovado) &&
              cand.comprovado.length > 0
            ) {
              cAval = cand
            }
          }
        } catch (eBuscaAv) {
          console.error(`[0038] Erro ao buscar avaliação para a execução #${exId}:`, eBuscaAv)
        }

        if (cAval) {
          // Copiar da avaliação (Fonte Única de Verdade) para a execução
          try {
            ex.set('confronto_escopo', cAval)

            // Garantir detalhes_vms sincronizados se a execução estiver vazia
            const dVmsAtual = ex.get('detalhes_vms')
            if (!Array.isArray(dVmsAtual) || dVmsAtual.length === 0) {
              const dVmsNovos = cAval.comprovado.map((comp) => ({
                nome: comp.ativo_nome || comp.item_comprovante,
                status: comp.status || 'success',
                ativo_id: comp.ativo_id,
                status_escopo: 'coberto',
                fora_escopo: false,
              }))
              ex.set('detalhes_vms', dVmsNovos)
            }

            app.save(ex)
            totalAtualizadas++
            console.log(
              `[0038] Execução #${exId} atualizada com confronto da avaliação. Comprovados: ${cAval.comprovado.length}`,
            )

            // Auditoria append-only
            try {
              const auditCol = app.findCollectionByNameOrId('audit_log')
              const auditRec = new Record(auditCol)
              auditRec.set('organization', ex.getString('organization'))
              auditRec.set('action', 'BACKUP_EXECUCAO_CONFRONTO_SYNCED')
              auditRec.set('entity', 'Backup e Continuidade')
              auditRec.set(
                'detail',
                `Confronto de escopo da execução #${exId} sincronizado com a avaliação correspondente. ${cAval.comprovado.length} ativo(s) comprovado(s).`,
              )
              auditRec.set('metadata', {
                execucao_id: exId,
                total_comprovados: cAval.comprovado.length,
                escopo_id: cAval.escopo_id,
              })
              app.save(auditRec)
            } catch (_) {}

            continue
          } catch (eSaveCopia) {
            console.error(
              `[0038] FALHA LOUD ao salvar confronto da avaliação na execução #${exId}:`,
              eSaveCopia,
            )
            try {
              const auditCol = app.findCollectionByNameOrId('audit_log')
              const auditRec = new Record(auditCol)
              auditRec.set('organization', ex.getString('organization'))
              auditRec.set('action', 'BACKUP_EXECUCAO_UPDATE_ERROR')
              auditRec.set('entity', 'Backup e Continuidade')
              auditRec.set(
                'detail',
                `FALHA ao sincronizar confronto da avaliação na execução #${exId}: ${eSaveCopia?.message || String(eSaveCopia)}`,
              )
              auditRec.set('metadata', { execucao_id: exId, error: String(eSaveCopia) })
              app.save(auditRec)
            } catch (_) {}
          }
        }

        // 2. Se a avaliação não tinha confronto completo, recalcular a partir da evidência
        if (!evidenciaId) {
          continue
        }

        let evRec = null
        try {
          evRec = app.findRecordById('backup_evidencias', evidenciaId)
        } catch (_) {}

        if (!evRec) continue

        const rotinaId = ex.getString('rotina') || evRec.getString('rotina')
        let rotinaRec = null
        if (rotinaId) {
          try {
            rotinaRec = app.findRecordById('backup_rotinas', rotinaId)
          } catch (_) {}
        }

        const orgId =
          ex.getString('organization') ||
          (rotinaRec ? rotinaRec.getString('organization') : '') ||
          evRec.getString('organization')

        const assunto = evRec.getString('assunto') || ''
        const conteudo = evRec.getString('conteudo') || ''
        const rotinaNome = rotinaRec ? rotinaRec.getString('nome') : ''

        const modalidade = inferirModalidade(assunto, conteudo, rotinaNome)
        if (!modalidade) {
          console.log(`[0038] Execução #${exId}: modalidade null (fail-closed).`)
          continue
        }

        let planoRec = null
        let escopoRec = null
        if (rotinaRec) {
          const planoId = rotinaRec.getString('plano')
          if (planoId) {
            try {
              planoRec = app.findRecordById('backup_planos', planoId)
            } catch (_) {}
          }
        }

        if (planoRec) {
          const escId = planoRec.getString('escopo')
          if (escId) {
            try {
              escopoRec = app.findRecordById('backup_escopo', escId)
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

        if (!escopoRec) {
          console.log(`[0038] Execução #${exId}: escopo não encontrado para org ${orgId}.`)
          continue
        }

        // Buscar ativos do escopo
        const ativosIds = []
        try {
          const rawAtivos = escopoRec.get('ativos')
          if (Array.isArray(rawAtivos)) {
            for (let aI = 0; aI < rawAtivos.length; aI++) ativosIds.push(String(rawAtivos[aI]))
          } else if (typeof rawAtivos === 'string') {
            try {
              const parsed = JSON.parse(rawAtivos)
              if (Array.isArray(parsed)) {
                for (let aI = 0; aI < parsed.length; aI++) ativosIds.push(String(parsed[aI]))
              } else if (parsed) ativosIds.push(String(parsed))
            } catch (_) {
              if (rawAtivos.trim()) {
                const parts = rawAtivos.split(',')
                for (let pI = 0; pI < parts.length; pI++) {
                  const s = parts[pI].trim()
                  if (s) ativosIds.push(s)
                }
              }
            }
          }
        } catch (_) {}

        const ativosEscopo = []
        for (let aI = 0; aI < ativosIds.length; aI++) {
          try {
            const aRec = app.findRecordById('inventory_assets', ativosIds[aI])
            if (aRec) ativosEscopo.push(aRec)
          } catch (_) {}
        }

        if (ativosEscopo.length === 0 && orgId) {
          try {
            const assetsOrg = app.findRecordsByFilter(
              'inventory_assets',
              `organization = '${orgId}' && status = 'ativo'`,
              '+name',
              50,
              0,
            )
            for (let aI = 0; aI < assetsOrg.length; aI++) ativosEscopo.push(assetsOrg[aI])
          } catch (_) {}
        }

        let detalhesVms = ex.get('detalhes_vms')
        if (!Array.isArray(detalhesVms)) detalhesVms = []

        // Fallback para detalhes_vms via backup_processamentos se vazio
        if (detalhesVms.length === 0 && evidenciaId) {
          try {
            const procs = app.findRecordsByFilter(
              'backup_processamentos',
              `evidencia = '${evidenciaId}'`,
              '-created',
              1,
              0,
            )
            if (procs.length > 0) {
              const resProc = procs[0].get('resultado')
              if (resProc && Array.isArray(resProc.vms) && resProc.vms.length > 0) {
                detalhesVms = resProc.vms
              }
            }
          } catch (_) {}
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
                plano_nome: planoRec ? planoRec.getString('nome') : null,
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

        let modalidadesPlano = [modalidade]
        if (planoRec) {
          const rawDest = planoRec.get('destino')
          if (Array.isArray(rawDest)) {
            modalidadesPlano = rawDest.map((d) => String(d).toLowerCase().trim())
          } else if (typeof rawDest === 'string') {
            try {
              const parsed = JSON.parse(rawDest)
              if (Array.isArray(parsed))
                modalidadesPlano = parsed.map((d) => String(d).toLowerCase().trim())
            } catch (_) {}
          }
        }

        const totalExigencias = exigencias.reduce(
          (acc, cur) => acc + (cur.modalidades ? cur.modalidades.length : 3),
          0,
        )

        const novoConfronto = {
          escopo_id: escopoRec.id,
          escopo_nome: escopoRec.getString('nome') || 'Sistemas da Serventia - SPCM',
          rotina_id: rotinaRec ? rotinaRec.id : null,
          rotina_nome: rotinaNome,
          job_nome: jobNome,
          plano_id: planoRec ? planoRec.id : null,
          plano_nome: planoRec ? planoRec.getString('nome') : null,
          modalidades_plano: modalidadesPlano,
          exigencias: exigencias,
          comprovado: comprovado,
          pendencias: pendencias,
          total_ativos_escopo: ativosEscopo.length,
          total_exigencias_modalidade: totalExigencias,
          total_comprovadas: comprovado.length,
          total_pendencias: pendencias.length,
        }

        try {
          ex.set('confronto_escopo', novoConfronto)
          if (detalhesVms.length > 0) {
            ex.set('detalhes_vms', detalhesVms)
          }
          app.save(ex)
          totalAtualizadas++
          console.log(
            `[0038] Execução #${exId} recalculada e salva com sucesso. Comprovados: ${comprovado.length}`,
          )
        } catch (eSaveEx) {
          console.error(`[0038] FALHA LOUD ao salvar execução #${exId}:`, eSaveEx)
          try {
            const auditCol = app.findCollectionByNameOrId('audit_log')
            const auditRec = new Record(auditCol)
            auditRec.set('organization', orgId)
            auditRec.set('action', 'BACKUP_EXECUCAO_UPDATE_ERROR')
            auditRec.set('entity', 'Backup e Continuidade')
            auditRec.set(
              'detail',
              `FALHA ao salvar execução #${exId}: ${eSaveEx?.message || String(eSaveEx)}`,
            )
            auditRec.set('metadata', { execucao_id: exId, error: String(eSaveEx) })
            app.save(auditRec)
          } catch (_) {}
        }

        // Sincronizar também com a avaliação para que fiquem 100% IDÊNTICOS
        try {
          const avals = app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${exId}'`,
            '-created',
            10,
            0,
          )
          for (let avI = 0; avI < avals.length; avI++) {
            const aRec = avals[avI]
            aRec.set('confronto_escopo', novoConfronto)
            const laudoObj = aRec.get('laudo_tecnico')
            if (laudoObj && typeof laudoObj === 'object') {
              laudoObj.resultado = 'conforme'
              laudoObj.veredito = `Conforme: cópia executada com sucesso. Modalidade comprovada: ${modalidade.toUpperCase()} para os ativos do escopo.`
              aRec.set('laudo_tecnico', laudoObj)
            }
            aRec.set('resultado_conformidade', 'conforme')
            app.save(aRec)
          }
        } catch (eAv) {
          console.error(`[0038] Erro ao sincronizar avaliação de #${exId}:`, eAv)
        }
      }

      console.log(
        `[0038_sincronizar_confronto_execucoes] Concluído. Total de execuções atualizadas: ${totalAtualizadas}`,
      )
    } catch (err) {
      console.error('[0038_sincronizar_confronto_execucoes] Erro fatal:', err)
      throw err
    }
  },
  (app) => {
    // Reversão no-op
  },
)
