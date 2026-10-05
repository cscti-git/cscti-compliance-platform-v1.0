migrate(
  (app) => {
    // 1. Catalogs: organization_types and institutional_services
    const orgTypes = new Collection({
      name: 'organization_types',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_org_types_code ON organization_types (code)'],
    })
    app.save(orgTypes)

    const instServices = new Collection({
      name: 'institutional_services',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_inst_services_code ON institutional_services (code)'],
    })
    app.save(instServices)

    // 2. Organizations collection
    const organizations = new Collection({
      name: 'organizations',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.organization = id || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.organization = id || @request.auth.system_role = 'admin')",
      createRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      updateRule:
        "@request.auth.id != '' && ((@request.auth.organization = id && @request.auth.system_role = 'admin') || @request.auth.system_role = 'admin')",
      deleteRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'corporate_name', type: 'text' }, // Razão Social
        { name: 'trade_name', type: 'text' }, // Nome Fantasia
        { name: 'cnpj', type: 'text' },
        { name: 'contact_name', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'website', type: 'text' },
        { name: 'phone', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativa', 'inativa'],
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'relation',
          required: false,
          collectionId: orgTypes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'services',
          type: 'relation',
          required: false,
          collectionId: instServices.id,
          cascadeDelete: false,
          maxSelect: 20,
        },
        // Provimento 243/2026 e 213/2026 CNJ:
        // Classe C1 (≤ 300 mil), C2 (> 300k até 1.5 mi), C3 (> 1.5 mi)
        { name: 'provimento_class', type: 'select', values: ['C1', 'C2', 'C3'], maxSelect: 1 },
        {
          name: 'provimento_subclass',
          type: 'select',
          values: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
          maxSelect: 1,
        },
        { name: 'revenue_range', type: 'text' },
        { name: 'deadline_stage_1_days', type: 'number' }, // 180, 240, 300 conforme classe
        { name: 'deadline_stage_2_days', type: 'number' },
        // Localização
        { name: 'address_type', type: 'text' }, // Tipo/Sede
        { name: 'zip_code', type: 'text' },
        { name: 'street', type: 'text' },
        { name: 'number', type: 'text' },
        { name: 'complement', type: 'text' },
        { name: 'neighborhood', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'country', type: 'text' },
        // Identidade Visual da Serventia/Instância
        { name: 'app_product_name', type: 'text' },
        { name: 'app_header_title', type: 'text' },
        { name: 'app_institutional_text', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_organizations_name ON organizations (name)'],
    })
    app.save(organizations)

    // 3. Extend users with organization, system_role, is_active, last_access
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('organization')) {
      users.fields.add(
        new RelationField({
          name: 'organization',
          collectionId: organizations.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!users.fields.getByName('system_role')) {
      users.fields.add(
        new SelectField({
          name: 'system_role',
          values: ['admin', 'suporte', 'usuario'],
          maxSelect: 1,
        }),
      )
    }
    if (!users.fields.getByName('is_active')) {
      users.fields.add(
        new BoolField({
          name: 'is_active',
        }),
      )
    }
    if (!users.fields.getByName('last_access')) {
      users.fields.add(
        new DateField({
          name: 'last_access',
        }),
      )
    }
    // Update users API access rules so users can see/manage users within their organization
    users.listRule =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')"
    users.viewRule =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')"
    users.createRule = "@request.auth.id != '' && @request.auth.system_role = 'admin'"
    users.updateRule =
      "@request.auth.id != '' && (id = @request.auth.id || (@request.auth.system_role = 'admin' && organization = @request.auth.organization))"
    users.deleteRule =
      "@request.auth.id != '' && @request.auth.system_role = 'admin' && organization = @request.auth.organization && id != @request.auth.id"
    app.save(users)

    // 4. People (Pessoas Responsáveis por organização)
    const people = new Collection({
      name: 'people',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: organizations.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'role_title', type: 'text' }, // cargo da pessoa
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_people_org ON people (organization)'],
    })
    app.save(people)

    // 5. Roles (Papéis de responsabilidade institucional/legal/segurança)
    const roles = new Collection({
      name: 'roles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text', required: true }, // Ex: RESP-INSTITUCIONAL
        { name: 'description', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'suggested_mode', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_roles_code ON roles (code)'],
    })
    app.save(roles)

    // 6. Assignments (Atribuições pessoa + papel com vigência)
    const assignments = new Collection({
      name: 'assignments',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: organizations.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'person',
          type: 'relation',
          required: true,
          collectionId: people.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'role',
          type: 'relation',
          required: true,
          collectionId: roles.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo', 'encerrado'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_assignments_org ON assignments (organization)'],
    })
    app.save(assignments)

    // 7. Integrations (GLPI e E-mail de backup)
    const integrations = new Collection({
      name: 'integrations',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      deleteRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: organizations.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['glpi', 'email_backup'],
          maxSelect: 1,
        },
        { name: 'enabled', type: 'bool' },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'inativo', 'pendente', 'erro'],
          maxSelect: 1,
        },
        // GLPI config
        { name: 'glpi_url', type: 'text' },
        { name: 'glpi_sync_limit', type: 'number' },
        { name: 'glpi_ssl_verify', type: 'bool' },
        { name: 'glpi_app_token', type: 'text' },
        { name: 'glpi_user_token', type: 'text' },
        { name: 'glpi_has_app_token', type: 'bool' },
        { name: 'glpi_has_user_token', type: 'bool' },
        // Email IMAP config
        { name: 'email_name', type: 'text' },
        { name: 'email_host', type: 'text' },
        { name: 'email_port', type: 'number' },
        { name: 'email_protocol', type: 'text' },
        { name: 'email_security', type: 'text' },
        { name: 'email_user', type: 'text' },
        { name: 'email_folder', type: 'text' },
        { name: 'email_description', type: 'text' },
        { name: 'email_password', type: 'text' },
        { name: 'email_has_password', type: 'bool' },
        { name: 'last_sync', type: 'date' },
        { name: 'last_sync_status', type: 'text' },
        { name: 'last_sync_message', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_integrations_org_type ON integrations (organization, type)'],
    })
    app.save(integrations)

    // 8. Audit Log
    const auditLog = new Collection({
      name: 'audit_log',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: false,
          collectionId: organizations.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'user_name', type: 'text' },
        { name: 'user_email', type: 'text' },
        { name: 'action', type: 'text', required: true },
        { name: 'entity', type: 'text' },
        { name: 'detail', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'ip_address', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_audit_org_created ON audit_log (organization, created DESC)'],
    })
    app.save(auditLog)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('audit_log')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('integrations')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('assignments')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('roles')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('people')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('organizations')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('institutional_services')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('organization_types')
      app.delete(col)
    } catch (_) {}
  },
)
