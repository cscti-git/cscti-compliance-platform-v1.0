migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    const inventoryAssets = app.findCollectionByNameOrId('inventory_assets')
    const people = app.findCollectionByNameOrId('people')

    // 1. Coleção lgpd_finalidades (Operações de tratamento / finalidades da serventia)
    const lgpdFinalidades = new Collection({
      name: 'lgpd_finalidades',
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
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'base_legal',
          type: 'select',
          required: true,
          values: [
            'consentimento',
            'execução de contrato',
            'obrigação legal',
            'legítimo interesse',
            'proteção de vida',
            'tutela da saúde',
            'exercício de direitos',
          ],
          maxSelect: 1,
        },
        {
          name: 'categorias_titulares',
          type: 'select',
          required: false,
          values: [
            'titulares de serviços',
            'colaboradores',
            'fornecedores',
            'terceiros',
            'menores',
          ],
          maxSelect: 5,
        },
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
        'CREATE INDEX idx_lgpd_fin_org_status ON lgpd_finalidades (organization, status)',
        'CREATE INDEX idx_lgpd_fin_org_nome ON lgpd_finalidades (organization, nome)',
      ],
    })
    app.save(lgpdFinalidades)

    // 2. Coleção lgpd_dados (Inventário de dados pessoais)
    const lgpdDados = new Collection({
      name: 'lgpd_dados',
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
        { name: 'nome', type: 'text', required: true },
        {
          name: 'categoria_sensibilidade',
          type: 'select',
          required: true,
          values: ['comum', 'sensivel'],
          maxSelect: 1,
        },
        {
          name: 'finalidade',
          type: 'relation',
          required: false,
          collectionId: lgpdFinalidades.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'sistema_origem', type: 'text' },
        {
          name: 'ativo_vinculado',
          type: 'relation',
          required: false,
          collectionId: inventoryAssets.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'tempo_retencao', type: 'text' },
        { name: 'justificativa_retencao', type: 'text' },
        {
          name: 'forma_descarte',
          type: 'select',
          required: true,
          values: ['eliminação', 'anonimização', 'bloqueio'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lgpd_dad_org_sens ON lgpd_dados (organization, categoria_sensibilidade)',
        'CREATE INDEX idx_lgpd_dad_org_fin ON lgpd_dados (organization, finalidade)',
        'CREATE INDEX idx_lgpd_dad_org_status ON lgpd_dados (organization, status)',
      ],
    })
    app.save(lgpdDados)

    // 3. Coleção lgpd_ciencias (Ciência da Política de Segurança da Informação)
    const lgpdCiencias = new Collection({
      name: 'lgpd_ciencias',
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
          name: 'colaborador',
          type: 'relation',
          required: false,
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'nome_colaborador', type: 'text', required: true },
        { name: 'email_colaborador', type: 'email' },
        { name: 'cargo_colaborador', type: 'text' },
        { name: 'politica_versao', type: 'text' },
        {
          name: 'politica_arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 31457280, // 30 MB
          mimeTypes: ['application/pdf'],
        },
        { name: 'data_ciencia', type: 'date' },
        {
          name: 'tipo_assinatura',
          type: 'select',
          required: false,
          values: ['fisica', 'digital'],
          maxSelect: 1,
        },
        {
          name: 'documento_assinado',
          type: 'file',
          maxSelect: 5,
          maxSize: 31457280, // 30 MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/pkcs7-signature'],
        },
        { name: 'hash_sha256', type: 'text' },
        { name: 'plataforma_digital', type: 'text' },
        { name: 'protocolo_digital', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'concedida', 'revogada'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lgpd_cien_org_status ON lgpd_ciencias (organization, status)',
        'CREATE INDEX idx_lgpd_cien_org_colab ON lgpd_ciencias (organization, colaborador)',
      ],
    })
    app.save(lgpdCiencias)

    // 4. Coleção lgpd_incidentes (Registro de Incidentes de Segurança com Dados Pessoais)
    const lgpdIncidentes = new Collection({
      name: 'lgpd_incidentes',
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
        { name: 'descricao', type: 'text', required: true },
        { name: 'data_deteccao', type: 'date', required: true },
        { name: 'data_ocorrencia', type: 'date' },
        {
          name: 'gravidade',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta', 'critica'],
          maxSelect: 1,
        },
        { name: 'dados_afetados_texto', type: 'text' },
        {
          name: 'dados_afetados_rel',
          type: 'relation',
          required: false,
          collectionId: lgpdDados.id,
          cascadeDelete: false,
          maxSelect: 20,
        },
        { name: 'titulares_afetados_estimativa', type: 'number' },
        {
          name: 'status_fluxo',
          type: 'select',
          required: true,
          values: ['detectado', 'em_investigacao', 'contido', 'comunicados_titulares', 'encerrado'],
          maxSelect: 1,
        },
        { name: 'data_comunicacao_titular', type: 'date' },
        { name: 'protocolo_comunicacao_titular', type: 'text' },
        { name: 'data_comunicacao_orgao', type: 'date' },
        { name: 'protocolo_comunicacao_orgao', type: 'text' },
        { name: 'prazo_72h_cumprido', type: 'bool' },
        {
          name: 'anexos',
          type: 'file',
          maxSelect: 10,
          maxSize: 31457280, // 30 MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'],
        },
        { name: 'hash_sha256', type: 'text' },
        { name: 'responsavel_registro', type: 'text', required: true },
        { name: 'medidas_tomadas', type: 'text' },
        { name: 'licoes_aprendidas', type: 'text' },
        { name: 'data_encerramento', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lgpd_inc_org_status ON lgpd_incidentes (organization, status_fluxo)',
        'CREATE INDEX idx_lgpd_inc_org_grav ON lgpd_incidentes (organization, gravidade)',
        'CREATE INDEX idx_lgpd_inc_org_det ON lgpd_incidentes (organization, data_deteccao DESC)',
      ],
    })
    app.save(lgpdIncidentes)

    // 5. Seed automático das finalidades típicas de serventia extrajudicial para cada serventia existente
    const defaultFinalidades = [
      {
        nome: 'Prestação do serviço registral/notarial',
        descricao:
          'Prática dos atos notariais e registrais de atribuição da serventia, qualificação registral, lavratura de atos e publicidade legal.',
        base_legal: 'obrigação legal',
        categorias_titulares: ['titulares de serviços', 'terceiros'],
      },
      {
        nome: 'Gestão de colaboradores',
        descricao:
          'Gestão do quadro de prepostos, substitutos e colaboradores da serventia, folha de pagamento, controle de ponto e benefícios.',
        base_legal: 'execução de contrato',
        categorias_titulares: ['colaboradores'],
      },
      {
        nome: 'Gestão de fornecedores',
        descricao:
          'Contratação de produtos, serviços de TI, segurança física, limpeza e manutenção da serventia.',
        base_legal: 'execução de contrato',
        categorias_titulares: ['fornecedores'],
      },
      {
        nome: 'Cumprimento de obrigações legais',
        descricao:
          'Atendimento a determinações do Poder Judiciário, Corregedoria Geral da Justiça, Receita Federal, UIF/COAF e órgãos fiscalizadores.',
        base_legal: 'obrigação legal',
        categorias_titulares: ['titulares de serviços', 'colaboradores', 'terceiros'],
      },
    ]

    try {
      const allOrgs = app.findRecordsByFilter('organizations', '', '', 100, 0)
      for (let o = 0; o < allOrgs.length; o++) {
        const orgId = allOrgs[o].id
        for (let f = 0; f < defaultFinalidades.length; f++) {
          const item = defaultFinalidades[f]
          const rec = new Record(lgpdFinalidades)
          rec.set('organization', orgId)
          rec.set('nome', item.nome)
          rec.set('descricao', item.descricao)
          rec.set('base_legal', item.base_legal)
          rec.set('categorias_titulares', item.categorias_titulares)
          rec.set('status', 'ativo')
          try {
            app.save(rec)
          } catch (_) {}
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('lgpd_incidentes')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('lgpd_ciencias')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('lgpd_dados')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('lgpd_finalidades')
      app.delete(col)
    } catch (_) {}
  },
)
