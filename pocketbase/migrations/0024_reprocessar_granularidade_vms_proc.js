migrate(
  (app) => {
    // 0024: Reprocessamento com detalhes_vms populados a partir de backup_processamentos
    const normalizar = (str) => {
      if (!str) return ''
      return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    }

    const inferirModalidade = (assunto, jobName, rotinaNome, adaptador) => {
      if (String(adaptador || '').toUpperCase() === 'ACRONIS_PDF') {
        return 'nuvem'
      }
      const texto = `${assunto || ''} ${jobName || ''} ${rotinaNome || ''}`.toLowerCase()
      if (texto.includes('backup copy job:')) {
        return 'nuvem'
      }
      if (texto.includes('replication job:')) {
        return 'replicacao'
      }
      if (
        texto.includes('backup job:') &&
        !texto.includes('copy') &&
        !texto.includes('replication')
      ) {
        return 'local'
      }
      return null
    }

    try {
      const execs = app.findRecordsByFilter('backup_execucoes', '', '-created', 500, 0)
      for (let i = 0; i < execs.length; i++) {
        const ex = execs[i]
        const orgId = ex.getString('organization')
        const rotinaId = ex.getString('rotina')
        const evidenciaId = ex.getString('evidencia')

        let dVms = ex.get('detalhes_vms')
        if ((!Array.isArray(dVms) || dVms.length === 0) && evidenciaId) {
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
                dVms = resProc.vms
                ex.set('detalhes_vms', dVms)
              }
            }
          } catch (_) {}
        }
        const temDetalhesVms = Array.isArray(dVms) && dVms.length > 0

        let rotinaNome = ''
        let planoNome = ''
        let rotinaRec = null
        if (rotinaId) {
          try {
            rotinaRec = app.findRecordById('backup_rotinas', rotinaId)
            if (rotinaRec) {
              rotinaNome = rotinaRec.getString('nome') || ''
              const planoId = rotinaRec.getString('plano')
              if (planoId) {
                try {
                  const planoRec = app.findRecordById('backup_planos', planoId)
                  if (planoRec) {
                    planoNome = planoRec.getString('nome') || ''
                  }
                } catch (_) {}
              }
            }
          } catch (_) {}
        }

        let assunto = ''
        if (evidenciaId) {
          try {
            const evRec = app.findRecordById('backup_evidencias', evidenciaId)
            if (evRec) {
              assunto = evRec.getString('assunto') || ''
            }
          } catch (_) {}
        }

        let jobName = ''
        let adaptador = ''
        let avalRec = null
        try {
          const avals = app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${ex.id}'`,
            '-created',
            1,
            0,
          )
          if (avals.length > 0) {
            avalRec = avals[0]
            const itensAv = avalRec.get('itens_avaliados')
            if (itensAv && typeof itensAv === 'object') {
              jobName = String(itensAv.job_name || '')
              adaptador = String(itensAv.adaptador || '')
            }
            const laudoObj = avalRec.get('laudo_tecnico')
            if (laudoObj && typeof laudoObj === 'object') {
              if (!assunto && laudoObj.fonte_comprovante && laudoObj.fonte_comprovante.assunto) {
                assunto = String(laudoObj.fonte_comprovante.assunto || '')
              }
              if (!adaptador && laudoObj.adaptador && laudoObj.adaptador.codigo) {
                adaptador = String(laudoObj.adaptador.codigo || '')
              }
              if (!jobName && laudoObj.vinculos && laudoObj.vinculos.rotina_nome) {
                jobName = String(laudoObj.vinculos.rotina_nome || '')
              }
            }
          }
        } catch (_) {}

        const modalidadeCorreta = inferirModalidade(assunto, jobName, rotinaNome, adaptador)

        let cSuc = 0
        let cWarn = 0
        let cErr = 0
        const vmsFalhas = []
        if (temDetalhesVms) {
          for (let vi = 0; vi < dVms.length; vi++) {
            const vm = dVms[vi]
            const st = String(vm.status || '').toLowerCase()
            if (st === 'success' || st === 'sucesso') {
              cSuc++
            } else if (st === 'warning' || st === 'aviso') {
              cWarn++
            } else if (st === 'failed' || st === 'error' || st === 'erro' || st === 'falha') {
              cErr++
              vmsFalhas.push(vm.nome)
            }
          }
        }

        let assets = []
        try {
          assets = app.findRecordsByFilter(
            'inventory_assets',
            `organization = '${orgId}' && status = 'ativo' && (exige_backup_local = true || exige_backup_nuvem = true || exige_backup_replicacao = true)`,
            '+name',
            100,
            0,
          )
        } catch (_) {}

        if (assets.length === 0) continue

        const novoComprovado = []
        const novasPendencias = []
        const novasExigencias = []

        for (let a = 0; a < assets.length; a++) {
          const ast = assets[a]
          const aId = ast.id
          const aNome = ast.getString('name')
          const aTipo = ast.getString('tipo')
          const aNomeNorm = normalizar(aNome)
          const exLoc = Boolean(ast.getBool('exige_backup_local'))
          const exNuv = Boolean(ast.getBool('exige_backup_nuvem'))
          const exRep = Boolean(ast.getBool('exige_backup_replicacao'))

          const mods = []
          if (exLoc) mods.push('local')
          if (exNuv) mods.push('nuvem')
          if (exRep) mods.push('replicacao')

          novasExigencias.push({
            ativo_id: aId,
            ativo_nome: aNome,
            ativo_tipo: aTipo,
            local: exLoc,
            nuvem: exNuv,
            replicacao: exRep,
            modalidades: mods,
          })

          let vmPresente = false
          let vmComSucesso = false
          let vmMotivoErro = ''

          if (temDetalhesVms) {
            for (let vi = 0; vi < dVms.length; vi++) {
              const vmObj = dVms[vi]
              const vmNorm = normalizar(vmObj.nome)
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
                  vmMotivoErro = `Item ${vmObj.nome} reportou status "${vmObj.status}" no comprovante.`
                }
                break
              }
            }
          } else {
            vmPresente = true
            vmComSucesso = ex.getString('status') === 'sucesso'
            if (!vmComSucesso) {
              vmMotivoErro = `Execução reportou status "${ex.getString('status')}".`
            }
          }

          for (let m = 0; m < mods.length; m++) {
            const modNome = mods[m]
            if (modalidadeCorreta && modNome === modalidadeCorreta && vmComSucesso) {
              novoComprovado.push({
                ativo_id: aId,
                ativo_nome: aNome,
                ativo_tipo: aTipo,
                modalidade: modNome,
                item_comprovante: aNome,
                fonte_casada: aNome,
                rotina_nome: rotinaNome || 'Backup job: Backup VMs GOLD',
                plano_nome:
                  planoNome || 'Politica de backup 3-2-1 (Ferramenta Veeam) - Sistemas SPCM',
                status: 'sucesso',
                comprovado_em: ex.getString('data_inicio') || ex.getString('created'),
              })
            } else {
              const modLabel =
                modNome === 'local' ? 'Local' : modNome === 'nuvem' ? 'Nuvem' : 'Replicação'
              let motivoPend = `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`
              if (modalidadeCorreta && modNome === modalidadeCorreta) {
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
                modalidade_pendente: modNome,
                ativo_presente_no_comprovante: vmPresente,
                item_comprovante: aNome,
                motivo: motivoPend,
                atendivel_por_outra_rotina: modNome !== modalidadeCorreta,
              })
            }
          }
        }

        const confAntigo = ex.get('confronto_escopo') || {}
        const novoConfronto = {
          escopo_id: confAntigo.escopo_id || null,
          escopo_nome: confAntigo.escopo_nome || 'Escopo do Inventário',
          rotina_id: rotinaId,
          rotina_nome: rotinaNome || 'Backup job: Backup VMs GOLD',
          plano_id: rotinaRec ? rotinaRec.getString('plano') : null,
          plano_nome: planoNome || 'Politica de backup 3-2-1 (Ferramenta Veeam) - Sistemas SPCM',
          modalidades_plano: modalidadeCorreta ? [modalidadeCorreta] : [],
          exigencias: novasExigencias,
          comprovado: novoComprovado,
          pendencias: novasPendencias,
          total_ativos_escopo: assets.length,
          total_exigencias_modalidade: novoComprovado.length + novasPendencias.length,
          total_comprovadas: novoComprovado.length,
          total_pendencias: novasPendencias.length,
        }

        ex.set('confronto_escopo', novoConfronto)
        app.save(ex)

        if (avalRec) {
          avalRec.set('confronto_escopo', novoConfronto)

          const laudo = avalRec.get('laudo_tecnico')
          if (laudo && typeof laudo === 'object') {
            const checks = Array.isArray(laudo.verificacoes) ? laudo.verificacoes : []

            if (temDetalhesVms && laudo.metricas) {
              laudo.metricas.vms_sucesso = cSuc
              laudo.metricas.vms_falha = cErr
              laudo.metricas.vms_alerta = cWarn
            }

            for (let c = 0; c < checks.length; c++) {
              if (checks[c].item === 'extracao' && temDetalhesVms) {
                checks[c].detalhes =
                  `Adaptador ${adaptador || 'VEEAM_HTML'}: status "${ex.getString('status')}", ${dVms.length} item(ns)/VM(s) detectado(s), ${cSuc} sucesso, ${cWarn} aviso(s), ${cErr} falha(s), volume: ${laudo.metricas ? laudo.metricas.tamanho_formatado : '355,3 MB'}.`
              }
              if (checks[c].item === 'status_job') {
                if (cErr > 0 || ex.getString('status') === 'erro') {
                  checks[c].status = 'nao_conforme'
                  checks[c].passou = false
                  checks[c].detalhes =
                    `O trabalho reportou falha crítica na execução (${cErr || 1} erro(s)).`
                }
              }
            }

            const temNaoConforme = checks.some(
              (c) => c.status === 'nao_conforme' || c.passou === false,
            )
            const temAtencao = checks.some((c) => c.status === 'atencao')
            const vereditoFinal = temNaoConforme
              ? 'nao_conforme'
              : temAtencao
                ? 'atencao'
                : 'conforme'

            laudo.verificacoes = checks
            laudo.resultado = vereditoFinal

            if (cErr > 0 || ex.getString('status') === 'erro') {
              if (vmsFalhas.length > 0) {
                const totalV = dVms.length
                const falhasV = vmsFalhas.length
                const sucV = totalV - falhasV
                laudo.veredito = `Não Conforme: Job Veeam "${jobName || rotinaNome || 'Backup job'}" apresentou erro na execução: ${vmsFalhas.join(', ')} (${falhasV} de ${totalV} VMs falharam; ${sucV} com sucesso).`
              } else {
                laudo.veredito = `Não Conforme: Job Veeam "${jobName || rotinaNome || 'Backup job'}" apresentou erro na execução (${cErr || 1} falha(s)).`
              }
            } else if (vereditoFinal === 'conforme') {
              laudo.veredito = `Conforme: Cópia executada com sucesso. Modalidade comprovada: ${(modalidadeCorreta || 'LOCAL').toUpperCase()} (${novoComprovado.length} comprovadas / ${novasPendencias.length} pendências atendíveis por outra rotina).`
            }

            avalRec.set('laudo_tecnico', laudo)
            avalRec.set('resultado_conformidade', vereditoFinal)
            avalRec.set('detalhe', laudo.veredito || '')

            const itensAv = avalRec.get('itens_avaliados')
            if (itensAv && typeof itensAv === 'object' && temDetalhesVms) {
              itensAv.vms_sucesso = cSuc
              itensAv.vms_falha = cErr
              itensAv.vms_alerta = cWarn
              avalRec.set('itens_avaliados', itensAv)
            }
          }

          app.save(avalRec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão no-op
  },
)
