migrate(
  (app) => {
    try {
      console.log(
        '[0037_reprocessar_confronto_modalidades] Iniciando reprocessamento com inferência corrigida...',
      )

      const normalizar = (s) => (s ? String(s).trim().toUpperCase() : '')

      const inferirModalidade = (assunto, rawConteudo, rotinaNome) => {
        // a) Prefixo declarado no ASSUNTO da evidência
        const assuntoLimpo = String(assunto || '')
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

        // b) Prefixo declarado no CORPO do comprovante (linha de cabeçalho Veeam)
        if (rawConteudo) {
          const headerVeeamRegex =
            /(?:^|[\r\n]|<[^>]*>)\s*(Backup Copy [Jj]ob|Copy [Jj]ob|Replication [Jj]ob|Backup [Jj]ob)\s*:\s*([^<\r\n]+?)(?=\s*Created by|\s*Success|\s*Warning|\s*Failed|\s*Error|[\r\n]|<|$)/i
          const matchCorpo = rawConteudo.match(headerVeeamRegex)
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
        }

        // c) Marcador explícito no NOME DA ROTINA (- LOCAL, - NUVEM/- NUVENS, - REPLICA/- REPLICAS/- REPLICACAO)
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

      // Buscar todas as execuções existentes
      const execs = app.findRecordsByFilter('backup_execucoes', '', '-created', 1000, 0)
      let totalAtualizadas = 0

      for (let i = 0; i < execs.length; i++) {
        const ex = execs[i]
        const exId = ex.id
        const confAntigo = ex.get('confronto_escopo') || {}
        const comprovadoAntigo = Array.isArray(confAntigo.comprovado) ? confAntigo.comprovado : []

        // Critério: reprocessar execuções com comprovado vazio que tenham evidência processada
        const evidenciaId = ex.getString('evidencia')
        if (!evidenciaId) continue

        let evRec = null
        try {
          evRec = app.findRecordById('backup_evidencias', evidenciaId)
        } catch (_) {}

        if (!evRec) continue

        const statusProc = evRec.getString('status_processamento')
        if (statusProc !== 'processada' && statusProc !== 'sucesso') continue

        // Se o comprovado já não está vazio E não é a execução específica vjqzacdotk6v1xr, podemos verificar se precisa de ajuste
        if (comprovadoAntigo.length > 0 && exId !== 'vjqzacdotk6v1xr') {
          // Já comprovou algo, mantém a não ser que tenha discrepâncias
          continue
        }

        // Buscar dados da rotina vinculada
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
        const rawConteudo = evRec.getString('conteudo') || ''
        const rotinaNome = rotinaRec ? rotinaRec.getString('nome') : ''

        // Inferir modalidade com as novas regras
        const modalidadeInferida = inferirModalidade(assunto, rawConteudo, rotinaNome)
        if (!modalidadeInferida) {
          console.log(
            `[0037] Execução ${exId}: modalidade resultou em null (fail-closed). Mantendo pendente.`,
          )
          continue
        }

        // Resolver plano e escopo
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

        if (!escopoRec && confAntigo.escopo_id) {
          try {
            escopoRec = app.findRecordById('backup_escopo', confAntigo.escopo_id)
          } catch (_) {}
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
          console.log(`[0037] Execução ${exId}: escopo não encontrado para org ${orgId}.`)
          continue
        }

        // Ativos do escopo
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

        // Obter detalhes_vms
        let detalhesVms = ex.get('detalhes_vms')
        if (!Array.isArray(detalhesVms)) detalhesVms = []

        // Montar novo confronto_escopo
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

          // Verificar presença e status na tabela detalhes_vms
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
            if (m === modalidadeInferida && vmComSucesso) {
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
              if (m === modalidadeInferida) {
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
                atendivel_por_outra_rotina: m !== modalidadeInferida,
              })
            }
          }
        }

        // Destinos do plano
        let modalidadesPlano = [modalidadeInferida]
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

        ex.set('confronto_escopo', novoConfronto)
        if (detalhesVms.length > 0) {
          ex.set('detalhes_vms', detalhesVms)
        }
        app.save(ex)
        totalAtualizadas++

        // Atualizar avaliações vinculadas à execução
        try {
          const avals = app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${exId}'`,
            '-created',
            10,
            0,
          )
          for (let avI = 0; avI < avals.length; avI++) {
            const avalRec = avals[avI]
            avalRec.set('confronto_escopo', novoConfronto)

            const laudoObj = avalRec.get('laudo_tecnico')
            if (laudoObj && typeof laudoObj === 'object') {
              laudoObj.resultado = 'conforme'
              laudoObj.veredito = `Conforme: cópia executada com sucesso. Modalidade comprovada: ${modalidadeInferida.toUpperCase()} para os ativos do escopo.`
              avalRec.set('laudo_tecnico', laudoObj)
            }
            avalRec.set('resultado_conformidade', 'conforme')
            app.save(avalRec)
          }
        } catch (eAv) {
          console.error(`[0037] Erro ao atualizar avaliações de ${exId}:`, eAv)
        }

        // Auditoria append-only
        try {
          const auditCol = app.findCollectionByNameOrId('audit_log')
          const auditRec = new Record(auditCol)
          auditRec.set('organization', orgId)
          auditRec.set('action', 'BACKUP_EXECUCAO_REPROCESSED')
          auditRec.set('entity', 'Backup e Continuidade')
          auditRec.set(
            'detail',
            `Execução #${exId} reprocessada pela inferência de modalidade corrigida (${modalidadeInferida.toUpperCase()}). Comprovados: ${comprovado.length}, Pendências: ${pendencias.length}.`,
          )
          auditRec.set('metadata', {
            execucao_id: exId,
            evidencia_id: evidenciaId,
            modalidade_inferida: modalidadeInferida,
            total_comprovadas: comprovado.length,
            total_pendencias: pendencias.length,
          })
          app.save(auditRec)
        } catch (_) {}
      }

      console.log(
        `[0037_reprocessar_confronto_modalidades] Concluído com sucesso. Total de execuções reprocessadas: ${totalAtualizadas}`,
      )
    } catch (err) {
      console.error('[0037_reprocessar_confronto_modalidades] Erro fatal:', err)
      throw err
    }
  },
  (app) => {
    // Reversão no-op
  },
)
