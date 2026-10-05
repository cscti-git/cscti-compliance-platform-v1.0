migrate(
  (app) => {
    const orgTypes = app.findCollectionByNameOrId('organization_types')
    const instServices = app.findCollectionByNameOrId('institutional_services')
    const orgs = app.findCollectionByNameOrId('organizations')
    const roles = app.findCollectionByNameOrId('roles')
    const people = app.findCollectionByNameOrId('people')
    const assignments = app.findCollectionByNameOrId('assignments')
    const integrations = app.findCollectionByNameOrId('integrations')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Seed Organization Types
    const typeSeeds = [
      {
        name: 'Tabelionato de Notas',
        code: 'TAB-NOTAS',
        desc: 'Serventia notarial para lavratura de escrituras, procurações e testamentos.',
      },
      {
        name: 'Registro de Imóveis',
        code: 'REG-IMOVEIS',
        desc: 'Serventia de registro imobiliário com atribuição territorial.',
      },
      {
        name: 'Registro Civil das Pessoas Naturais',
        code: 'REG-CIVIL-PN',
        desc: 'Registro de nascimentos, casamentos e óbitos.',
      },
      {
        name: 'Tabelionato de Protesto de Títulos',
        code: 'TAB-PROTESTO',
        desc: 'Protesto de títulos e outros documentos de dívida.',
      },
      {
        name: 'Registro de Títulos e Documentos e Civil de PJ',
        code: 'REG-RTDPJ',
        desc: 'Registro de títulos, contratos e pessoas jurídicas.',
      },
    ]

    const createdTypeIds = []
    for (let i = 0; i < typeSeeds.length; i++) {
      const item = typeSeeds[i]
      let rec
      try {
        rec = app.findFirstRecordByData('organization_types', 'code', item.code)
      } catch (_) {
        rec = new Record(orgTypes)
        rec.set('name', item.name)
        rec.set('code', item.code)
        rec.set('description', item.desc)
        rec.set('status', 'ativo')
        app.save(rec)
      }
      createdTypeIds.push(rec.id)
    }

    // 2. Seed Institutional Services
    const serviceSeeds = [
      {
        name: 'Lavratura de Escrituras Públicas',
        code: 'SERV-ESCRITURAS',
        desc: 'Compra e venda, doação, inventários e partilhas.',
      },
      {
        name: 'Reconhecimento de Firmas e Autenticação',
        code: 'SERV-AUTENTICACAO',
        desc: 'Atos notariais de fé pública.',
      },
      {
        name: 'Matrícula e Averbação Imobiliária',
        code: 'SERV-MATRICULAS',
        desc: 'Atos de registro e averbações imobiliárias.',
      },
      {
        name: 'Certidões e Pesquisas Digitais',
        code: 'SERV-CERTIDOES',
        desc: 'Emissão eletrônica via centrais registrais (ONR/CENSEC).',
      },
      {
        name: 'Registro de Contratos e Notificações',
        code: 'SERV-RTD',
        desc: 'Notificações extrajudiciais e registro documental.',
      },
    ]

    const createdServiceIds = []
    for (let i = 0; i < serviceSeeds.length; i++) {
      const item = serviceSeeds[i]
      let rec
      try {
        rec = app.findFirstRecordByData('institutional_services', 'code', item.code)
      } catch (_) {
        rec = new Record(instServices)
        rec.set('name', item.name)
        rec.set('code', item.code)
        rec.set('description', item.desc)
        rec.set('status', 'ativo')
        app.save(rec)
      }
      createdServiceIds.push(rec.id)
    }

    // 3. Seed 5 Classic Responsibility Roles
    const roleSeeds = [
      {
        name: 'Responsável Institucional',
        code: 'RESP-INSTITUCIONAL',
        desc: 'Titular/Delegatário da serventia responsável legal final pela governança e conformidade.',
        mode: 'Titular da Serventia',
      },
      {
        name: 'Responsável Legal',
        code: 'RESP-LEGAL',
        desc: 'Oficial designado ou assessoria jurídica responsável pelo cumprimento de prazos normativos do CNJ.',
        mode: 'Assessoria / Diretoria',
      },
      {
        name: 'Responsável por Segurança',
        code: 'RESP-SEGURANCA',
        desc: 'Gestor de Segurança da Informação (GSI / CISO) ou encarregado de TI responsável pelo Provimento 243/213.',
        mode: 'TI / Segurança',
      },
      {
        name: 'Responsável Oficial',
        code: 'RESP-OFICIAL',
        desc: 'Tabelião ou Oficial Registrador formalmente empossado.',
        mode: 'Oficial Registrador',
      },
      {
        name: 'Responsável Substituto',
        code: 'RESP-SUBSTITUTO',
        desc: 'Substituto legal imediato nos termos da Lei 8.935/1994.',
        mode: 'Tabelião Substituto',
      },
    ]

    const createdRoleIds = {}
    for (let i = 0; i < roleSeeds.length; i++) {
      const item = roleSeeds[i]
      let rec
      try {
        rec = app.findFirstRecordByData('roles', 'code', item.code)
      } catch (_) {
        rec = new Record(roles)
        rec.set('name', item.name)
        rec.set('code', item.code)
        rec.set('description', item.desc)
        rec.set('status', 'ativo')
        rec.set('suggested_mode', item.mode)
        app.save(rec)
      }
      createdRoleIds[item.code] = rec.id
    }

    // 4. Seed Organization "CSCTI - teste"
    let orgRecord
    try {
      orgRecord = app.findFirstRecordByData('organizations', 'name', 'CSCTI - teste')
    } catch (_) {
      orgRecord = new Record(orgs)
      orgRecord.set('name', 'CSCTI - teste')
      orgRecord.set('corporate_name', '1º Tabelionato de Notas e Protesto - Comarca Demonstração')
      orgRecord.set('trade_name', 'Cartório CSCTI Compliance')
      orgRecord.set('cnpj', '12.345.678/0001-90')
      orgRecord.set('contact_name', 'Dr. Leandro Silva')
      orgRecord.set('email', 'contato@cscti.com.br')
      orgRecord.set('website', 'https://cscti.com.br')
      orgRecord.set('phone', '(11) 3214-5500')
      orgRecord.set('status', 'ativa')
      orgRecord.set('type', createdTypeIds[0] || null)
      orgRecord.set('services', createdServiceIds.slice(0, 3))
      // Provimento 243/2026 CNJ:
      // Classe C2 (entre 300 mil e 1.5 milhão), subclasse D
      orgRecord.set('provimento_class', 'C2')
      orgRecord.set('provimento_subclass', 'D')
      orgRecord.set('revenue_range', 'R$ 300.001,00 a R$ 1.500.000,00 semestrais')
      orgRecord.set('deadline_stage_1_days', 240) // C1=180, C2=240, C3=300
      orgRecord.set('deadline_stage_2_days', 240)
      // Localização
      orgRecord.set('address_type', 'Sede Principal')
      orgRecord.set('zip_code', '01310-100')
      orgRecord.set('street', 'Avenida Paulista')
      orgRecord.set('number', '1000')
      orgRecord.set('complement', 'Andar 12 - Conjunto 121')
      orgRecord.set('neighborhood', 'Bela Vista')
      orgRecord.set('city', 'São Paulo')
      orgRecord.set('state', 'SP')
      orgRecord.set('country', 'Brasil')
      // Identidade visual
      orgRecord.set('app_product_name', 'CSCTI — Compliance Platform V2')
      orgRecord.set('app_header_title', 'Governança, conformidade e gestão institucional')
      orgRecord.set(
        'app_institutional_text',
        'Serventia Extrajudicial em Conformidade com o Provimento 243/2026 CNJ',
      )
      app.save(orgRecord)
    }

    // 5. Seed or Update Admin User leandro@cscti.com.br
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'leandro@cscti.com.br')
      userRecord.set('organization', orgRecord.id)
      userRecord.set('system_role', 'admin')
      userRecord.set('is_active', true)
      userRecord.set('name', 'Leandro — Administrador')
      app.save(userRecord)
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('leandro@cscti.com.br')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Leandro — Administrador')
      userRecord.set('organization', orgRecord.id)
      userRecord.set('system_role', 'admin')
      userRecord.set('is_active', true)
      app.save(userRecord)
    }

    // 6. Seed People
    let personLeandro
    try {
      personLeandro = app.findFirstRecordByData('people', 'email', 'leandro@cscti.com.br')
    } catch (_) {
      personLeandro = new Record(people)
      personLeandro.set('organization', orgRecord.id)
      personLeandro.set('name', 'Leandro Silva')
      personLeandro.set('role_title', 'Tabelião Titular e Responsável por Segurança')
      personLeandro.set('email', 'leandro@cscti.com.br')
      personLeandro.set('phone', '(11) 98765-4321')
      personLeandro.set('status', 'ativo')
      app.save(personLeandro)
    }

    let personSubstituta
    try {
      personSubstituta = app.findFirstRecordByData(
        'people',
        'email',
        'mariana.substituta@cscti.com.br',
      )
    } catch (_) {
      personSubstituta = new Record(people)
      personSubstituta.set('organization', orgRecord.id)
      personSubstituta.set('name', 'Dra. Mariana Costa')
      personSubstituta.set('role_title', 'Tabeliã Substituta')
      personSubstituta.set('email', 'mariana.substituta@cscti.com.br')
      personSubstituta.set('phone', '(11) 97654-3210')
      personSubstituta.set('status', 'ativo')
      app.save(personSubstituta)
    }

    // 7. Seed Assignments
    try {
      const existing = app.findRecordsByFilter(
        'assignments',
        `organization = '${orgRecord.id}'`,
        '',
        1,
        0,
      )
      if (existing.length === 0) {
        if (createdRoleIds['RESP-INSTITUCIONAL']) {
          const a1 = new Record(assignments)
          a1.set('organization', orgRecord.id)
          a1.set('person', personLeandro.id)
          a1.set('role', createdRoleIds['RESP-INSTITUCIONAL'])
          a1.set('start_date', '2025-01-01 00:00:00.000Z')
          a1.set('status', 'ativo')
          a1.set('notes', 'Designação como Responsável Institucional pelo Provimento CNJ')
          app.save(a1)
        }
        if (createdRoleIds['RESP-SEGURANCA']) {
          const a2 = new Record(assignments)
          a2.set('organization', orgRecord.id)
          a2.set('person', personLeandro.id)
          a2.set('role', createdRoleIds['RESP-SEGURANCA'])
          a2.set('start_date', '2025-01-01 00:00:00.000Z')
          a2.set('status', 'ativo')
          a2.set('notes', 'Gestor de Segurança da Informação da Serventia')
          app.save(a2)
        }
        if (createdRoleIds['RESP-SUBSTITUTO']) {
          const a3 = new Record(assignments)
          a3.set('organization', orgRecord.id)
          a3.set('person', personSubstituta.id)
          a3.set('role', createdRoleIds['RESP-SUBSTITUTO'])
          a3.set('start_date', '2025-01-01 00:00:00.000Z')
          a3.set('status', 'ativo')
          a3.set('notes', 'Tabeliã Substituta designada')
          app.save(a3)
        }
      }
    } catch (_) {}

    // 8. Seed Default Integrations (GLPI e E-mail de backup)
    try {
      const existingGlpi = app.findRecordsByFilter(
        'integrations',
        `organization = '${orgRecord.id}' && type = 'glpi'`,
        '',
        1,
        0,
      )
      if (existingGlpi.length === 0) {
        const glpi = new Record(integrations)
        glpi.set('organization', orgRecord.id)
        glpi.set('type', 'glpi')
        glpi.set('enabled', true)
        glpi.set('status', 'ativo')
        glpi.set('glpi_url', 'https://suporte.cartoriocscti.com.br/apirest.php')
        glpi.set('glpi_sync_limit', 100)
        glpi.set('glpi_ssl_verify', true)
        glpi.set('glpi_has_app_token', true)
        glpi.set('glpi_has_user_token', true)
        glpi.set('glpi_app_token', 'glpi_app_token_hashed_sample')
        glpi.set('glpi_user_token', 'glpi_user_token_hashed_sample')
        app.save(glpi)
      }
    } catch (_) {}

    try {
      const existingEmail = app.findRecordsByFilter(
        'integrations',
        `organization = '${orgRecord.id}' && type = 'email_backup'`,
        '',
        1,
        0,
      )
      if (existingEmail.length === 0) {
        const mail = new Record(integrations)
        mail.set('organization', orgRecord.id)
        mail.set('type', 'email_backup')
        mail.set('enabled', true)
        mail.set('status', 'ativo')
        mail.set('email_name', 'E-mail de comprovação de backup')
        mail.set('email_host', 'imap.gmail.com')
        mail.set('email_port', 993)
        mail.set('email_protocol', 'IMAP')
        mail.set('email_security', 'SSL/TLS')
        mail.set('email_user', 'backups.cartoriocscti@gmail.com')
        mail.set('email_folder', 'INBOX')
        mail.set('email_description', 'E-mail de confirmação dos backups da serventia')
        mail.set('email_has_password', true)
        mail.set('email_password', 'secret_app_password_vault')
        app.save(mail)
      }
    } catch (_) {}
  },
  (app) => {
    // Reversible cleanups if needed
  },
)
