// Módulo: Atestado Humano Diário — Monitoramento Externo NOC
// -------------------------------------------------------------
// Conceito: todos os dias um agente humano (NOC — PRO IT CLOUD SOLUTIONS,
// remetente @proitcs.com.br) conecta-se ao servidor, checa todas as rotinas
// de backup do Veeam e valida se está tudo certo; se falha, ele reporta as
// falhas. Este módulo transforma esse atestado em FATOS REAIS estruturados,
// resolve ocorrências NOC abertas quando um relatório posterior OK chega
// (mesmo ciclo dos comprovantes) e confronta o NOC com o próprio sistema.
//
// ⚠ ESCOPO JSVM: callbacks de rota rodam em um pool de VMs separado —
// declarações de nível superior deste arquivo NÃO são acessíveis dentro
// delas (erro "Hook scoping error"; vale inclusive para referências do
// formato globalThis.<declaração>). Por isso:
//   • as declarações locais do núcleo/auditoria usam nomes internos
//     (nocAtestadoCore, nocAuditEscrita) que NUNCA aparecem dentro da callback;
//   • a API pública é publicada em globalThis UMA vez, na carga do hook,
//     sob os nomes originais do contrato entre hooks (processarNocAtestado,
//     nocAudit, ...) — consumida por pocketbase/hooks/backup.js no caminho
//     do e-mail do NOC e pela própria callback do endpoint abaixo.
//
// Publicado em globalThis (consumido por pocketbase/hooks/backup.js):
// - processarNocAtestado(organizationId, plainText, clientesStatus, statusGeral,
//     acaoRealizada, dataEmailIso, remetente, assunto, evidenciaRec, monRec, auth)
// - nocDetectarDivergencia, nocVincularAtivos, nocFormatarDataSp, nocLerJson, nocAudit
//
// Endpoint registrado aqui:
// - POST /backend/v1/backup/noc/avaliacao-manual (admin/suporte)
// -------------------------------------------------------------

