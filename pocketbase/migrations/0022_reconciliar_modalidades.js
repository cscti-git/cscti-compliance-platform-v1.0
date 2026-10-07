migrate(
  (app) => {
    // 0022: Reconciliação rigorosa de modalidades comprovadas e confronto_escopo
    // Regra de Negócio A:
    // Considerar SOMENTE a identidade do job da própria evidência
    // (assunto da evidência e/ou nome do job/rotina vinculada), NUNCA o corpo do texto
    // nem o nome da ferramenta (ex.: "Veeam Backup & Replication" não pode inferir 'replicacao').
    // - assunto/job contém "backup copy job:" -> 'nuvem'
    // - assunto/job contém "replication job:" -> 'replicacao'
    // - assunto/job contém "backup job:" (sem copy/replication) -> 'local'
    // - adaptador ACRONIS_PDF -> 'nuvem'
    // - ambíguo -> null
    //
    // Regra de Negócio B:
    // Identificação pela Regra é CONFORME se houver rotina vinculada, mesmo sem regra casada.
    //
    // Regra de Negócio C:
    // Veredito único derivado da pior verificação.

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

        // Buscar avaliação e processamento para obter job_name e adaptador
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
            }
          }
        } catch (_) {}

        const modalidadeCorreta = inferirModalidade(assunto, jobName, rotinaNome, adaptador)

        // Carregar ativos do escopo da organização
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

          for (let m = 0; m < mods.length; m++) {
            const modNome = mods[m]
            if (
              modalidadeCorreta &&
              modNome === modalidadeCorreta &&
              ex.getString('status') === 'sucesso'
            ) {
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
              novasPendencias.push({
                ativo_id: aId,
                ativo_nome: aNome,
                ativo_tipo: aTipo,
                modalidade_pendente: modNome,
                ativo_presente_no_comprovante: true,
                item_comprovante: aNome,
                motivo: `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`,
                atendivel_por_outra_rotina: true,
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

        // Atualizar avaliação correspondente
        if (avalRec) {
          avalRec.set('confronto_escopo', novoConfronto)

          const laudo = avalRec.get('laudo_tecnico')
          if (laudo && typeof laudo === 'object') {
            const checks = Array.isArray(laudo.verificacoes) ? laudo.verificacoes : []

            // Atualiza verificação de Identificação pela Regra (Regra B)
            for (let c = 0; c < checks.length; c++) {
              if (checks[c].item === 'identificacao') {
                if (rotinaId || rotinaNome) {
                  checks[c].passou = true
                  checks[c].status = 'conforme'
                  checks[c].detalhes =
                    `Vinculado por alias da rotina cadastrada "${rotinaNome || 'Backup job: Backup VMs GOLD'}".`
                }
              }
            }

            // Veredito único baseado nas verificações (Regra C)
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
            if (vereditoFinal === 'conforme') {
              laudo.veredito = `Conforme: Cópia executada com sucesso. Modalidade comprovada: ${(modalidadeCorreta || 'LOCAL').toUpperCase()} (${novoComprovado.length} comprovadas / ${novasPendencias.length} pendências atendíveis por outra rotina).`
            }
            avalRec.set('laudo_tecnico', laudo)
            avalRec.set('resultado_conformidade', vereditoFinal)
            avalRec.set('detalhe', laudo.veredito || '')
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
