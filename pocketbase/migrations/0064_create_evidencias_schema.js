migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    const inventoryAssets = app.findCollectionByNameOrId('inventory_assets')

    // 1. Coleção evidencia_categorias (Catálogo de Categorias de Evidências por serventia ou default)
    const evidenciaCategorias = new Collection({
      name: 'evidencia_categorias',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'icone', type: 'text' },
        { name: 'ordem', type: 'number' },
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
      indexes: [
        'CREATE INDEX idx_evid_cat_org ON evidencia_categorias (organization, ordem, name)',
      ],
    })
    app.save(evidenciaCategorias)

    // 2. Coleção evidencias (Evidências fotográficas e documentais por serventia)
    const evidencias = new Collection({
      name: 'evidencias',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'relation',
          required: false,
          collectionId: evidenciaCategorias.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'categoria_nome', type: 'text', required: true },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'data_evidencia', type: 'date', required: true },
        { name: 'responsavel_registro', type: 'text', required: true },
        { name: 'tags', type: 'json' },
        {
          name: 'ativo_vinculado',
          type: 'relation',
          required: false,
          collectionId: inventoryAssets.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'arquivos',
          type: 'file',
          maxSelect: 20,
          maxSize: 31457280, // 30 MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['conforme', 'pendente_revisao', 'arquivado'],
          maxSelect: 1,
        },
        { name: 'observacoes_revisao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_evidencias_org_cat ON evidencias (organization, categoria_nome)',
        'CREATE INDEX idx_evidencias_org_data ON evidencias (organization, data_evidencia DESC)',
        'CREATE INDEX idx_evidencias_org_status ON evidencias (organization, status)',
        'CREATE INDEX idx_evidencias_org_ativo ON evidencias (organization, ativo_vinculado)',
      ],
    })
    app.save(evidencias)

    // 3. Seed de categorias padrão para todas as organizações existentes
    const defaultCategories = [
      { name: 'Gerador de energia', code: 'GERADOR', ordem: 10, icone: 'Zap' },
      { name: 'Servidores', code: 'SERVIDORES', ordem: 20, icone: 'Server' },
      { name: 'Switches / Redes', code: 'SWITCHES_REDES', ordem: 30, icone: 'Network' },
      { name: 'Sala de TI', code: 'SALA_TI', ordem: 40, icone: 'DoorOpen' },
      { name: 'Redundância (energia/links)', code: 'REDUNDANCIA', ordem: 50, icone: 'GitCompare' },
      { name: 'Nobreaks', code: 'NOBREAKS', ordem: 60, icone: 'BatteryCharging' },
      { name: 'Racks', code: 'RACKS', ordem: 70, icone: 'Layers' },
      { name: 'Ar-condicionado', code: 'AR_CONDICIONADO', ordem: 80, icone: 'Thermometer' },
      { name: 'Extintores de incêndio', code: 'EXTINTORES', ordem: 90, icone: 'Flame' },
      {
        name: 'Documentos e Políticas',
        code: 'DOCUMENTOS_POLITICAS',
        ordem: 100,
        icone: 'FileText',
      },
    ]

    try {
      const allOrgs = app.findRecordsByFilter('organizations', '', '', 100, 0)
      for (let o = 0; o < allOrgs.length; o++) {
        const orgId = allOrgs[o].id
        for (let c = 0; c < defaultCategories.length; c++) {
          const cat = defaultCategories[c]
          const catRec = new Record(evidenciaCategorias)
          catRec.set('organization', orgId)
          catRec.set('name', cat.name)
          catRec.set('code', cat.code)
          catRec.set('description', 'Categoria de evidência comprobatória')
          catRec.set('icone', cat.icone)
          catRec.set('ordem', cat.ordem)
          catRec.set('status', 'ativo')
          try {
            app.save(catRec)
          } catch (_) {}
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('evidencias')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('evidencia_categorias')
      app.delete(col)
    } catch (_) {}
  },
)
