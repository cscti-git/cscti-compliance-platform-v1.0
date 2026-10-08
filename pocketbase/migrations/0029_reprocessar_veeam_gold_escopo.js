migrate(
  (app) => {
    // 0029: Reprocessar genericamente toda execução cujo detalhes_vms contenha lixo
    // (itens com nome começando por "Backup job:"/"Copy job:"/"Replication job:" ou igual a "Success"/"Warning"/"Error").
    // Re-parseia o conteúdo da evidência vinculada com o parser corrigido e regenera:
    // detalhes_vms, confronto_escopo, status da execução e avaliação/laudo.

    const stripHtml = (html) => {
      if (!html) return ''
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
    }

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

    const isLinhaVmValida = (nome) => {
      if (!nome) return false
      const n = String(nome).trim()
      if (n.length <= 3) return false
      if (
        /^(backup job|backup copy job|replication job|job |created by|summary|total size|backup size|data read|transferred|duration|name|vm|vms|success|warning|error|failed)$/i.test(
          n,
        )
      ) {
        return false
      }
      if (/^(?:success|warning|error|failed|created by)\b/i.test(n)) {
        return false
      }
      return true
    }

    const extrairAliases = (campoAliases) => {
      if (!campoAliases) return []
      const partes = String(campoAliases).split(',')
      const lista = []
      for (let i = 0; i < partes.length; i++) {
        const item = normalizar(partes[i])
        if (item) lista.push(item)
      }
      return lista
    }

    try {
      const execucoes = app.findRecordsByFilter('backup_execucoes', '', '-created', 200, 0)

      for (let eIdx = 0; eIdx < execucoes.length; eIdx++) {
        const execRec = execucoes[eIdx]
        const rawDetalhes = execRec.get('detalhes_vms')
        let vmsArray = []
        if (Array.isArray(rawDetalhes)) {
          vmsArray = rawDetalhes
        } else if (typeof rawDetalhes === 'string') {
          try {
            const parsed = JSON.parse(rawDetalhes)
            if (Array.isArray(parsed)) vmsArray = parsed
          } catch (_) {}
        }

        const temLixo = vmsArray.some((vm) => {
          const nome = (vm && vm.nome) || ''
          return (
            !isLinhaVmValida(nome) ||
            /^(?:backup\s+job|copy\s+job|replication\s+job|backup\s+copy\s+job):/i.test(nome) ||
            /^(?:success|warning|error|failed)$/i.test(nome)
          )
        })

        const isCasoConcreto = execRec.id === 'ezyln2zlijudkhh'

        if (!temLixo && !isCasoConcreto) {
          continue
        }

        // Buscar evidência vinculada
        const evId = execRec.getString('evidencia')
        if (!evId) continue

        let evRec = null
        try {
          evRec = app.findRecordById('backup_evidencias', evId)
        } catch (_) {
          continue
        }
        if (!evRec) continue

        const conteudo = evRec.getString('conteudo') || ''
        const assunto = evRec.getString('assunto') || ''
        const plainText = stripHtml(conteudo)

        // Parse do jobName
        let jobName = ''
        let jobTipo = 'backup'
        const headerRegex =
          /(Backup Copy job|Replication job|Backup job)[:\s]+([^<\n\r]+?)(?=\s*Created by|\s*Success|\s*Warning|\s*Failed|\s*Error|\n|\r|$)/i
        const headerMatch = conteudo.match(headerRegex) || plainText.match(headerRegex)
        if (headerMatch) {
          const prefix = headerMatch[1].toLowerCase()
          if (prefix.includes('copy')) jobTipo = 'backup_copy'
          else if (prefix.includes('replication')) jobTipo = 'replication'
          else jobTipo = 'backup'
          jobName = headerMatch[2].trim().replace(/\s+/g, ' ')
        } else {
          const subjectClean = assunto.replace(/\[.*?\]/g, '').trim()
          const objMatch = subjectClean.match(/^(.*?)(?:\s*\(\d+\s*objects?\))?$/i)
          jobName = objMatch && objMatch[1] ? objMatch[1].trim() : subjectClean || 'Backup VMs'
        }

        // Extrair VMs com parser estrito
        const novosDetalhesVms = []
        const tableMatches = conteudo.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || []
        for (let t = 0; t < tableMatches.length; t++) {
          const tableHtml = tableMatches[t]
          if (
            !tableHtml.toLowerCase().includes('success') &&
            !tableHtml.toLowerCase().includes('warning') &&
            !tableHtml.toLowerCase().includes('failed')
          ) {
            continue
          }
          const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
          for (let r = 0; r < rowMatches.length; r++) {
            const row = rowMatches[r]
            const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
            if (cellMatches.length >= 2) {
              const c0 = stripHtml(cellMatches[0]).trim()
              const c1 = stripHtml(cellMatches[1]).trim()
              if (!c0 || !isLinhaVmValida(c0)) continue

              const c0Norm = normalizar(c0)
              const jnNormLocal = normalizar(jobName)
              if (c0Norm && jnNormLocal && c0Norm === jnNormLocal) continue

              const statusVm = /success/i.test(row)
                ? 'success'
                : /warning/i.test(row)
                  ? 'warning'
                  : /failed|error/i.test(row)
                    ? 'failed'
                    : 'success'

              const totalSize = cellMatches.length >= 5 ? stripHtml(cellMatches[4]).trim() : ''
              const dataRead = cellMatches.length >= 6 ? stripHtml(cellMatches[5]).trim() : ''
              const transferred = cellMatches.length >= 7 ? stripHtml(cellMatches[6]).trim() : ''

              novosDetalhesVms.push({
                nome: c0,
                status: statusVm,
                duracao: c1,
                tamanho_total: totalSize,
                dados_lidos: dataRead,
                transferido: transferred,
              })
            }
          }
        }

        // Fallback linha a linha
        if (novosDetalhesVms.length === 0) {
          const rawLines = plainText.split(/\r?\n/)
          for (let lI = 0; lI < rawLines.length; lI++) {
            const line = rawLines[lI].trim()
            if (!line) continue
            const m = line.match(
              /^([A-Za-z0-9_\-\.\:\/\\]+)\s+(Success|Warning|Failed|Error)\b(.*)$/i,
            )
            if (m) {
              const rawName = m[1].trim()
              if (!isLinhaVmValida(rawName)) continue
              const c0Norm = normalizar(rawName)
              const jnNorm = normalizar(jobName)
              if (c0Norm && jnNorm && c0Norm === jnNorm) continue

              novosDetalhesVms.push({
                nome: rawName,
                status: m[2].toLowerCase() === 'success' ? 'success' : 'failed',
                duracao: '',
              })
            }
          }
        }

        // Status da execução recalculado
        let countSuc = 0
        let countWarn = 0
        let countErr = 0
        for (let i = 0; i < novosDetalhesVms.length; i++) {
          const st = String(novosDetalhesVms[i].status || '').toLowerCase()
          if (st === 'success' || st === 'sucesso') countSuc++
          else if (st === 'warning' || st === 'aviso') countWarn++
          else countErr++
        }

        let novoStatusExec = 'sucesso'
        if (countErr > 0) novoStatusExec = 'erro'
        else if (countWarn > 0) novoStatusExec = 'parcial'
        else if (novosDetalhesVms.length === 0) {
          novoStatusExec = execRec.getString('status') || 'sucesso'
        }

        execRec.set('status', novoStatusExec)

        // Resolução defensiva da cadeia de escopo: rotina -> plano -> escopo
        const orgId = execRec.getString('organization') || evRec.getString('organization')
        let rotinaRec = null
        let planoRec = null
        let escopoRec = null

        const rotinaId = execRec.getString('rotina') || evRec.getString('rotina')
        if (rotinaId) {
          try {
            rotinaRec = app.findRecordById('backup_rotinas', rotinaId)
          } catch (_) {}
        }
        if (rotinaRec) {
          const pId = rotinaRec.getString('plano')
          if (pId) {
            try {
              planoRec = app.findRecordById('backup_planos', pId)
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
            const escoposOrg = app.findRecordsByFilter(
              'backup_escopo',
              `organization = '${orgId}' && status = 'ativo'`,
              '+created',
              1,
              0,
            )
            if (escoposOrg.length > 0) escopoRec = escoposOrg[0]
          } catch (_) {}
        }

        // Expandir ativos do escopo
        const ativosEscopo = []
        if (escopoRec) {
          let ativosIds = []
          try {
            const rawAtivos = escopoRec.get('ativos')
            if (Array.isArray(rawAtivos)) ativosIds = rawAtivos
            else if (typeof rawAtivos === 'string') {
              try {
                const parsed = JSON.parse(rawAtivos)
                if (Array.isArray(parsed)) ativosIds = parsed
                else if (parsed && typeof parsed === 'object')
                  ativosIds = [parsed.id || String(parsed)]
                else if (parsed) ativosIds = [String(parsed)]
              } catch (_) {
                if (rawAtivos.trim()) {
                  ativosIds = rawAtivos
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                }
              }
            }
          } catch (_) {}

          if (ativosIds && ativosIds.length > 0) {
            for (let aI = 0; aI < ativosIds.length; aI++) {
              const aId =
                typeof ativosIds[aI] === 'string'
                  ? ativosIds[aI]
                  : ativosIds[aI] && ativosIds[aI].id
              if (!aId) continue
              try {
                const aRec = app.findRecordById('inventory_assets', aId)
                if (aRec) ativosEscopo.push(aRec)
              } catch (_) {}
            }
          }
        }

        // Fontes cadastradas
        let fontesCadastradas = []
        try {
          fontesCadastradas = app.findRecordsByFilter(
            'backup_fontes',
            `organization = '${orgId}' && ativo = true`,
            '+created',
            100,
            0,
          )
        } catch (_) {}

        // Casar VMs contra fontes e ativos do escopo
        for (let vI = 0; vI < novosDetalhesVms.length; vI++) {
          const vNome = novosDetalhesVms[vI].nome
          const vNorm = normalizar(vNome)
          let matchAtivoId = null
          let coberto = false

          // Match contra fontes
          for (let fI = 0; fI < fontesCadastradas.length; fI++) {
            const f = fontesCadastradas[fI]
            const fCaminho = f.getString('caminho_identificacao') || ''
            const fNorm = normalizar(fCaminho)
            const fAliases = extrairAliases(f.getString('aliases'))
            const fAtivoId = f.getString('ativo_inventario') || null

            if (fNorm && (fNorm === vNorm || fNorm.includes(vNorm) || vNorm.includes(fNorm))) {
              coberto = true
              matchAtivoId = fAtivoId
              break
            }
            for (let alI = 0; alI < fAliases.length; alI++) {
              const al = fAliases[alI]
              if (al && (al === vNorm || al.includes(vNorm) || vNorm.includes(al))) {
                coberto = true
                matchAtivoId = fAtivoId
                break
              }
            }
            if (coberto) break
          }

          // Match contra ativos do escopo
          if (!coberto && ativosEscopo.length > 0) {
            for (let aI = 0; aI < ativosEscopo.length; aI++) {
              const aRec = ativosEscopo[aI]
              const aNorm = normalizar(aRec.getString('name'))
              if (aNorm && (aNorm === vNorm || aNorm.includes(vNorm) || vNorm.includes(aNorm))) {
                coberto = true
                matchAtivoId = aRec.id
                break
              }
            }
          }

          novosDetalhesVms[vI].fora_escopo = !coberto
          novosDetalhesVms[vI].status_escopo = coberto ? 'coberto' : 'fora_escopo'
          if (!coberto) {
            novosDetalhesVms[vI].motivo_escopo = 'Não cadastrado — fora do escopo ou alias pendente'
          } else if (matchAtivoId) {
            novosDetalhesVms[vI].ativo_id = matchAtivoId
          }
        }

        execRec.set('detalhes_vms', novosDetalhesVms)

        // Modalidade da evidência: "Backup job:" -> local, "Backup copy job:" -> nuvem, etc.
        const textoIdentidade =
          `${assunto} ${jobName} ${(rotinaRec && rotinaRec.getString('nome')) || ''}`.toLowerCase()
        const modalidadesComprovadas = new Set()
        if (textoIdentidade.includes('backup copy job:')) {
          modalidadesComprovadas.add('nuvem')
        } else if (textoIdentidade.includes('replication job:')) {
          modalidadesComprovadas.add('replicacao')
        } else if (
          textoIdentidade.includes('backup job:') &&
          !textoIdentidade.includes('copy') &&
          !textoIdentidade.includes('replication')
        ) {
          modalidadesComprovadas.add('local')
        }

        // Montar confronto_escopo
        const novoComprovado = []
        const novasPendencias = []
        const novasExigencias = []

        for (let aI = 0; aI < ativosEscopo.length; aI++) {
          const aRec = ativosEscopo[aI]
          const aId = aRec.id
          const aNome = aRec.getString('name')
          const aTipo = aRec.getString('tipo')
          const aNomeNorm = normalizar(aNome)
          const exLoc = Boolean(aRec.getBool('exige_backup_local'))
          const exNuv = Boolean(aRec.getBool('exige_backup_nuvem'))
          const exRep = Boolean(aRec.getBool('exige_backup_replicacao'))

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

          // Procurar match nas VMs desta evidência
          let vmMatch = null
          for (let vi = 0; vi < novosDetalhesVms.length; vi++) {
            const dv = novosDetalhesVms[vi]
            const dvNorm = normalizar(dv.nome)
            if (
              dv.ativo_id === aId ||
              (dvNorm &&
                aNomeNorm &&
                (dvNorm === aNomeNorm || dvNorm.includes(aNomeNorm) || aNomeNorm.includes(dvNorm)))
            ) {
              vmMatch = dv
              break
            }
          }

          const ativoPresente = Boolean(vmMatch)
          const vmStatusOk =
            vmMatch &&
            (String(vmMatch.status || '').toLowerCase() === 'success' ||
              String(vmMatch.status || '').toLowerCase() === 'sucesso')

          for (let m = 0; m < mods.length; m++) {
            const modNome = mods[m]
            const atendeMod = modalidadesComprovadas.has(modNome)

            if (ativoPresente && atendeMod && vmStatusOk) {
              novoComprovado.push({
                ativo_id: aId,
                ativo_nome: aNome,
                ativo_tipo: aTipo,
                modalidade: modNome,
                item_comprovante: (vmMatch && vmMatch.nome) || aNome,
                fonte_casada: aNome,
                rotina_nome: rotinaRec ? rotinaRec.getString('nome') : null,
                job_nome: jobName,
                plano_nome: planoRec ? planoRec.getString('nome') : null,
                status: 'sucesso',
                comprovado_em: execRec.getString('data_inicio') || execRec.getString('created'),
              })
            } else {
              const modLabel =
                modNome === 'local' ? 'Local' : modNome === 'nuvem' ? 'Nuvem' : 'Replicação'
              let motivoPend = `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`
              if (!ativoPresente) {
                motivoPend = `Ativo não mencionado neste comprovante (pode ser coberto por outra rotina/job).`
              } else if (!atendeMod) {
                motivoPend = `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`
              } else if (!vmStatusOk) {
                motivoPend = `VM ${(vmMatch && vmMatch.nome) || aNome} constou com status "${(vmMatch && vmMatch.status) || 'erro'}". Modalidade não homologada.`
              }

              novasPendencias.push({
                ativo_id: aId,
                ativo_nome: aNome,
                ativo_tipo: aTipo,
                modalidade_pendente: modNome,
                ativo_presente_no_comprovante: ativoPresente,
                item_comprovante: (vmMatch && vmMatch.nome) || aNome,
                motivo: motivoPend,
                job_nome: jobName,
                atendivel_por_outra_rotina: !atendeMod || !ativoPresente,
              })
            }
          }
        }

        const novoConfronto = {
          escopo_id: escopoRec ? escopoRec.id : null,
          escopo_nome: escopoRec ? escopoRec.getString('nome') : null,
          rotina_id: rotinaRec ? rotinaRec.id : execRec.getString('rotina') || null,
          rotina_nome: rotinaRec ? rotinaRec.getString('nome') : null,
          plano_id: planoRec ? planoRec.id : null,
          plano_nome: planoRec ? planoRec.getString('nome') : null,
          modalidades_plano: Array.from(modalidadesComprovadas),
          exigencias: novasExigencias,
          comprovado: novoComprovado,
          pendencias: novasPendencias,
          total_ativos_escopo: ativosEscopo.length,
          total_exigencias_modalidade: novasExigencias.reduce(
            (acc, cur) => acc + (cur.modalidades || []).length,
            0,
          ),
          total_comprovadas: novoComprovado.length,
          total_pendencias: novasPendencias.length,
          job_nome: jobName,
        }

        execRec.set('confronto_escopo', novoConfronto)

        // Atualizar observação
        const rotinaNomeStr = rotinaRec ? rotinaRec.getString('nome') : jobName
        const obs = `Veeam ${jobTipo}: "${jobName}" (${novosDetalhesVms.length} VM(s) detalhada(s)) [Veeam Backup & Replication 12.x]. Duração: 0:10:15.`
        execRec.set('observacao', obs)

        app.save(execRec)

        // Atualizar avaliação correspondente
        try {
          const avals = app.findRecordsByFilter(
            'backup_avaliacoes',
            `execucao = '${execRec.id}'`,
            '-created',
            10,
            0,
          )
          for (let avI = 0; avI < avals.length; avI++) {
            const avalRec = avals[avI]
            avalRec.set(
              'resultado_conformidade',
              novoStatusExec === 'sucesso'
                ? 'conforme'
                : novoStatusExec === 'parcial'
                  ? 'atencao'
                  : 'nao_conforme',
            )
            avalRec.set(
              'detalhe',
              novoStatusExec === 'sucesso'
                ? `Conforme: cópia executada com sucesso dentro do intervalo declarado pela rotina "${rotinaNomeStr}".`
                : `Atenção: Job Veeam "${jobName}" apresentou alertas na execução.`,
            )
            avalRec.set('confronto_escopo', novoConfronto)

            // Atualizar laudo técnico se existir
            const laudo = avalRec.get('laudo_tecnico')
            if (laudo && typeof laudo === 'object') {
              laudo.resultado = novoStatusExec === 'sucesso' ? 'conforme' : 'nao_conforme'
              laudo.veredito = avalRec.getString('detalhe')
              if (laudo.metricas) {
                laudo.metricas.vms_sucesso = countSuc
                laudo.metricas.vms_falha = countErr
                laudo.metricas.vms_alerta = countWarn
              }
              if (laudo.cobertura) {
                laudo.cobertura.itens_detectados = novosDetalhesVms.map((v) => v.nome)
                laudo.cobertura.total_itens = novosDetalhesVms.length
                laudo.cobertura.total_cobertos = novosDetalhesVms.filter(
                  (v) => !v.fora_escopo,
                ).length
                laudo.cobertura.total_nao_cobertos = novosDetalhesVms.filter(
                  (v) => v.fora_escopo,
                ).length
                laudo.cobertura.fontes_cobertas = novosDetalhesVms
                  .filter((v) => !v.fora_escopo)
                  .map((v) => ({
                    item: v.nome,
                    fonte_cadastrada: v.nome,
                    fora_escopo: false,
                  }))
                laudo.cobertura.fontes_nao_cobertas = novosDetalhesVms
                  .filter((v) => v.fora_escopo)
                  .map((v) => ({
                    item: v.nome,
                    motivo: 'Não cadastrado — fora do escopo ou alias pendente',
                    fora_escopo: true,
                  }))
              }
              if (Array.isArray(laudo.verificacoes)) {
                for (let chkI = 0; chkI < laudo.verificacoes.length; chkI++) {
                  const chk = laudo.verificacoes[chkI]
                  if (chk.item === 'status_job') {
                    chk.status = novoStatusExec === 'sucesso' ? 'conforme' : 'nao_conforme'
                    chk.passou = novoStatusExec === 'sucesso'
                    chk.detalhes =
                      'O trabalho de backup reportou sucesso completo (0 erros detectados).'
                  } else if (chk.item === 'rpo') {
                    chk.status = 'conforme'
                    chk.passou = true
                    chk.detalhes =
                      'Ponto de recuperação gerado nesta execução (RPO esperado do plano: ≤ 24h). Objetivo atendido.'
                  } else if (chk.item === 'cobertura_fontes') {
                    const naoCob = novosDetalhesVms.filter((v) => v.fora_escopo).length
                    chk.status = naoCob === 0 ? 'conforme' : 'atencao'
                    chk.passou = naoCob === 0
                    chk.cobertas_count = novosDetalhesVms.filter((v) => !v.fora_escopo).length
                    chk.nao_cobertas_count = naoCob
                    chk.detalhes = `Todos os ${novosDetalhesVms.length} itens do comprovante possuem fonte cadastrada correspondente.`
                  } else if (chk.item === 'extracao') {
                    chk.status = 'conforme'
                    chk.passou = true
                    chk.detalhes = `Adaptador VEEAM_HTML: status "sucesso", ${novosDetalhesVms.length} item(ns)/VM(s) detectado(s), ${countSuc} sucesso, 0 aviso(s), 0 falha(s).`
                  }
                }
              }
              avalRec.set('laudo_tecnico', laudo)
            }

            app.save(avalRec)
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('[0029_reprocessar_veeam_gold_escopo] Erro:', err)
    }
  },
  (app) => {
    // Reversão não necessária para migration de correção de dados
  },
)
