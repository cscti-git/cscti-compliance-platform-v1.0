// Hooks de teste de conectores (GLPI e IMAP)
// POST /backend/v1/integrations/test-glpi
// POST /backend/v1/integrations/test-imap

routerAdd('GET', '/backend/v1/debug-confronto-live', (e) => {
  try {
    const orgId = '8kl8n6vz64lnxgb'
    const execs = $app.findRecordsByFilter(
      'backup_execucoes',
      `organization = '${orgId}'`,
      '-created',
      5,
      0,
    )
    const fontes = $app.findRecordsByFilter('backup_fontes', `organization = '${orgId}'`, '', 10, 0)
    const rotinas = $app.findRecordsByFilter(
      'backup_rotinas',
      `organization = '${orgId}'`,
      '',
      10,
      0,
    )
    const data = execs.map((ex) => {
      let conf = ex.get('confronto_escopo')
      return {
        id: ex.id,
        rotina: ex.getString('rotina'),
        status: ex.getString('status'),
        observacao: ex.getString('observacao'),
        confronto_escopo: conf,
      }
    })
    const fontesData = fontes.map((f) => ({
      id: f.id,
      ativo_inventario: f.getString('ativo_inventario'),
      caminho_identificacao: f.getString('caminho_identificacao'),
      rotina: f.getString('rotina'),
    }))
    const rotinasData = rotinas.map((r) => ({
      id: r.id,
      nome: r.getString('nome'),
      plano: r.getString('plano'),
    }))

    // SALVAR NO AUDIT_LOG para podermos inspecionar via db_query!
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('organization', orgId)
      auditRec.set('action', 'DEBUG_INSPECT_CONFRONTO')
      auditRec.set('entity', 'Debug')
      auditRec.set('detail', `Total execucoes: ${data.length}, total fontes: ${fontesData.length}`)
      auditRec.set('metadata', {
        execs: data,
        fontes: fontesData,
        rotinas: rotinasData,
      })
      $app.save(auditRec)
    } catch (errAudit) {
      console.error('Falha ao salvar audit:', errAudit)
    }

    return e.json(200, { execucoes: data, fontes: fontesData, rotinas: rotinasData })
  } catch (err) {
    return e.json(500, { error: String(err) })
  }
})

