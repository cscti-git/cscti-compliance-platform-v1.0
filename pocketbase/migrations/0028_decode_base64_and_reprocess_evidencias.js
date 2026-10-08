migrate(
  (app) => {
    // 0028: Decodificar e reprocessar evidências armazenadas em Base64
    // Identifica registros de backup_evidencias cujo campo 'conteudo' contém string Base64,
    // decodifica para HTML/UTF-8 e reprocessa a extração de detalhes_vms e confronto_escopo.

    const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    const tentarDecodificarBase64 = (texto) => {
      if (!texto) return texto
      let s = String(texto).trim()

      if (s.startsWith('data:') && s.includes(';base64,')) {
        const p = s.split(';base64,')
        if (p[1]) s = p[1].trim()
      }

      if (s.includes('<html') || s.includes('<table') || s.includes('<body')) {
        return texto
      }

      if (s.length < 20 || !/^[A-Za-z0-9+/=\s\r\n]+$/.test(s)) {
        return texto
      }

      try {
        const clean = s.replace(/\s+/g, '')
        let pad = 0
        if (clean.endsWith('==')) pad = 2
        else if (clean.endsWith('=')) pad = 1
        const cleanLen = clean.length
        const byteLen = Math.floor((cleanLen * 3) / 4) - pad
        if (byteLen <= 0) return texto

        const bytes = []
        let i = 0
        while (i < cleanLen) {
          const c0 = b64chars.indexOf(clean.charAt(i++))
          const c1 = b64chars.indexOf(clean.charAt(i++))
          const c2 = i < cleanLen ? b64chars.indexOf(clean.charAt(i++)) : -1
          const c3 = i < cleanLen ? b64chars.indexOf(clean.charAt(i++)) : -1
          if (c0 === -1 || c1 === -1) break

          const b0 = (c0 << 2) | (c1 >> 4)
          bytes.push(b0)
          if (c2 !== -1 && c2 !== 64) {
            const b1 = ((c1 & 15) << 4) | (c2 >> 2)
            bytes.push(b1)
            if (c3 !== -1 && c3 !== 64) {
              const b2 = ((c2 & 3) << 6) | c3
              bytes.push(b2)
            }
          }
        }

        let temMuitosNulos = false
        let contNulos = 0
        for (let k = 0; k < Math.min(bytes.length, 200); k++) {
          if (bytes[k] === 0) contNulos++
        }
        if (contNulos > 20) temMuitosNulos = true

        let decodificado = ''
        if (temMuitosNulos) {
          const chars = []
          for (let bIdx = 0; bIdx < bytes.length; bIdx += 2) {
            const code = bytes[bIdx] | ((bytes[bIdx + 1] || 0) << 8)
            if (code !== 0) chars.push(String.fromCharCode(code))
          }
          decodificado = chars.join('')
        } else {
          const chars = []
          let bI = 0
          while (bI < bytes.length) {
            const b = bytes[bI++]
            if (b < 0x80) {
              chars.push(String.fromCharCode(b))
            } else if (b >= 0xc0 && b < 0xe0 && bI < bytes.length) {
              const b2 = bytes[bI++]
              chars.push(String.fromCharCode(((b & 0x1f) << 6) | (b2 & 0x3f)))
            } else if (b >= 0xe0 && b < 0xf0 && bI + 1 < bytes.length) {
              const b2 = bytes[bI++]
              const b3 = bytes[bI++]
              chars.push(String.fromCharCode(((b & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)))
            } else {
              chars.push(String.fromCharCode(b))
            }
          }
          decodificado = chars.join('')
        }

        const decLower = decodificado.toLowerCase()
        if (
          decLower.includes('<?xml') ||
          decLower.includes('<html') ||
          decLower.includes('<!doctype') ||
          decLower.includes('<table') ||
          decLower.includes('backup job') ||
          decLower.includes('details') ||
          decLower.includes('veeam')
        ) {
          return decodificado
        }
      } catch (_) {}
      return texto
    }

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

    try {
      const evidencias = app.findRecordsByFilter('backup_evidencias', '', '-created', 100, 0)
      for (let eIdx = 0; eIdx < evidencias.length; eIdx++) {
        const ev = evidencias[eIdx]
        const raw = ev.getString('conteudo') || ''
        const decodificado = tentarDecodificarBase64(raw)

        if (decodificado && decodificado !== raw) {
          // Atualizar evidência com o conteúdo limpo decodificado
          ev.set('conteudo', decodificado)
          app.save(ev)

          const plainText = stripHtml(decodificado)

          // Extrair tabela de VMs
          const detalhesVms = []
          const tableMatches = decodificado.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || []
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
                if (!c0 || c0.toLowerCase() === 'name' || c0.toLowerCase() === 'vm') continue

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

                detalhesVms.push({
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

          // Se a tabela HTML não extraiu, tentar regex linha a linha
          if (detalhesVms.length === 0) {
            const rawLines = plainText.split(/\r?\n/)
            for (let lI = 0; lI < rawLines.length; lI++) {
              const line = rawLines[lI].trim()
              const m = line.match(
                /^([A-Za-z0-9_\-\.\:\/\\]+)\s+(Success|Warning|Failed|Error)\b(.*)$/i,
              )
              if (m) {
                const nm = m[1].trim()
                if (!/^(name|vm|vms|status|details|start|backup|total)$/i.test(nm)) {
                  detalhesVms.push({
                    nome: nm,
                    status: m[2].toLowerCase() === 'success' ? 'success' : 'failed',
                    duracao: '',
                  })
                }
              }
            }
          }

          // Atualizar execuções vinculadas a esta evidência
          const orgId = ev.getString('organization')
          const execs = app.findRecordsByFilter(
            'backup_execucoes',
            `evidencia = '${ev.id}'`,
            '-created',
            10,
            0,
          )

          // Extrair Job Name e modalidade
          const headerRegex =
            /(Backup Copy job|Replication job|Backup job)[:\s]+([^<\n\r]+?)(?=\s*Created by|\s*Success|\s*Warning|\s*Failed|\s*Error|\n|\r|$)/i
          const headerMatch = decodificado.match(headerRegex) || plainText.match(headerRegex)
          let jobName = ''
          let modalidadeDetectada = 'local' // fallback padrão para Veeam Backup job

          if (headerMatch) {
            const prefix = headerMatch[1].toLowerCase()
            if (prefix.includes('copy')) modalidadeDetectada = 'nuvem'
            else if (prefix.includes('replication')) modalidadeDetectada = 'replicacao'
            else modalidadeDetectada = 'local'
            jobName = headerMatch[2].trim().replace(/\s+/g, ' ')
          } else {
            const ass = ev.getString('assunto') || ''
            if (ass.toLowerCase().includes('copy')) modalidadeDetectada = 'nuvem'
            else if (ass.toLowerCase().includes('replication')) modalidadeDetectada = 'replicacao'
            else if (ass.toLowerCase().includes('backup')) modalidadeDetectada = 'local'
            jobName = ass.replace(/\[.*?\]/g, '').trim() || 'Backup VMs'
          }

          // Buscar ativos do inventário da organização
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

          for (let exI = 0; exI < execs.length; exI++) {
            const ex = execs[exI]
            if (detalhesVms.length > 0) {
              ex.set('detalhes_vms', detalhesVms)
            }

            // Recalcular confronto_escopo
            if (assets.length > 0) {
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

                for (let vi = 0; vi < detalhesVms.length; vi++) {
                  const vmObj = detalhesVms[vi]
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
                      vmMotivoErro = `VM ${vmObj.nome} constou com status "${vmObj.status}".`
                    }
                    break
                  }
                }

                for (let m = 0; m < mods.length; m++) {
                  const modNome = mods[m]
                  if (modalidadeDetectada && modNome === modalidadeDetectada && vmComSucesso) {
                    novoComprovado.push({
                      ativo_id: aId,
                      ativo_nome: aNome,
                      ativo_tipo: aTipo,
                      modalidade: modNome,
                      item_comprovante: aNome,
                      fonte_casada: aNome,
                      rotina_nome: null,
                      job_nome: jobName,
                      plano_nome: null,
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
                    if (modalidadeDetectada && modNome === modalidadeDetectada) {
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
                      job_nome: jobName,
                      atendivel_por_outra_rotina: modNome !== modalidadeDetectada,
                    })
                  }
                }
              }

              const confAntigo = ex.get('confronto_escopo') || {}
              const novoConfronto = {
                escopo_id: confAntigo.escopo_id || null,
                escopo_nome: confAntigo.escopo_nome || 'Escopo do Inventário',
                rotina_id: ex.getString('rotina') || null,
                rotina_nome: null,
                job_nome: jobName,
                plano_id: null,
                plano_nome: null,
                modalidades_plano: [modalidadeDetectada],
                exigencias: novasExigencias,
                comprovado: novoComprovado,
                pendencias: novasPendencias,
                total_ativos_escopo: assets.length,
                total_exigencias_modalidade: novoComprovado.length + novasPendencias.length,
                total_comprovadas: novoComprovado.length,
                total_pendencias: novasPendencias.length,
              }

              ex.set('confronto_escopo', novoConfronto)
            }

            app.save(ex)

            // Atualizar também avaliação se houver
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
                const conf = ex.get('confronto_escopo')
                if (conf) {
                  av.set('confronto_escopo', conf)
                  app.save(av)
                }
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão no-op
  },
)
