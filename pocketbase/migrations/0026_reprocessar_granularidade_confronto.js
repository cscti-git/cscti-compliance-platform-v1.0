migrate(
  (app) => {
    // 0026: Reconciliação cirúrgica de granularidade de VMs no confronto
    // Garante que detalhes_vms estejam salvos em backup_execucoes e que confronto_escopo
    // reflita com precisão o status individual de cada VM.
    const normalizar = (str) => {
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

        // 1. Obter detalhes_vms (com fallback de backup_processamentos)
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

        if (!jobName) {
          const obs = ex.getString('observacao') || ''
          const mObs = obs.match(/"([^"]+)"/)
          if (mObs && mObs[1]) {
            jobName = mObs[1].trim()
          }
        }

        const modalidadeCorreta = inferirModalidade(assunto, jobName, rotinaNome, adaptador)

        let assets = []
        try {
          assets = app.findRecordsByFilter(
            'inventory_assets',
            `organization = '${orgId}' && status = 'ativo' && (exige_backup_local = true || exige_backup_nuvem = true || exige_backup_replicacao = true)`,
            '+name',
            200,
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
              if (!vmNorm) continue

              const bateu =
                vmNorm === aNomeNorm ||
                (aNomeNorm && vmNorm.includes(aNomeNorm)) ||
                (aNomeNorm && aNomeNorm.includes(vmNorm))

              if (bateu) {
                vmPresente = true
                const st = String(vmObj.status || '').toLowerCase()
                if (st === 'success' || st === 'sucesso') {
                  vmComSucesso = true
                } else {
                  vmComSucesso = false
                  vmMotivoErro = `VM ${vmObj.nome} constou com status "${vmObj.status}" na execução do job '${jobName || rotinaNome}'.`
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
                rotina_nome: rotinaNome || null,
                job_nome: jobName || rotinaNome || null,
                plano_nome: planoNome || null,
                status: 'sucesso',
                comprovado_em:
                  ex.getString('data_inicio') ||
                  ex.getString('data_fim') ||
                  ex.getString('created'),
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
                    `VM ${aNome} reportou falha na execução. Modalidade não homologada.`
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
                job_nome: jobName || rotinaNome || null,
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
          rotina_nome: rotinaNome || null,
          job_nome: jobName || rotinaNome || null,
          plano_id: rotinaRec ? rotinaRec.getString('plano') : null,
          plano_nome: planoNome || null,
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
          app.save(avalRec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão no-op
  },
)