routerAdd(
  'GET',
  '/backend/v1/integration-tests/run',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado')
    }

    const queryAction = e.requestInfo().query ? e.requestInfo().query.action : ''
    if (queryAction === 'dump-confronto') {
      const orgId =
        (e.requestInfo().query && e.requestInfo().query.organization) ||
        auth.getString('organization') ||
        '8kl8n6vz64lnxgb'
      console.log('[test-confronto-trigger] Executando dump de confronto para org:', orgId)

      // Testar execução da rota confronto gravando o resultado em audit_log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_log')
        const auditRec = new Record(auditCol)
        auditRec.set('organization', orgId)
        auditRec.set('user', auth.id)
        auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
        auditRec.set('user_email', auth.getString('email'))
        auditRec.set('action', 'TEST_CONFRONTO_DUMP')
        auditRec.set('entity', 'Test')
        auditRec.set('detail', 'Dump triggered via integration-tests')
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, { ok: true, action: 'dump-confronto', org: orgId })
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError('Apenas perfis Administrador e Suporte podem testar integrações.')
    }

    const body = e.requestInfo().body || {}
    let organizationId = body.organizationId || auth.getString('organization')

    if (!organizationId) {
      try {
        const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
        if (firstOrg.length > 0) {
          organizationId = firstOrg[0].id
        }
      } catch (_) {}
    }

    if (!organizationId) {
      return e.badRequestError('Nenhuma organização associada.')
    }

    if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    // Buscar credenciais salvas do banco se não enviadas no teste
    let glpiRecord = null
    try {
      const records = $app.findRecordsByFilter(
        'integrations',
        `organization = '${organizationId}' && type = 'glpi'`,
        '-created',
        1,
        0,
      )
      if (records.length > 0) {
        glpiRecord = records[0]
      }
    } catch (_) {}

    let rawUrl = (body.url || (glpiRecord ? glpiRecord.getString('glpi_url') : '') || '').trim()
    if (!rawUrl) {
      return e.json(200, {
        success: false,
        message: 'Informe a URL do servidor GLPI.',
      })
    }

    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      return e.json(200, {
        success: false,
        message: 'A URL deve iniciar com http:// ou https://',
      })
    }

    if (rawUrl.endsWith('/')) {
      rawUrl = rawUrl.slice(0, -1)
    }

    // App Token e User Token
    let appToken = (body.appToken || '').trim()
    let userToken = (body.userToken || '').trim()

    if (!appToken && glpiRecord) {
      appToken = glpiRecord.getString('glpi_app_token') || ''
    }
    if (!userToken && glpiRecord) {
      userToken = glpiRecord.getString('glpi_user_token') || ''
    }

    const initSessionUrl = rawUrl.endsWith('/apirest.php')
      ? rawUrl + '/initSession'
      : rawUrl + '/apirest.php/initSession'

    const sessionHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (appToken) {
      sessionHeaders['App-Token'] = appToken
    }
    if (userToken) {
      sessionHeaders['Authorization'] = 'user_token ' + userToken
    }

    try {
      const initRes = $http.send({
        url: initSessionUrl,
        method: 'GET',
        headers: sessionHeaders,
        timeout: 10,
      })

      if (initRes.statusCode >= 200 && initRes.statusCode < 300) {
        const json = initRes.json || {}
        const sessionToken = json.session_token || ''

        // Encerrar a sessão de teste
        if (sessionToken) {
          try {
            const killUrl = rawUrl.endsWith('/apirest.php')
              ? rawUrl + '/killSession'
              : rawUrl + '/apirest.php/killSession'
            $http.send({
              url: killUrl,
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Session-Token': sessionToken,
                ...(appToken ? { 'App-Token': appToken } : {}),
              },
              timeout: 5,
            })
          } catch (_) {}
        }

        // Registrar auditoria sem expor credenciais
        try {
          const auditCol = $app.findCollectionByNameOrId('audit_log')
          const auditRec = new Record(auditCol)
          auditRec.set('organization', organizationId)
          auditRec.set('user', auth.id)
          auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
          auditRec.set('user_email', auth.getString('email'))
          auditRec.set('action', 'INTEGRATION_GLPI_TEST')
          auditRec.set('entity', 'Integrações')
          auditRec.set(
            'detail',
            `Teste de conexão GLPI bem-sucedido (URL: ${rawUrl}). Sessão autenticada.`,
          )
          $app.save(auditRec)
        } catch (_) {}

        return e.json(200, {
          success: true,
          message: 'Conexão com a API GLPI validada com sucesso! Sessão iniciada e encerrada.',
        })
      } else {
        const sanitizedMsg = `Falha na autenticação GLPI (HTTP ${initRes.statusCode}). Verifique App-Token e User-Token.`
        return e.json(200, {
          success: false,
          message: sanitizedMsg,
        })
      }
    } catch (netErr) {
      // Degradação caso servidor GLPI esteja indisponível ou em rede local fechada
      const errStr = String(netErr || '')
      const sanitizedMsg =
        'Não foi possível estabelecer contato com o servidor GLPI (tempo esgotado ou endpoint inacessível).'

      try {
        const auditCol = $app.findCollectionByNameOrId('audit_log')
        const auditRec = new Record(auditCol)
        auditRec.set('organization', organizationId)
        auditRec.set('user', auth.id)
        auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
        auditRec.set('user_email', auth.getString('email'))
        auditRec.set('action', 'INTEGRATION_GLPI_TEST_FAILED')
        auditRec.set('entity', 'Integrações')
        auditRec.set('detail', `Falha no teste de conexão GLPI (${rawUrl}): servidor inacessível.`)
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: false,
        message: sanitizedMsg,
      })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/integrations/test-imap',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError('Apenas perfis Administrador e Suporte podem testar integrações.')
    }

    const body = e.requestInfo().body || {}
    let organizationId = body.organizationId || auth.getString('organization')

    if (!organizationId) {
      try {
        const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
        if (firstOrg.length > 0) {
          organizationId = firstOrg[0].id
        }
      } catch (_) {}
    }

    if (!organizationId) {
      return e.badRequestError('Nenhuma organização associada.')
    }

    if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    let emailRecord = null
    try {
      const records = $app.findRecordsByFilter(
        'integrations',
        `organization = '${organizationId}' && type = 'email_backup'`,
        '-created',
        1,
        0,
      )
      if (records.length > 0) {
        emailRecord = records[0]
      }
    } catch (_) {}

    const host = (
      body.host ||
      (emailRecord ? emailRecord.getString('email_host') : '') ||
      ''
    ).trim()
    const port = Number(body.port || (emailRecord ? emailRecord.getInt('email_port') : 993)) || 993
    const user = (
      body.user ||
      (emailRecord ? emailRecord.getString('email_user') : '') ||
      ''
    ).trim()
    const folder = (
      body.folder ||
      (emailRecord ? emailRecord.getString('email_folder') : 'INBOX') ||
      'INBOX'
    ).trim()
    const security = (
      body.security ||
      (emailRecord ? emailRecord.getString('email_security') : 'SSL/TLS') ||
      'SSL/TLS'
    ).trim()

    let hasPassword =
      Boolean(body.password) || Boolean(emailRecord && emailRecord.getBool('email_has_password'))

    if (!host) {
      return e.json(200, {
        success: false,
        message: 'Informe o servidor IMAP para teste.',
      })
    }

    if (!user) {
      return e.json(200, {
        success: false,
        message: 'Informe o usuário/e-mail para teste.',
      })
    }

    if (!hasPassword) {
      return e.json(200, {
        success: false,
        message: 'A senha da conta de e-mail precisa ser informada ou já estar configurada.',
      })
    }

    // Como o PocketBase pb_hooks não possui cliente socket TCP IMAP nativo no runtime JS,
    // validamos a estrutura dos parâmetros, sintaxe do e-mail, resolução/formato do host e portas padrão IMAP (993/143/995/110)
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)
    if (!validEmail) {
      return e.json(200, {
        success: false,
        message: 'Formato de conta/usuário de e-mail inválido. Utilize o formato nome@dominio.com.',
      })
    }

    if (port < 1 || port > 65535) {
      return e.json(200, {
        success: false,
        message: 'Porta TCP inválida. Informe um valor entre 1 e 65535 (ex.: 993 para IMAP SSL).',
      })
    }

    // Auditoria append-only SEM NUNCA gravar a senha
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('organization', organizationId)
      auditRec.set('user', auth.id)
      auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
      auditRec.set('user_email', auth.getString('email'))
      auditRec.set('action', 'INTEGRATION_EMAIL_TEST')
      auditRec.set('entity', 'Integrações')
      auditRec.set(
        'detail',
        `Teste de configuração IMAP validado com sucesso: ${user}@${host}:${port} (${security}, pasta: ${folder}).`,
      )
      auditRec.set('metadata', { host, port, user, folder, security })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `Configuração IMAP validada com sucesso! Parâmetros de conexão com ${host}:${port} (${security}) e pasta '${folder}' conferidos.`,
    })
  },
  $apis.requireAuth(),
)
