// Migração 0059 — Reprocessamento idempotente do Atestado Humano Diário (NOC)
// -----------------------------------------------------------------------------
// Contexto: entre o commit 0.0.82 e a correção do scoping da JSVM, o adaptador
// NOC_DIARIO do endpoint /backend/v1/backup/processar-evidencia quebrava com
// "TypeError: Object has no member 'processarNocAtestado'" — o núcleo do
// atestado (publicado em globalThis pelo backup_noc.js) não era visível dentro
// da callback (pool de VM separado). Resultado: monitoramentos gravados sem
// divergências/vínculos, ocorrências NOC não resolvidas/criadas e nenhuma
// linha em backup_processamentos para aquelas evidências.
//
// Correção estrutural: o núcleo do atestado agora vive 100% INLINE em
// pocketbase/hooks/backup.js (e backup_noc.js ficou autossuficiente, sem
// globalThis). Esta migração repassa o mesmo núcleo, de forma idempotente,
// sobre todos os monitoramentos externos existentes:
//   1) recalcula divergências NOC × sistema (mesmo dia, fuso SP) e vincula
//      ativos do inventário citados no relatório;
//   2) resolve ocorrências NOC abertas quando o relatório é OK;
//   3) cria ocorrência com fato real por VM quando o relatório indica falha;
//   4) saneia evidências NOC remanescentes 'pendente' (sem processamento
//      gravado): marca 'processada' e cria o registro em
//      backup_processamentos (adaptador NOC_DIARIO) — audit trail completo;
//   5) auditoria append-only apenas quando há trabalho efetivo (idempotente).
// -----------------------------------------------------------------------------

