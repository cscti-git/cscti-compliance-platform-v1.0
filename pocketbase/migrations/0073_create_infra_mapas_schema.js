migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')

    // Coleção infra_mapas: guarda o estado do Mapa da Infraestrutura de cada serventia
    const infraMapas = new Collection({
      name: 'infra_mapas',
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
          name: 'status',
          type: 'select',
          required: true,
          values: ['em_branco', 'gerado', 'revisado'],
          maxSelect: 1,
        },
        { name: 'versao', type: 'number', required: false },
        { name: 'hash_sha256', type: 'text', required: false },
        { name: 'total_nos', type: 'number', required: false },
        { name: 'total_conexoes', type: 'number', required: false },
        { name: 'nos_reais_count', type: 'number', required: false },
        { name: 'autonomia_minutos', type: 'number', required: false },
        { name: 'velocidade_mbps', type: 'number', required: false },
        { name: 'equipamentos_snapshot', type: 'json', required: false },
        { name: 'conexoes_snapshot', type: 'json', required: false },
        { name: 'resumo_camadas', type: 'json', required: false },
        { name: 'diagrama_referencia_snapshot', type: 'json', required: false },
        { name: 'gerado_por_nome', type: 'text', required: false },
        { name: 'gerado_por_email', type: 'text', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_infra_mapas_org ON infra_mapas (organization)',
        'CREATE INDEX idx_infra_mapas_org_status ON infra_mapas (organization, status)',
        'CREATE INDEX idx_infra_mapas_org_created ON infra_mapas (organization, created DESC)',
      ],
    })
    app.save(infraMapas)

    // Atualizar conformidade_itens código 2.8 para apontar oficialmente para /infraestrutura?tab=mapa
    try {
      const colConfItens = app.findCollectionByNameOrId('conformidade_itens')
      app
        .db()
        .newQuery(
          "UPDATE conformidade_itens SET link_modulo = '/infraestrutura?tab=mapa', modulo_origem = 'infraestrutura' WHERE codigo = '2.8'",
        )
        .execute()
    } catch (err) {
      console.log('Erro ao atualizar link_modulo de conformidade_itens 2.8:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('infra_mapas')
      app.delete(col)
    } catch (_) {}
  },
)
