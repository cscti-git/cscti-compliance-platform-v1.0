migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    const people = app.findCollectionByNameOrId('people')

    // 1. Coleção planos_acao_itens
    const planosAcaoItens = new Collection({
      name: 'planos_acao_itens',
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
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'origem',
          type: 'select',
          required: true,
          values: ['conformidade', 'seguranca', 'backup', 'lgpd', 'inventario', 'manual'],
          maxSelect: 1,
        },
        { name: 'referencia_origem', type: 'text' }, // id do item de conformidade, do checklist, da ocorrência, etc.
        { name: 'referencia_codigo', type: 'text' }, // ex: "1.1", "2.5" ou id curto para navegação
        {
          name: 'prioridade',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta', 'critica'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberto', 'em_andamento', 'concluido', 'cancelado'],
          maxSelect: 1,
        },
        {
          name: 'responsavel',
          type: 'relation',
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'responsavel_nome', type: 'text' }, // snapshot do nome da pessoa responsável
        { name: 'data_criacao', type: 'date' },
        { name: 'data_alvo', type: 'date' }, // prazo
        { name: 'data_conclusao', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_planos_org_status ON planos_acao_itens (organization, status)',
        'CREATE INDEX idx_planos_org_origem ON planos_acao_itens (organization, origem)',
        'CREATE INDEX idx_planos_org_prazo ON planos_acao_itens (organization, data_alvo)',
      ],
    })
    app.save(planosAcaoItens)

    // 2. Coleção planos_acao_historico (append-only)
    const planosAcaoHistorico = new Collection({
      name: 'planos_acao_historico',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule: null, // append-only: não permite alteração
      deleteRule: null, // append-only: não permite exclusão
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
          name: 'plano',
          type: 'relation',
          required: false,
          collectionId: planosAcaoItens.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'plano_titulo', type: 'text' },
        { name: 'tipo_evento', type: 'text', required: true }, // 'criacao' | 'mudanca_status' | 'reatribuicao' | 'alteracao_prazo' | 'dispensa_matriz' | 'conclusao' | 'cancelamento'
        { name: 'campo_alterado', type: 'text' },
        { name: 'valor_anterior', type: 'text' },
        { name: 'valor_novo', type: 'text' },
        { name: 'motivo', type: 'text' },
        { name: 'autor_nome', type: 'text' },
        { name: 'autor_email', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_planos_hist_org_plano ON planos_acao_historico (organization, plano, created DESC)',
        'CREATE INDEX idx_planos_hist_org_tipo ON planos_acao_historico (organization, tipo_evento, created DESC)',
      ],
    })
    app.save(planosAcaoHistorico)
  },
  (app) => {
    try {
      const colHist = app.findCollectionByNameOrId('planos_acao_historico')
      app.delete(colHist)
    } catch (_) {}
    try {
      const colItens = app.findCollectionByNameOrId('planos_acao_itens')
      app.delete(colItens)
    } catch (_) {}
  },
)