migrate(
  (app) => {
    function nocParseDateToIso(str) {
      if (!str) return null
      try {
        const d = new Date(str)
        if (!isNaN(d.getTime())) return d.toISOString()
      } catch (_) {}
      return null
    }

    function nocFormatarDataSp(iso) {
      try {
        if (!iso) return ''
        const d = new Date(iso)
        if (isNaN(d.getTime())) return ''
        const dSp = new Date(d.getTime() - 3 * 60 * 60 * 1000)
        const pad2 = (n) => (n < 10 ? '0' + n : String(n))
        return (
          pad2(dSp.getUTCDate()) +
          '/' +
          pad2(dSp.getUTCMonth() + 1) +
          '/' +
          dSp.getUTCFullYear() +
          ' ' +
          pad2(dSp.getUTCHours()) +
          ':' +
          pad2(dSp.getUTCMinutes())
        )
      } catch (_) {
        return ''
      }
    }

    function nocLerJson(valor) {
      if (valor === null || valor === undefined) return null
      try {
        if (typeof valor === 'string') {
          const s = valor.trim()
          if (!s || s === 'null') return null
          if (s.startsWith('{') || s.startsWith('[')) return JSON.parse(s)
          return null
        }
        if (Array.isArray(valor)) return valor
        if (typeof valor === 'object' && typeof valor.string === 'function') {
          const s = valor.string()
          if (typeof s === 'string' && (s.trim().startsWith('{') || s.trim().startsWith('['))) {
            return JSON.parse(s)
          }
        }
        return valor
      } catch (_) {
        return null
      }
    }

    function nocClassificarStatusVm(st) {
      const s = String(st || '')
        .toUpperCase()
        .trim()
      const isFalha =
        s.includes('FAILED') ||
        s.includes('FAIL') ||
        s.includes('ERROR') ||
        s.includes('ERRO') ||
        s.includes('FALHA')
      const isSucesso = s.includes('SUCCESS') || s.includes('SUCESSO') || s.includes('OK')
      return { isSucesso, isFalha }
    }

    function nocNorm(s) {
      return String(s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
    }

    let monitoramentosAnalisados = 0
    let monitoramentosAtualizados = 0
    let ocorrenciasResolvidas = 0
    let ocorrenciasCriadas = 0
    let evidenciasSaneadas = 0
    let processamentosCriados = 0
    let orgIdDefault = ''

    // -------------------------------------------------------------
    // Passo 1 — Repassar o núcleo do atestado sobre cada monitoramento
    // -------------------------------------------------------------
    let monitoramentos = []
    try {
      monitoramentos = app.findRecordsByFilter(
        'backup_monitoramentos_externos',
        '',
        '+created',
        1000,
        0,
      )
    } catch (errMon) {
      console.log('[0059] Erro ao listar monitoramentos:', errMon)
    }

    for (let i = 0; i < monitoramentos.length; i++) {
      const mon = monitoramentos[i]
      const orgId = mon.getString('organization')
      if (orgId && !orgIdDefault) orgIdDefault = orgId
      monitoramentosAnalisados++

      const statusGeral = (mon.getString('status_geral') || 'ok').toLowerCase()
      const assunto = mon.getString('assunto') || ''
      const remetente = mon.getString('origem_remetente') || ''
      const dataMonIso = nocParseDateToIso(mon.getString('data_monitoramento')) || ''
      const evId = mon.getString('evidencia') || ''

      let clientesStatus = nocLerJson(mon.getString('clientes_status'))
      if (!Array.isArray(clientesStatus)) clientesStatus = []
      const plainText = String(mon.getString('conteudo_bruto') || '')

      // --- Fato real estruturado por VM/cliente ---
      const vmsFalhas = []
      const vmsOk = []
      for (let c = 0; c < clientesStatus.length; c++) {
        const it = clientesStatus[c] || {}
        const nome = String(it.cliente || it.nome || '').trim() || 'Item não identificado'
        const st = String(it.status || '').toUpperCase()
        const det = String(it.acoes || it.detalhe || '').trim()
        if (nocClassificarStatusVm(st).isFalha) {
          vmsFalhas.push({ cliente: nome, status: String(it.status || 'Falha'), detalhe: det })
        } else {
          vmsOk.push({ cliente: nome, status: String(it.status || 'OK'), detalhe: det })
        }
      }

      // --- Divergência NOC × sistema (mesmo dia, fuso America/Sao_Paulo) ---
      const divergencias = []
      let estadoConfronto = 'sem_dados_sistema'
      let execsIdsDia = []
      if (dataMonIso) {
        try {
          const dObj = new Date(dataMonIso)
          if (!isNaN(dObj.getTime())) {
            const spShift = new Date(dObj.getTime() - 3 * 60 * 60 * 1000)
            const ini = new Date(
              Date.UTC(
                spShift.getUTCFullYear(),
                spShift.getUTCMonth(),
                spShift.getUTCDate(),
                3,
                0,
                0,
              ),
            )
            const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000)
            let execs = []
            try {
              execs = app.findRecordsByFilter(
                'backup_execucoes',
                `organization = '${orgId}'`,
                '-created',
                400,
                0,
              )
            } catch (_) {}
            let temSucesso = false
            let temFalha = false
            for (let x = 0; x < execs.length; x++) {
              const ex = execs[x]
              const dtRaw = ex.getString('data_email') || ex.getString('data_inicio') || ''
              if (!dtRaw) continue
              const t = new Date(dtRaw).getTime()
              if (isNaN(t) || t < ini.getTime() || t >= fim.getTime()) continue
              execsIdsDia.push(ex.id)
              const st = String(ex.getString('status') || '').toLowerCase()
              if (st === 'sucesso') temSucesso = true
              else if (st === 'erro' || st === 'falha') temFalha = true
            }
            if (execsIdsDia.length > 0) {
              estadoConfronto = 'convergente'
              const nocOk = statusGeral === 'ok'
              if (nocOk && temFalha) {
                estadoConfronto = 'divergente'
                divergencias.push({
                  tipo: 'noc_ok_sistema_falha',
                  descricao:
                    'O NOC reportou ambiente OK, porém o sistema registrou execução(ões) de backup com falha no mesmo dia. Veredito do sistema mantido.',
                  detectado_em: new Date().toISOString(),
                  data_referencia: dataMonIso,
                  status_noc: statusGeral,
                  sistema: { execucoes: execsIdsDia, tem_sucesso: temSucesso, tem_falha: temFalha },
                })
              } else if (!nocOk && temSucesso && !temFalha) {
                estadoConfronto = 'divergente'
                divergencias.push({
                  tipo: 'noc_falha_sistema_ok',
                  descricao:
                    'O NOC reportou falha no ambiente, porém o sistema registrou apenas execuções de backup com sucesso no mesmo dia. Veredito do sistema mantido.',
                  detectado_em: new Date().toISOString(),
                  data_referencia: dataMonIso,
                  status_noc: statusGeral,
                  sistema: { execucoes: execsIdsDia, tem_sucesso: temSucesso, tem_falha: temFalha },
                })
              }
            }
          }
        } catch (_) {}
      }

      // --- Vincular ativos do inventário citados no relatório ---
      const vinculados = []
      try {
        if (clientesStatus.length > 0) {
          const ativos = app.findRecordsByFilter(
            'inventory_assets',
            `organization = '${orgId}'`,
            '+name',
            200,
            0,
          )
          for (let c = 0; c < clientesStatus.length; c++) {
            const nome = String((clientesStatus[c] && clientesStatus[c].cliente) || '').trim()
            if (!nome) continue
            const nNorm = nocNorm(nome)
            for (let a = 0; a < ativos.length; a++) {
              const aNome = String(ativos[a].getString('name') || '').trim()
              if (!aNome) continue
              const aNorm = nocNorm(aNome)
              if (aNorm && (aNorm === nNorm || aNorm.includes(nNorm) || nNorm.includes(aNorm))) {
                vinculados.push({ ativo_id: ativos[a].id, ativo_nome: aNome, item_noc: nome })
                break
              }
            }
          }
        }
      } catch (_) {}

      // Grava divergências/vínculos apenas se mudaram (idempotente)
      const divAntes = nocLerJson(mon.getString('divergencias')) || []
      const vincAntes = nocLerJson(mon.getString('ativos_vinculados')) || []
      const mudouDiv = JSON.stringify(divAntes) !== JSON.stringify(divergencias)
      const mudouVinc = JSON.stringify(vincAntes) !== JSON.stringify(vinculados)
      let trabalhoEfetivo = false
      if (mudouDiv || mudouVinc) {
        try {
          if (mudouDiv) mon.set('divergencias', divergencias)
          if (mudouVinc) mon.set('ativos_vinculados', vinculados)
          app.save(mon)
          monitoramentosAtualizados++
          trabalhoEfetivo = true
        } catch (errSave) {
          console.log('[0059] Aviso ao salvar monitoramento:', errSave)
        }
      }

      // --- Resolução automática de ocorrências NOC abertas (relatório OK) ---
      if (statusGeral === 'ok') {
        try {
          const abertas = app.findRecordsByFilter(
            'backup_ocorrencias',
            `organization = '${orgId}' && status = 'aberta'`,
            '-created',
            50,
            0,
          )
          for (let o = 0; o < abertas.length; o++) {
            const oc = abertas[o]
            const fr = nocLerJson(oc.getString('fato_real'))
            if (!fr || typeof fr !== 'object' || fr.origem !== 'noc') continue
            if (String(fr.monitoramento_id || '') === String(mon.id)) continue

            const dataHoraSp = nocFormatarDataSp(dataMonIso)
            oc.set('status', 'resolvida')
            oc.set('resolvida_automaticamente', true)
            if (evId) oc.set('resolvida_por_evidencia', evId)
            oc.set('resolvida_em', new Date().toISOString())
            oc.set(
              'resolucao',
              `Ocorrência NOC #${oc.id} resolvida automaticamente: o relatório diário posterior do NOC (${dataHoraSp || 'data do relatório'}) reportou todos os backups do ambiente OK, confirmando a normalização do incidente. Reprocessamento 0059.`,
            )
            app.save(oc)
            ocorrenciasResolvidas++
            trabalhoEfetivo = true
          }
        } catch (_) {}
      }

      // --- Criação de ocorrência com fato real (relatório com falha) ---
      if (statusGeral !== 'ok') {
        try {
          const naoResolvidas = app.findRecordsByFilter(
            'backup_ocorrencias',
            `organization = '${orgId}' && status != 'resolvida'`,
            '-created',
            100,
            0,
          )
          let jaExiste = false
          for (let o = 0; o < naoResolvidas.length; o++) {
            const fr = nocLerJson(naoResolvidas[o].getString('fato_real'))
            if (
              fr &&
              typeof fr === 'object' &&
              fr.origem === 'noc' &&
              String(fr.monitoramento_id || '') === String(mon.id)
            ) {
              jaExiste = true
              break
            }
          }
          if (!jaExiste) {
            const dataHoraSp = nocFormatarDataSp(dataMonIso)
            let descricao = ''
            for (let v = 0; v < vmsFalhas.length; v++) {
              const vmF = vmsFalhas[v]
              descricao +=
                `O NOC (PRO IT CLOUD SOLUTIONS) reportou em ${dataHoraSp || 'data não informada'} ` +
                `falha no backup da VM ${vmF.cliente}` +
                (vmF.detalhe ? `: ${vmF.detalhe}.` : '.') +
                ' '
            }
            if (vmsFalhas.length === 0) {
              const trecho = String(plainText).replace(/\s+/g, ' ').trim().slice(0, 240)
              descricao =
                `O NOC (PRO IT CLOUD SOLUTIONS) reportou em ${dataHoraSp || 'data não informada'} ` +
                `inconformidade geral no ambiente de backup${trecho ? ': ' + trecho : '.'} `
            }
            const ocCol = app.findCollectionByNameOrId('backup_ocorrencias')
            const ocNova = new Record(ocCol)
            ocNova.set('organization', orgId)
            ocNova.set('tipo', 'falha_de_backup')
            ocNova.set('severidade', 'alta')
            ocNova.set('status', 'aberta')
            ocNova.set(
              'titulo',
              `NOC (PRO IT CLOUD SOLUTIONS) reportou falha no backup (${dataHoraSp || 'Diário'})`,
            )
            ocNova.set('descricao', descricao.trim())
            if (evId) ocNova.set('evidencia', evId)
            ocNova.set('fato_real', {
              origem: 'noc',
              monitoramento_id: mon.id,
              vms_falhas: vmsFalhas,
              vms_ok: vmsOk,
              data_hora_sp: dataHoraSp,
              data_iso: dataMonIso,
              remetente: remetente,
              assunto: assunto,
            })
            app.save(ocNova)
            ocorrenciasCriadas++
            trabalhoEfetivo = true
          }
        } catch (_) {}
      }

      // --- Saneamento da evidência NOC remanescente 'pendente' ---
      if (evId) {
        try {
          const ev = app.findRecordById('backup_evidencias', evId)
          if (ev.getString('status_processamento') === 'pendente') {
            // cria processamento apenas se não existir nenhum para a evidência
            let temProc = false
            try {
              const procs = app.findRecordsByFilter(
                'backup_processamentos',
                `evidencia = '${evId}'`,
                '',
                1,
                0,
              )
              temProc = procs.length > 0
            } catch (_) {}

            if (!temProc) {
              const procCol = app.findCollectionByNameOrId('backup_processamentos')
              const procRec = new Record(procCol)
              procRec.set('organization', orgId)
              procRec.set('evidencia', evId)
              procRec.set('adaptador_usado', 'NOC_DIARIO')
              procRec.set('versao_adaptador', '1.1.0')
              procRec.set('resultado', {
                tipo: 'monitoramento_externo',
                status_detectado: statusGeral === 'ok' ? 'sucesso' : 'erro',
                data_monitoramento: dataMonIso,
                remetente: remetente,
                assunto: assunto,
                clientes_status: clientesStatus,
                monitoramento_id: mon.id,
                processado_em: new Date().toISOString(),
                adaptador: 'NOC_DIARIO',
                versao: '1.1.0',
                origem: 'reprocessamento_0059',
              })
              app.save(procRec)
              processamentosCriados++
            }

            ev.set('status_processamento', 'processada')
            app.save(ev)
            evidenciasSaneadas++
            trabalhoEfetivo = true
          }
        } catch (_) {}
      }

      // --- Auditoria append-only apenas quando houve trabalho efetivo ---
      if (trabalhoEfetivo) {
        try {
          const auditCol = app.findCollectionByNameOrId('audit_log')
          const auditRec = new Record(auditCol)
          auditRec.set('organization', orgId)
          auditRec.set('user_name', 'Sistema CSCTI (Migração 0059)')
          auditRec.set('action', 'NOC_ATESTADO_REPROCESSADO_0059')
          auditRec.set('entity', 'Backup e Continuidade')
          auditRec.set(
            'detail',
            `Reprocessamento do Atestado Humano Diário do NOC (migração 0059) sobre o monitoramento #${mon.id}. ` +
              `Status geral: ${statusGeral.toUpperCase()}. Confronto NOC × sistema: ${estadoConfronto}.` +
              (ocorrenciasResolvidas > 0 ? ' Inclui resolução automática de ocorrências NOC.' : ''),
          )
          auditRec.set('metadata', {
            migracao: '0059_reprocessar_noc_inline',
            monitoramento_id: mon.id,
            evidencia_id: evId,
            status_geral: statusGeral,
            estado_confronto: estadoConfronto,
            divergencias_count: divergencias.length,
            ativos_vinculados_count: vinculados.length,
            execucoes_analisadas_dia: execsIdsDia.length,
            data_execucao: new Date().toISOString(),
          })
          app.save(auditRec)
        } catch (_) {}
      }
    }

    console.log(
      `[0059_reprocessar_noc_inline] Concluído: ${monitoramentosAnalisados} monitoramentos analisados, ` +
        `${monitoramentosAtualizados} atualizados, ${ocorrenciasResolvidas} ocorrências resolvidas, ` +
        `${ocorrenciasCriadas} criadas, ${evidenciasSaneadas} evidências saneadas, ` +
        `${processamentosCriados} processamentos criados.`,
    )
  },
  (app) => {
    // Reversão no-op: as correções são idempotentes e preservam histórico.
  },
)