// Leitura tolerante de campo JSON do PocketBase (string, bytes ou objeto Go)
const nocLerJson = (valor) => {
  if (valor === null || valor === undefined) return null
  try {
    if (typeof valor === 'string') {
      const s = valor.trim()
      if (!s || s === 'null') return null
      if (s.startsWith('{') || s.startsWith('[')) return JSON.parse(s)
      return null
    }
    if (Array.isArray(valor)) {
      if (valor.length === 0) return null
      // Array de bytes (números) vindo do JSVM
      if (typeof valor[0] === 'number') {
        let s = ''
        for (let i = 0; i < valor.length; i++) s += String.fromCharCode(valor[i])
        const t = s.trim()
        if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t)
        return null
      }
      return valor
    }
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

// Data/hora factual no fuso America/Sao_Paulo (UTC-3): DD/MM/AAAA HH:mm
const nocFormatarDataSp = (iso) => {
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

// Auditoria append-only padronizada do módulo
// (nome interno nocAuditEscrita: a callback só acessa via globalThis.nocAudit)
const nocAuditEscrita = (organizationId, auth, action, detail, metadata) => {
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_log')
    const auditRec = new Record(auditCol)
    auditRec.set('organization', organizationId)
    auditRec.set('user', auth && auth.id ? auth.id : '')
    auditRec.set('user_name', auth ? auth.getString('name') || auth.getString('email') : 'sistema')
    auditRec.set('user_email', auth ? auth.getString('email') : '')
    auditRec.set('action', action)
    auditRec.set('entity', 'Backup e Continuidade')
    auditRec.set('detail', detail)
    auditRec.set('metadata', metadata || {})
    $app.save(auditRec)
  } catch (_) {}
}

// Vincula os ativos do inventário citados no relatório do NOC
// (casamento tolerante por nome, isolado por organização)
const nocVincularAtivos = (organizationId, clientesStatus) => {
  const vinculados = []
  try {
    const itens = Array.isArray(clientesStatus) ? clientesStatus : []
    if (itens.length === 0) return vinculados
    const ativos = $app.findRecordsByFilter(
      'inventory_assets',
      `organization = '${organizationId}'`,
      '+name',
      200,
      0,
    )
    const norm = (s) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
    for (let i = 0; i < itens.length; i++) {
      const nome = String((itens[i] && itens[i].cliente) || '').trim()
      if (!nome) continue
      const nNorm = norm(nome)
      for (let a = 0; a < ativos.length; a++) {
        const aNome = String(ativos[a].getString('name') || '').trim()
        if (!aNome) continue
        const aNorm = norm(aNome)
        if (aNorm && (aNorm === nNorm || aNorm.includes(nNorm) || nNorm.includes(aNorm))) {
          vinculados.push({ ativo_id: ativos[a].id, ativo_nome: aNome, item_noc: nome })
          break
        }
      }
    }
  } catch (_) {}
  return vinculados
}

// Confronto NOC × sistema no mesmo dia (fuso America/Sao_Paulo).
// O veredito do sistema NUNCA é alterado pelo NOC — a divergência só é registrada.
const nocDetectarDivergencia = (organizationId, statusGeral, dataEmailIso) => {
  const res = { estado: 'sem_dados_sistema', divergencias: [], execucoes_analisadas: 0 }
  try {
    if (!dataEmailIso) return res
    const dObj = new Date(dataEmailIso)
    if (isNaN(dObj.getTime())) return res

    // Janela do dia local (UTC-3): 00:00–24:00 de SP, expressa em UTC
    const spShift = new Date(dObj.getTime() - 3 * 60 * 60 * 1000)
    const ini = new Date(
      Date.UTC(spShift.getUTCFullYear(), spShift.getUTCMonth(), spShift.getUTCDate(), 3, 0, 0),
    )
    const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000)

    // data_email é texto (formato ISO misto) — filtra por data em JS, não em SQL
    let execs = []
    try {
      execs = $app.findRecordsByFilter(
        'backup_execucoes',
        `organization = '${organizationId}'`,
        '-created',
        400,
        0,
      )
    } catch (_) {
      return res
    }

    let temSucesso = false
    let temFalha = false
    const execsIds = []
    for (let i = 0; i < execs.length; i++) {
      const ex = execs[i]
      const dtRaw = ex.getString('data_email') || ex.getString('data_inicio') || ''
      if (!dtRaw) continue
      const t = new Date(dtRaw).getTime()
      if (isNaN(t) || t < ini.getTime() || t >= fim.getTime()) continue
      execsIds.push(ex.id)
      const st = String(ex.getString('status') || '').toLowerCase()
      if (st === 'sucesso') temSucesso = true
      else if (st === 'erro' || st === 'falha') temFalha = true
    }

    res.execucoes_analisadas = execsIds.length
    if (execsIds.length === 0) return res

    res.estado = 'convergente'
    const nocOk = String(statusGeral) === 'ok'
    const agoraIso = new Date().toISOString()

    if (nocOk && temFalha) {
      res.estado = 'divergente'
      res.divergencias.push({
        tipo: 'noc_ok_sistema_falha',
        descricao:
          'O NOC reportou ambiente OK, porém o sistema registrou execução(ões) de backup com falha no mesmo dia. Veredito do sistema mantido.',
        detectado_em: agoraIso,
        data_referencia: dataEmailIso,
        status_noc: String(statusGeral),
        sistema: { execucoes: execsIds, tem_sucesso: temSucesso, tem_falha: temFalha },
      })
    } else if (!nocOk && temSucesso && !temFalha) {
      res.estado = 'divergente'
      res.divergencias.push({
        tipo: 'noc_falha_sistema_ok',
        descricao:
          'O NOC reportou falha no ambiente, porém o sistema registrou apenas execuções de backup com sucesso no mesmo dia. Veredito do sistema mantido.',
        detectado_em: agoraIso,
        data_referencia: dataEmailIso,
        status_noc: String(statusGeral),
        sistema: { execucoes: execsIds, tem_sucesso: temSucesso, tem_falha: temFalha },
      })
    }
    return res
  } catch (_) {
    return res
  }
}

