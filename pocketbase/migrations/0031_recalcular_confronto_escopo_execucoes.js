migrate(
  (app) => {
    try {
      console.log(
        '[0031_recalcular_confronto_escopo_execucoes] Iniciando recálculo defensivo do confronto_escopo...',
      )

      // 1. Carregar todas as execuções existentes
      const execs = app.findRecordsByFilter('backup_execucoes', '', '-created', 1000, 0)
      let totalRecalculadas = 0

      for (let i = 0; i < execs.length; i++) {
        const ex = execs[i]
        const exId = ex.id
        const confAntigo = ex.get('confronto_escopo') || {}

        // Verificar se escopo_id está ausente/nulo ou se exigências/comprovado estão vazios
        const escopoIdNull = !confAntigo.escopo_id
        const rotinaId = ex.getString('rotina')

        if (!rotinaId) {
          // Sem rotina vinculada, não há cadeia rotina->plano->escopo para resolver
          continue
        }

        let rotinaRec = null
        try {
          rotinaRec = app.findRecordById('backup_rotinas', rotinaId)
        } catch (eRot) {
          console.error(`[0031] Rotina ${rotinaId} não encontrada:`, eRot)
          continue
        }

        const orgId = rotinaRec.getString('organization') || ex.getString('organization')
        const planoId = rotinaRec.getString('plano')
        let planoRec = null
        let escopoRec = null

        if (planoId) {
          try {
            planoRec = app.findRecordById('backup_planos', planoId)
          } catch (ePl) {
            console.error(`[0031] Plano ${planoId} não encontrado:`, ePl)
          }

          if (planoRec) {
            const escId = planoRec.getString('escopo')
            if (escId) {
              try {
                escopoRec = app.findRecordById('backup_escopo', escId)
              } catch (eEsc) {
                console.error(`[0031] Escopo ${escId} não encontrado:`, eEsc)
              }
            }
          }
        }

        // Fallback por organização se ainda não achou escopo
        if (!escopoRec && orgId) {
          try {
            const escOrg = app.findRecordsByFilter(
              'backup_escopo',
              `organization = '${orgId}' && status = 'ativo'`,
              '+created',
              1,
              0,
            )
            if (escOrg.length > 0) {
              escopoRec = escOrg[0]
            }
          } catch (_) {}
        }

        if (!escopoRec) {
          console.log(
            `[0031] Execução ${exId}: não foi possível localizar escopo ativo para org ${orgId}.`,
          )
          continue
        }

        // Expandir ativos do escopo
        const ativosIds = []
        try {
          const rawAtivos = escopoRec.get('ativos')
          if (Array.isArray(rawAtivos)) {
            for (let aI = 0; aI < rawAtivos.length; aI++) {
              ativosIds.push(String(rawAtivos[aI]))
            }
          } else if (typeof rawAtivos === 'string') {
            try {
              const parsed = JSON.parse(rawAtivos)
              if (Array.isArray(parsed)) {
                for (let aI = 0; aI < parsed.length; aI++) ativosIds.push(String(parsed[aI]))
              } else if (parsed) {
                ativosIds.push(String(parsed))
              }
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
        if (ativosIds.length > 0) {
          for (let aIdx = 0; aIdx < ativosIds.length; aIdx++) {
            try {
              const aRec = app.findRecordById('inventory_assets', ativosIds[aIdx])
              if (aRec) ativosEscopo.push(aRec)
            } catch (_) {}
          }
        }

        // Se ainda vazio, buscar ativos com exigência de backup da organização
        if (ativosEscopo.length === 0 && orgId) {
          try {
            const assetsOrg = app.findRecordsByFilter(
              'inventory_assets',
              `organization = '${orgId}' && status = 'ativo' && (exige_backup_local = true || exige_backup_nuvem = true || exige_backup_replicacao = true)`,
              '+name',
              50,
              0,
            )
            for (let aI = 0; aI < assetsOrg.length; aI++) ativosEscopo.push(assetsOrg[aI])
          } catch (_) {}
        }

        // Identificar modalidade da execução a partir do texto do comprovante / job
        let modalidadeProvada = null
        const rotinaNome = rotinaRec.getString('nome') || ''
        const obsExec = ex.getString('observacao') || ''
        let jobNome = rotinaNome

        // Extrair nome do job da observação se disponível
        const matchObs = obsExec.match(/"([^"]+)"/)
        if (matchObs && matchObs[1]) {
          jobNome = matchObs[1].trim()
        }

        // Buscar assunto da evidência vinculada
        let assuntoEvidencia = ''
        const evidenciaId = ex.getString('evidencia')
        if (evidenciaId) {
          try {
            const evRec = app.findRecordById('backup_evidencias', evidenciaId)
            if (evRec) assuntoEvidencia = evRec.getString('assunto') || ''
          } catch (_) {}
        }

        const textoIdentidade = `${assuntoEvidencia} ${jobNome} ${rotinaNome}`.toLowerCase()
        if (textoIdentidade.includes('backup copy job:') || textoIdentidade.includes('to cloud')) {
          modalidadeProvada = 'nuvem'
        } else if (textoIdentidade.includes('replication job:')) {
          modalidadeProvada = 'replicacao'
        } else if (
          textoIdentidade.includes('backup job:') &&
          !textoIdentidade.includes('copy') &&
          !textoIdentidade.includes('replication')
        ) {
          modalidadeProvada = 'local'
        } else {
          // Fallback para destinos do plano se definido
          modalidadeProvada = 'nuvem'
        }

        // Obter detalhes_vms
        let detalhesVms = ex.get('detalhes_vms')
        if (!Array.isArray(detalhesVms) || detalhesVms.length === 0) {
          detalhesVms = []
        }

        // Montar mapa das VMs e seus status individuais
        const vmsMap = {}
        for (let vI = 0; vI < detalhesVms.length; vI++) {
          const vm = detalhesVms[vI]
          const vmNome = String(vm.nome || '')
            .trim()
            .toUpperCase()
          if (vmNome) {
            vmsMap[vmNome] = vm
          }
        }

        // Normalizador simples
        const normalizar = (s) => (s ? String(s).trim().toUpperCase() : '')

        // Montar exigencias, comprovado e pendencias
        const exigencias = []
        const comprovado = []
        const pendencias = []
        const dataComprovacao =
          ex.getString('data_inicio') || ex.getString('created') || new Date().toISOString()

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

          // Procurar na lista de VMs
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
              // Vincular ativo_id na VM do detalhes_vms
              vm.ativo_id = atId
              vm.fora_escopo = false
              vm.status_escopo = 'coberto'
              break
            }
          }

          const vmPresente = Boolean(vmEncontrada)
          const stVm = vmEncontrada ? String(vmEncontrada.status || '').toLowerCase() : ''
          const vmComSucesso = vmPresente && (stVm === 'success' || stVm === 'sucesso')

          for (let mI = 0; mI < mods.length; mI++) {
            const m = mods[mI]
            if (m === modalidadeProvada && vmComSucesso) {
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
              if (m === modalidadeProvada) {
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
                atendivel_por_outra_rotina: m !== modalidadeProvada,
              })
            }
          }
        }

        // Destinos do plano
        let modalidadesPlano = [modalidadeProvada]
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
          escopo_nome: escopoRec.getString('nome') || 'Base Principal dos Sistemas da Serventia',
          rotina_id: rotinaRec.id,
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
        totalRecalculadas++

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
            app.save(avalRec)
          }
        } catch (eAv) {
          console.error(`[0031] Erro ao atualizar avaliações de ${exId}:`, eAv)
        }
      }

      console.log(
        `[0031_recalcular_confronto_escopo_execucoes] Concluído com sucesso. Total de execuções recalculadas: ${totalRecalculadas}`,
      )
    } catch (err) {
      console.error('[0031_recalcular_confronto_escopo_execucoes] Erro fatal:', err)
      throw err
    }
  },
  (app) => {
    // Reversão no-op
  },
)
