/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0043: Reconciliar confronto_escopo e ocorrência factual para execuções com falha parcial/total
 * Especificamente para a execução 7w6c8fppt342vep (e rotinas similares Veeam), garantindo:
 * 1) confronto_escopo persistido tanto em backup_execucoes quanto em backup_avaliacoes contendo:
 *    - comprovado: VMs com sucesso (ex: SPCM-REGWIN, SPCM-TDePJ) com modalidade 'nuvem'
 *    - falhas: VMs com erro/falha (ex: SPCM-ORION, SPCM-PROTESTO) com {ativo_id, modalidade, rotina, job_nome, data_execucao, status, motivo}
 * 2) Ocorrência qp42ayeh791xbq1 (ou vinculada à execução) atualizada com texto factual:
 *    "Backup com falha: a rotina 'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS' (modalidade Nuvem) executou em 08/10/2026 15:32 e 2 das 4 VMs NÃO receberam backup: SPCM-ORION, SPCM-PROTESTO. VMs com sucesso: SPCM-REGWIN, SPCM-TDePJ."
 */
migrate(
  (app) => {
    console.log('[0043_reconciliar_falhas_confronto] Iniciando reconciliação...')

    const pad2 = (n) => (n < 10 ? '0' + n : String(n))
    const formatarDataSp = (isoStr) => {
      try {
        const dObj = new Date(isoStr)
        const ano = dObj.getUTCFullYear()
        const mes = dObj.getUTCMonth()
        const dia = dObj.getUTCDate()
        const hora = dObj.getUTCHours()
        const min = dObj.getUTCMinutes()
        const dSp = new Date(Date.UTC(ano, mes, dia, hora - 3, min))
        return `${pad2(dSp.getUTCDate())}/${pad2(dSp.getUTCMonth() + 1)}/${dSp.getUTCFullYear()} ${pad2(dSp.getUTCHours())}:${pad2(dSp.getUTCMinutes())}`
      } catch (_) {
        return isoStr
      }
    }

    const normalizarString = (str) => {
      if (!str) return ''
      return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    }

    const normalizarCompacto = (str) => {
      return normalizarString(str).replace(/[^a-z0-9]/g, '')
    }

    // Carregar ativos exigidos para mapeamento de IDs
    const assetsMap = {}
    try {
      const allAssets = app.findRecordsByFilter('inventory_assets', '', '+name', 1000, 0)
      for (let i = 0; i < allAssets.length; i++) {
        const a = allAssets[i]
        assetsMap[a.id] = a
        const norm = normalizarCompacto(a.getString('name'))
        if (norm) {
          assetsMap[norm] = a
        }
      }
    } catch (errAssets) {
      console.error('[0043] Erro ao carregar inventory_assets:', errAssets?.message || errAssets)
    }

    // Processar execuções que possuem detalhes_vms
    try {
      const execs = app.findRecordsByFilter('backup_execucoes', '', '-created', 500, 0)
      for (let i = 0; i < execs.length; i++) {
        const ex = execs[i]
        const dVmsRaw = ex.get('detalhes_vms')
        let dVms = []
        if (Array.isArray(dVmsRaw)) {
          dVms = dVmsRaw
        } else if (typeof dVmsRaw === 'string' && dVmsRaw.trim()) {
          try {
            dVms = JSON.parse(dVmsRaw)
          } catch (_) {}
        }

        if (!Array.isArray(dVms) || dVms.length === 0) continue

        // Identificar se há VMs com falha e com sucesso
        const vmsFalhas = []
        const vmsSucesso = []
        for (let v = 0; v < dVms.length; v++) {
          const vm = dVms[v]
          const st = String(vm.status || '').toLowerCase()
          const nome = vm.nome || `Item ${v + 1}`
          if (st === 'failed' || st === 'error' || st === 'erro' || st === 'falha') {
            vmsFalhas.push(vm)
          } else if (st === 'success' || st === 'sucesso') {
            vmsSucesso.push(vm)
          }
        }

        // Buscar rotina e plano para determinar a modalidade correta
        let rotinaRec = null
        let planoRec = null
        let modalidadeEx = 'nuvem'
        const rotinaId = ex.getString('rotina')
        if (rotinaId) {
          try {
            rotinaRec = app.findRecordById('backup_rotinas', rotinaId)
            const pId = rotinaRec.getString('plano')
            if (pId) {
              planoRec = app.findRecordById('backup_planos', pId)
              const dests = planoRec.get('destino')
              if (Array.isArray(dests) && dests.length > 0) {
                modalidadeEx = String(dests[0]).toLowerCase()
              }
            }
          } catch (_) {}
        }

        const rotinaNome = rotinaRec
          ? rotinaRec.getString('nome')
          : ex.getString('rotina_nome') || 'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS'
        const dataExecIso =
          ex.getString('data_inicio') || ex.getString('created') || new Date().toISOString()
        const dataExecSp = formatarDataSp(dataExecIso)

        // Montar arrays de comprovado e de falhas
        const comprovados = []
        const falhas = []

        // Mapear VMs com sucesso -> comprovado
        for (let s = 0; s < vmsSucesso.length; s++) {
          const vm = vmsSucesso[s]
          const norm = normalizarCompacto(vm.nome)
          const assetRec = assetsMap[norm]
          comprovados.push({
            ativo_id: assetRec ? assetRec.id : null,
            ativo_nome: assetRec ? assetRec.getString('name') : vm.nome,
            ativo_tipo: assetRec ? assetRec.getString('tipo') : 'servidor_virtualizado',
            modalidade: modalidadeEx,
            item_comprovante: vm.nome,
            fonte_casada: vm.nome,
            rotina_nome: rotinaNome,
            job_nome: rotinaNome,
            plano_nome: planoRec ? planoRec.getString('nome') : null,
            status: 'sucesso',
            comprovado_em: dataExecIso,
          })
        }

        // Mapear VMs com falha -> falhas
        for (let f = 0; f < vmsFalhas.length; f++) {
          const vm = vmsFalhas[f]
          const norm = normalizarCompacto(vm.nome)
          const assetRec = assetsMap[norm]
          falhas.push({
            ativo_id: assetRec ? assetRec.id : null,
            ativo_nome: assetRec ? assetRec.getString('name') : vm.nome,
            ativo_tipo: assetRec ? assetRec.getString('tipo') : 'servidor_virtualizado',
            modalidade: modalidadeEx,
            rotina: rotinaId || null,
            rotina_nome: rotinaNome,
            job_nome: rotinaNome,
            data_execucao: dataExecIso,
            status: 'erro',
            motivo: `VM ${vm.nome} constou com status "${vm.status || 'Failed'}" na execução. Modalidade não homologada.`,
          })
        }

        // Ler ou criar estrutura de confronto_escopo existente
        let confEscopoObj = {}
        const confRaw = ex.get('confronto_escopo')
        if (confRaw && typeof confRaw === 'object' && !Array.isArray(confRaw)) {
          confEscopoObj = JSON.parse(JSON.stringify(confRaw))
        } else if (typeof confRaw === 'string' && confRaw.trim()) {
          try {
            confEscopoObj = JSON.parse(confRaw)
          } catch (_) {}
        }

        confEscopoObj.rotina_id = rotinaId || confEscopoObj.rotina_id || null
        confEscopoObj.rotina_nome = rotinaNome
        confEscopoObj.job_nome = rotinaNome
        confEscopoObj.modalidades_plano = [modalidadeEx]
        confEscopoObj.comprovado = comprovados
        confEscopoObj.falhas = falhas
        confEscopoObj.total_comprovadas = comprovados.length
        confEscopoObj.total_falhas = falhas.length

        // Atualizar na execução
        try {
          ex.set('confronto_escopo', confEscopoObj)
          app.save(ex)
          console.log(
            `[0043] Execução #${ex.id} atualizada com ${comprovados.length} comprovados e ${falhas.length} falhas.`,
          )
        } catch (errSaveEx) {
          console.error(
            `[0043] Erro ao salvar execução #${ex.id}:`,
            errSaveEx?.message || errSaveEx,
          )
        }

        // Sincronizar na avaliação vinculada
        try {
          const avals = app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${ex.id}'`,
            '-created',
            1,
            0,
          )
          if (avals.length > 0) {
            const av = avals[0]
            av.set('confronto_escopo', confEscopoObj)
            app.save(av)
            console.log(`[0043] Avaliação #${av.id} sincronizada com sucesso.`)
          }
        } catch (errSaveAv) {
          console.error(
            `[0043] Erro ao salvar avaliação da execução #${ex.id}:`,
            errSaveAv?.message || errSaveAv,
          )
        }

        // Atualizar ocorrência aberta relacionada com texto factual
        if (vmsFalhas.length > 0) {
          try {
            const ocs = app.findRecordsByFilter(
              'backup_ocorrencias',
              `execucao = '${ex.id}' || evidencia = '${ex.getString('evidencia')}'`,
              '-created',
              5,
              0,
            )
            for (let oi = 0; oi < ocs.length; oi++) {
              const oc = ocs[oi]
              const totalVms = vmsFalhas.length + vmsSucesso.length
              const modalidadeLabel =
                modalidadeEx === 'nuvem'
                  ? 'Nuvem'
                  : modalidadeEx === 'replicacao'
                    ? 'Replicação'
                    : 'Local'
              const vmsFalhasStr = vmsFalhas.map((v) => v.nome).join(', ')
              const vmsSucessoStr = vmsSucesso.map((v) => v.nome).join(', ')

              let descFactual = `Backup com falha: a rotina '${rotinaNome}' (modalidade ${modalidadeLabel}) executou em ${dataExecSp} e ${vmsFalhas.length} das ${totalVms} VMs NÃO receberam backup: ${vmsFalhasStr}.`
              if (vmsSucessoStr) {
                descFactual += ` VMs com sucesso: ${vmsSucessoStr}.`
              }

              oc.set('descricao', descFactual)
              oc.set('severidade', 'alta')
              app.save(oc)
              console.log(`[0043] Ocorrência #${oc.id} atualizada com descrição factual.`)
            }
          } catch (errOc) {
            console.error(
              `[0043] Erro ao atualizar ocorrências da execução #${ex.id}:`,
              errOc?.message || errOc,
            )
          }
        }
      }
    } catch (errExecs) {
      console.error('[0043] Erro geral ao processar execuções:', errExecs?.message || errExecs)
    }

    console.log('[0043_reconciliar_falhas_confronto] Migração concluída.')
  },
  (app) => {},
)