// -------------------------------------------------------------
// Núcleo do Atestado Humano Diário
// (a) ocorrência com fato real estruturado por VM de falha
// (b) resolução automática de ocorrências NOC abertas quando relatório posterior OK
// (c) divergência NOC × sistema (veredito do sistema intacto)
//
// Nome interno nocAtestadoCore: publicado em globalThis.processarNocAtestado
// (contrato consumido por backup.js e pelo endpoint abaixo). O identificador
// nocAtestadoCore NUNCA é referenciado dentro de callbacks (escopo JSVM).
// -------------------------------------------------------------
const nocAtestadoCore = (
  organizationId,
  plainText,
  clientesStatus,
  statusGeral,
  acaoRealizada,
  dataEmailIso,
  remetente,
  assunto,
  evidenciaRec,
  monRec,
  auth,
) => {
  const resultado = {
    ocorrencia_id: null,
    ocorrencia_criada: false,
    resolvidas: 0,
    divergencias: [],
    ativos_vinculados: [],
    estado_confronto: 'sem_dados_sistema',
  }
  try {
    // --- FATO REAL estruturado por VM/cliente ---
    const itens = Array.isArray(clientesStatus) ? clientesStatus : []
    const vmsFalhas = []
    const vmsOk = []
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i] || {}
      const nome = String(it.cliente || it.nome || '').trim() || 'Item não identificado'
      const st = String(it.status || '').toUpperCase()
      const isFalha =
        st.includes('FAIL') || st.includes('ERROR') || st.includes('ERRO') || st.includes('FALHA')
      const det = String(it.acoes || it.detalhe || '').trim()
      if (isFalha) {
        vmsFalhas.push({ cliente: nome, status: String(it.status || 'Falha'), detalhe: det })
      } else {
        vmsOk.push({ cliente: nome, status: String(it.status || 'OK'), detalhe: det })
      }
    }

    const dataHoraSp = nocFormatarDataSp(dataEmailIso)
    const fatoReal = {
      origem: 'noc',
      monitoramento_id: monRec ? monRec.id : null,
      vms_falhas: vmsFalhas,
      vms_ok: vmsOk,
      acoes: String(acaoRealizada || ''),
      data_hora_sp: dataHoraSp,
      data_iso: String(dataEmailIso || ''),
      remetente: String(remetente || ''),
      assunto: String(assunto || ''),
    }

    // --- (c) Divergência NOC × sistema ---
    const conv = nocDetectarDivergencia(organizationId, statusGeral, dataEmailIso)
    resultado.divergencias = conv.divergencias
    resultado.estado_confronto = conv.estado
    const ativos = nocVincularAtivos(organizationId, clientesStatus)
    resultado.ativos_vinculados = ativos
    if (monRec) {
      monRec.set('divergencias', conv.divergencias)
      monRec.set('ativos_vinculados', ativos)
      $app.save(monRec)
    }

    // --- (b) Resolução automática: relatório NOC OK fecha ocorrências NOC abertas ---
    if (String(statusGeral) === 'ok') {
      try {
        const abertas = $app.findRecordsByFilter(
          'backup_ocorrencias',
          `organization = '${organizationId}' && status = 'aberta'`,
          '-created',
          50,
          0,
        )
        for (let i = 0; i < abertas.length; i++) {
          const oc = abertas[i]
          const fr = nocLerJson(oc.get('fato_real'))
          if (!fr || typeof fr !== 'object' || fr.origem !== 'noc') continue

          const parecer =
            `Ocorrência NOC #${oc.id} resolvida automaticamente: o relatório diário posterior do NOC (${dataHoraSp || 'data do relatório'}) ` +
            `reportou todos os backups do ambiente OK, confirmando a normalização do incidente. ` +
            `Relatório citado: monitoramento #${monRec ? monRec.id : 'n/d'}` +
            (evidenciaRec ? `, evidência #${evidenciaRec.id}` : '') +
            ` ('${String(assunto || '')}').`

          oc.set('status', 'resolvida')
          oc.set('resolvida_automaticamente', true)
          if (evidenciaRec) oc.set('resolvida_por_evidencia', evidenciaRec.id)
          oc.set('resolvida_em', new Date().toISOString())
          oc.set('resolucao', parecer)
          $app.save(oc)
          resultado.resolvidas++

          nocAuditEscrita(
            organizationId,
            auth,
            'NOC_OCORRENCIA_RESOLVED_AUTO',
            `Ocorrência NOC #${oc.id} encerrada automaticamente pelo atestado humano posterior do NOC (status OK) em ${dataHoraSp}.`,
            {
              ocorrencia_id: oc.id,
              monitoramento_id: monRec ? monRec.id : null,
              evidencia_id: evidenciaRec ? evidenciaRec.id : null,
              origem: 'noc',
            },
          )
        }
      } catch (_) {}
    }

    // --- (a) Ocorrência com fato real estruturado por VM de falha ---
    if (String(statusGeral) !== 'ok') {
      try {
        // Deduplicação: não reabrir para o mesmo monitoramento
        let jaExiste = false
        try {
          const existentes = $app.findRecordsByFilter(
            'backup_ocorrencias',
            `organization = '${organizationId}' && status != 'resolvida'`,
            '-created',
            100,
            0,
          )
          for (let i = 0; i < existentes.length; i++) {
            const fr = nocLerJson(existentes[i].get('fato_real'))
            if (
              fr &&
              typeof fr === 'object' &&
              fr.origem === 'noc' &&
              String(fr.monitoramento_id || '') === String(monRec ? monRec.id : '')
            ) {
              jaExiste = true
              resultado.ocorrencia_id = existentes[i].id
              break
            }
          }
        } catch (_) {}

        if (!jaExiste) {
          // Descrição factual por VM de falha (nome real reportado pelo NOC)
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
            const trecho = String(plainText || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 240)
            descricao =
              `O NOC (PRO IT CLOUD SOLUTIONS) reportou em ${dataHoraSp || 'data não informada'} ` +
              `inconformidade geral no ambiente de backup${trecho ? ': ' + trecho : '.'} `
          }
          if (acaoRealizada) {
            descricao += `Ações do técnico NOC: ${acaoRealizada}.`
          }
          if (conv.estado === 'divergente') {
            descricao += ' [Divergência NOC × sistema detectada — veredito do sistema mantido.]'
          }

          const ocCol = $app.findCollectionByNameOrId('backup_ocorrencias')
          const oc = new Record(ocCol)
          oc.set('organization', organizationId)
          oc.set('tipo', 'falha_de_backup')
          oc.set('severidade', 'alta')
          oc.set('status', 'aberta')
          oc.set(
            'titulo',
            `NOC (PRO IT CLOUD SOLUTIONS) reportou falha no backup (${dataHoraSp || 'Diário'})`,
          )
          oc.set('descricao', descricao.trim())
          if (evidenciaRec) oc.set('evidencia', evidenciaRec.id)
          oc.set('fato_real', fatoReal)
          $app.save(oc)

          resultado.ocorrencia_id = oc.id
          resultado.ocorrencia_criada = true
        }
      } catch (_) {}
    }

    // Sinaliza divergência na auditoria append-only
    if (conv.estado === 'divergente') {
      nocAuditEscrita(
        organizationId,
        auth,
        'NOC_DIVERGENCIA_SISTEMA',
        `Divergência NOC × sistema no backup: ${conv.divergencias
          .map((d) => d.descricao)
          .join(' ')} (relatório NOC de ${dataHoraSp}).`,
        {
          monitoramento_id: monRec ? monRec.id : null,
          evidencia_id: evidenciaRec ? evidenciaRec.id : null,
          divergencias: conv.divergencias,
          origem: 'noc',
        },
      )
    }

    return resultado
  } catch (err) {
    console.error('[noc:atestado]', err && (err.stack || err.message))
    return resultado
  }
}

