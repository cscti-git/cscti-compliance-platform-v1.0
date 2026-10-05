migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    const people = app.findCollectionByNameOrId('people')
    const integrations = app.findCollectionByNameOrId('integrations')

    // 1. Coleção inventory_assets
    const inventoryAssets = new Collection({
      name: 'inventory_assets',
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
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'servidor_aplicacao',
            'banco_dados',
            'storage_backup',
            'servico_nuvem',
            'estacao',
            'impressora_multifuncional',
            'equipamento_rede',
            'outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo', 'desativado'],
          maxSelect: 1,
        },
        {
          name: 'criticidade',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta'],
          maxSelect: 1,
        },
        {
          name: 'origem',
          type: 'select',
          required: true,
          values: ['manual', 'glpi'],
          maxSelect: 1,
        },
        { name: 'localizacao', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'ip_address', type: 'text' },
        { name: 'serial_number', type: 'text' },
        { name: 'external_id', type: 'text' },
        {
          name: 'responsavel',
          type: 'relation',
          required: false,
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'dados_normalizados', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_assets_org_tipo ON inventory_assets (organization, tipo)',
        'CREATE INDEX idx_assets_org_status ON inventory_assets (organization, status)',
        'CREATE INDEX idx_assets_org_origem ON inventory_assets (organization, origem)',
        'CREATE INDEX idx_assets_ext_id ON inventory_assets (organization, external_id)',
      ],
    })
    app.save(inventoryAssets)

    // 2. Coleção inventory_sync_runs
    const inventorySyncRuns = new Collection({
      name: 'inventory_sync_runs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      deleteRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
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
          name: 'connector',
          type: 'relation',
          required: false,
          collectionId: integrations.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['em_andamento', 'sucesso', 'erro', 'parcial'],
          maxSelect: 1,
        },
        { name: 'resumo', type: 'json' },
        { name: 'error_message', type: 'text' },
        { name: 'started_at', type: 'date' },
        { name: 'finished_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sync_runs_org_created ON inventory_sync_runs (organization, created DESC)',
      ],
    })
    app.save(inventorySyncRuns)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('inventory_sync_runs')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('inventory_assets')
      app.delete(col)
    } catch (_) {}
  },
)