// -------------------------------------------------------------
// Publicação no escopo global (compartilhado entre os arquivos de hook).
// Executa UMA vez, na carga do hook — nível superior, fora de qualquer
// callback. Os consumidores (backup.js e o endpoint abaixo) acessam sempre
// as propriedades globalThis.<nome-publicado>.
// -------------------------------------------------------------
globalThis.processarNocAtestado = nocAtestadoCore
globalThis.nocDetectarDivergencia = nocDetectarDivergencia
globalThis.nocVincularAtivos = nocVincularAtivos
globalThis.nocFormatarDataSp = nocFormatarDataSp
globalThis.nocLerJson = nocLerJson
globalThis.nocAudit = nocAuditEscrita

// -------------------------------------------------------------
// Endpoint: POST /backend/v1/backup/noc/avaliacao-manual
// Registra manualmente o Atestado Humano Diário (admin/suporte):
// monitoramento com origem_tipo='manual', registrado_por, hash do
// conteúdo (idempotência) e auditoria append-only.
// Dentro da callback nenhuma declaração de nível superior deste arquivo
// é referenciada — apenas e.*, builtins do JSVM e propriedades globalThis
// publicadas acima (nomes de publicação ≠ nomes das declarações locais).
// -------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/backup/noc/avaliacao-manual',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.forbiddenError('Não autenticado.')
      }

      const systemRole = auth.getString('system_role') || 'usuario'
      if (systemRole !== 'admin' && systemRole !== 'suporte') {
        return e.forbiddenError(
          'Apenas perfis Administrador e Suporte podem registrar avaliações manuais do NOC.',
        )
      }

      const body = e.requestInfo().body || {}
      let organizationId = body.organizationId || auth.getString('organization')
      if (!organizationId) {
        return e.badRequestError('Nenhuma organização associada.')
      }
      if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
        return e.forbiddenError('Acesso restrito à própria organização.')
      }

      const conteudo = String(body.conteudo || '').trim()
      if (conteudo.length < 10) {
        return e.badRequestError(
          'Descreva o resultado da conexão/validação manual (mínimo de 10 caracteres).',
        )
      }

      const statusGeralBruto = String(body.status_geral || '')
        .trim()
        .toLowerCase()
      const statusGeral = ['ok', 'falha', 'atencao'].includes(statusGeralBruto)
        ? statusGeralBruto
        : 'ok'

      let clientesStatus = Array.isArray(body.clientes_status) ? body.clientes_status : []
      clientesStatus = clientesStatus
        .map((c) => ({
          cliente: String((c && c.cliente) || '').trim(),
          status: String((c && c.status) || 'OK').trim() || 'OK',
          acoes: String((c && c.acoes) || '').trim(),
        }))
        .filter((c) => c.cliente)

      const acaoRealizada = String(body.acoes_realizadas || '').trim()
      const observacoes = String(body.observacoes || '').trim()
      const dataAvaliacaoBruta = String(body.data_avaliacao || '').trim()

      // Data factual da avaliação: informada pelo operador OU a data corrente
      // (no registro manual o atestado é feito no momento da conexão humana).
      let dataAvaliacaoIso = ''
      if (dataAvaliacaoBruta) {
        try {
          const d = new Date(dataAvaliacaoBruta)
          if (!isNaN(d.getTime())) dataAvaliacaoIso = d.toISOString()
        } catch (_) {}
      }
      if (!dataAvaliacaoIso) {
        dataAvaliacaoIso = new Date().toISOString()
      }

      const monCol = $app.findCollectionByNameOrId('backup_monitoramentos_externos')
      const hashManual = $security.sha256(conteudo + '::NOC-MANUAL::' + organizationId)

      // Idempotência por hash: a mesma avaliação não é registrada duas vezes
      let monRec = null
      try {
        const existentes = $app.findRecordsByFilter(
          'backup_monitoramentos_externos',
          `organization = '${organizationId}' && hash_conteudo = '${hashManual}'`,
          '',
          1,
          0,
        )
        if (existentes.length > 0) monRec = existentes[0]
      } catch (_) {}

      if (monRec) {
        return e.json(200, {
          success: true,
          idempotent: true,
          monitoramento_id: monRec.id,
          message: 'Esta avaliação manual do NOC já foi registrada anteriormente (idempotente).',
        })
      }

      monRec = new Record(monCol)
      monRec.set('organization', organizationId)
      monRec.set('origem_tipo', 'manual')
      monRec.set('registrado_por', auth.id)
      monRec.set('hash_conteudo', hashManual)
      monRec.set('data_monitoramento', dataAvaliacaoIso)
      monRec.set('origem_remetente', auth.getString('email') || 'registro manual')
      monRec.set('assunto', 'Avaliação manual do NOC')
      monRec.set('status_geral', statusGeral)
      monRec.set('clientes_status', clientesStatus)
      monRec.set('acoes_realizadas', acaoRealizada)
      monRec.set(
        'observacoes',
        observacoes || 'Atestado humano diário registrado manualmente pela equipe.',
      )
      monRec.set('conteudo_bruto', conteudo.slice(0, 10000))
      $app.save(monRec)

      // Mesmo ciclo do atestado por e-mail: fato real, resolução e divergência
      const nocRes = globalThis.processarNocAtestado(
        organizationId,
        conteudo,
        clientesStatus,
        statusGeral,
        acaoRealizada,
        dataAvaliacaoIso,
        auth.getString('email') || '',
        'Avaliação manual do NOC',
        null,
        monRec,
        auth,
      )

      globalThis.nocAudit(
        organizationId,
        auth,
        'NOC_AVALIACAO_MANUAL_REGISTRADA',
        `Atestado humano diário do NOC registrado manualmente com status "${statusGeral.toUpperCase()}" (monitoramento #${monRec.id}).`,
        {
          monitoramento_id: monRec.id,
          origem: 'manual',
          status_geral: statusGeral,
          clientes_count: clientesStatus.length,
          ocorrencia_id: nocRes.ocorrencia_id,
          ocorrencias_resolvidas: nocRes.resolvidas,
          divergencias_count: nocRes.divergencias.length,
          estado_confronto: nocRes.estado_confronto,
        },
      )

      return e.json(200, {
        success: true,
        idempotent: false,
        monitoramento_id: monRec.id,
        ocorrencia_id: nocRes.ocorrencia_id,
        ocorrencias_resolvidas: nocRes.resolvidas,
        divergencias: nocRes.divergencias,
        ativos_vinculados: nocRes.ativos_vinculados,
        estado_confronto: nocRes.estado_confronto,
        message: 'Avaliação manual do NOC registrada no Monitoramento Externo.',
      })
    } catch (err) {
      console.error('[noc:avaliacao-manual]', err && (err.stack || err.message))
      const detalhe = String(err && err.message ? err.message : err).slice(0, 200)
      return e.badRequestError('Não foi possível registrar a avaliação manual do NOC: ' + detalhe)
    }
  },
  $apis.requireAuth(),
)
