migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    const people = app.findCollectionByNameOrId('people')
    const evidencias = app.findCollectionByNameOrId('evidencias')
    const inventoryAssets = app.findCollectionByNameOrId('inventory_assets')

    // 1. Atualizar planos_acao_itens para aceitar origem 'infraestrutura'
    try {
      const colPlanos = app.findCollectionByNameOrId('planos_acao_itens')
      const campoOrigem = colPlanos.fields.getByName('origem')
      if (campoOrigem) {
        campoOrigem.values = [
          'conformidade',
          'seguranca',
          'backup',
          'lgpd',
          'inventario',
          'infraestrutura',
          'manual',
        ]
        app.save(colPlanos)
      }
    } catch (err) {
      console.log('Erro ao atualizar campo origem de planos_acao_itens:', err)
    }

    // 2. Adicionar campos EOL em inventory_assets
    try {
      const colAssets = app.findCollectionByNameOrId('inventory_assets')
      if (!colAssets.fields.getByName('sistema_operacional')) {
        colAssets.fields.add(
          new TextField({
            name: 'sistema_operacional',
            required: false,
          }),
        )
      }
      if (!colAssets.fields.getByName('versao_so')) {
        colAssets.fields.add(
          new TextField({
            name: 'versao_so',
            required: false,
          }),
        )
      }
      if (!colAssets.fields.getByName('eol_status')) {
        colAssets.fields.add(
          new SelectField({
            name: 'eol_status',
            required: false,
            values: ['suportado', 'proximo_eol', 'sem_suporte', 'mitigado', 'desconhecido'],
            maxSelect: 1,
          }),
        )
      }
      if (!colAssets.fields.getByName('data_fim_suporte')) {
        colAssets.fields.add(
          new DateField({
            name: 'data_fim_suporte',
            required: false,
          }),
        )
      }
      if (!colAssets.fields.getByName('observacoes_suporte')) {
        colAssets.fields.add(
          new TextField({
            name: 'observacoes_suporte',
            required: false,
          }),
        )
      }
      app.save(colAssets)
    } catch (err) {
      console.log('Erro ao adicionar campos EOL em inventory_assets:', err)
    }

    // 3. Coleção infra_itens (Energia, Ambiente Físico e Camada Lógica)
    const infraItens = new Collection({
      name: 'infra_itens',
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
          type: 'select',
          required: true,
          values: ['energia', 'ambiente_fisico', 'camada_logica'],
          maxSelect: 1,
        },
        {
          name: 'tipo_item',
          type: 'select',
          required: true,
          values: [
            'nobreak',
            'gerador',
            'laudo_aterramento',
            'plano_contingencia_energia',
            'sala_ti',
            'racks',
            'ar_condicionado',
            'combate_incendio',
            'controle_acesso_fisico',
            'criptografia_dados',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['conforme', 'parcial', 'pendente', 'nao_conforme'],
          maxSelect: 1,
        },
        // Nobreak / Gerador
        { name: 'modelo', type: 'text' },
        { name: 'autonomia_minutos', type: 'number' },
        { name: 'quantidade', type: 'number' },
        { name: 'potencia_va', type: 'number' },
        // Laudo de Aterramento
        { name: 'art_numero', type: 'text' },
        { name: 'responsavel_tecnico', type: 'text' },
        { name: 'data_inspecao', type: 'date' },
        { name: 'data_validade', type: 'date' },
        // Ar-condicionado / Extintores / Controle de Acesso
        { name: 'redundancia_instalada', type: 'bool' },
        { name: 'data_recarga_extintor', type: 'date' },
        { name: 'data_vencimento_extintor', type: 'date' },
        { name: 'tipo_controle_acesso', type: 'text' },
        // Criptografia
        { name: 'criptografia_repouso', type: 'bool' },
        { name: 'criptografia_transito', type: 'bool' },
        { name: 'algoritmo_criptografia', type: 'text' },
        // Arquivo anexado e Hash SHA-256
        {
          name: 'arquivos',
          type: 'file',
          maxSelect: 10,
          maxSize: 31457280, // 30 MB
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'],
        },
        { name: 'hash_sha256', type: 'text' },
        // Vínculo Obrigatório com Evidência da Central de Evidências
        {
          name: 'evidencia_vinculada',
          type: 'relation',
          required: false,
          collectionId: evidencias.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'categoria_evidencia_sugerida', type: 'text' },
        {
          name: 'responsavel_designado',
          type: 'relation',
          required: false,
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_infra_itens_org_cat ON infra_itens (organization, categoria)',
        'CREATE INDEX idx_infra_itens_org_tipo ON infra_itens (organization, tipo_item)',
        'CREATE INDEX idx_infra_itens_org_status ON infra_itens (organization, status)',
        'CREATE INDEX idx_infra_itens_org_evid ON infra_itens (organization, evidencia_vinculada)',
      ],
    })
    app.save(infraItens)

    // 4. Coleção infra_links (Conectividade)
    const infraLinks = new Collection({
      name: 'infra_links',
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
        { name: 'operadora', type: 'text', required: true },
        { name: 'identificacao', type: 'text' }, // ex: Link Principal BGP, Link Reserva Fibra
        { name: 'velocidade_mbps', type: 'number', required: true },
        {
          name: 'tipo_link',
          type: 'select',
          required: true,
          values: ['dedicado', 'compartilhado'],
          maxSelect: 1,
        },
        {
          name: 'meio_transmissao',
          type: 'select',
          required: false,
          values: ['fibra_optica', 'radio', 'satelite', 'cabo_metalico', '4g_5g', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo', 'em_manutencao'],
          maxSelect: 1,
        },
        { name: 'redundancia', type: 'bool' }, // É o link de redundância/backup?
        { name: 'ip_fixo', type: 'bool' },
        { name: 'circuito_id', type: 'text' },
        { name: 'contato_suporte', type: 'text' },
        { name: 'observacoes', type: 'text' },
        {
          name: 'arquivos',
          type: 'file',
          maxSelect: 5,
          maxSize: 31457280,
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        { name: 'hash_sha256', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_infra_links_org_status ON infra_links (organization, status)',
        'CREATE INDEX idx_infra_links_org_tipo ON infra_links (organization, tipo_link)',
      ],
    })
    app.save(infraLinks)

    // 5. Coleção infra_checklist_itens (Checklist Geral Pré-semeado)
    const infraChecklistItens = new Collection({
      name: 'infra_checklist_itens',
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
        { name: 'codigo', type: 'text', required: true },
        { name: 'item_nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'secao',
          type: 'select',
          required: true,
          values: ['energia', 'ambiente_fisico', 'conectividade', 'camada_logica'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['conforme', 'parcial', 'pendente', 'nao_conforme'],
          maxSelect: 1,
        },
        {
          name: 'registro_vinculado',
          type: 'relation',
          required: false,
          collectionId: infraItens.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'link_vinculado',
          type: 'relation',
          required: false,
          collectionId: infraLinks.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'evidencia_vinculada',
          type: 'relation',
          required: false,
          collectionId: evidencias.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'prazo', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_infra_chk_org_status ON infra_checklist_itens (organization, status)',
        'CREATE INDEX idx_infra_chk_org_secao ON infra_checklist_itens (organization, secao)',
        'CREATE INDEX idx_infra_chk_org_ordem ON infra_checklist_itens (organization, ordem)',
      ],
    })
    app.save(infraChecklistItens)

    // 6. Seed do catálogo de checklist neutro de domínio para todas as serventias existentes
    const defaultChecklist = [
      {
        codigo: 'INF-01',
        item_nome: 'Sala de TI ou servidores com acesso físico restrito e controlado',
        descricao:
          'Ambiente dedicado e seguro para guarda dos servidores e equipamentos centrais de rede, com portas trancadas e registro de entrada.',
        secao: 'ambiente_fisico',
        ordem: 1,
      },
      {
        codigo: 'INF-02',
        item_nome: 'Racks adequados e organizados para servidores e telecomunicações',
        descricao:
          'Estrutura física adequada com cabeamento estruturado, organização, portas de proteção e travamento físico.',
        secao: 'ambiente_fisico',
        ordem: 2,
      },
      {
        codigo: 'INF-03',
        item_nome: 'Sistema de climatização dedicado com redundância',
        descricao:
          'Ar-condicionadodimensionado para manter temperatura e umidade constantes na sala técnica, com unidade redundante ou alternância.',
        secao: 'ambiente_fisico',
        ordem: 3,
      },
      {
        codigo: 'INF-04',
        item_nome: 'Equipamentos de combate a incêndio válidos e inspecionados',
        descricao:
          'Extintores de classe apropriada para equipamentos elétricos (gás carbônico ou pó químico) com selo do Inmetro e data de recarga vigente.',
        secao: 'ambiente_fisico',
        ordem: 4,
      },
      {
        codigo: 'INF-05',
        item_nome: 'Sistema de nobreak dimensionado com autonomia comprovada',
        descricao:
          'Unidade ininterrupta de energia (UPS) capaz de sustentar as operações da serventia e permitir desligamento seguro dos servidores em queda de luz.',
        secao: 'energia',
        ordem: 5,
      },
      {
        codigo: 'INF-06',
        item_nome: 'Laudo de aterramento elétrico com ART emitido por responsável técnico',
        descricao:
          'Comprovação de medição ôhmica do sistema de aterramento elétrico da serventia com ART registrada no conselho de classe.',
        secao: 'energia',
        ordem: 6,
      },
      {
        codigo: 'INF-07',
        item_nome: 'Plano formal de contingência energética vigente',
        descricao:
          'Documento técnico estabelecendo procedimentos em caso de falta prolongada de energia elétrica (gerador, baterias e desligamento ordenado).',
        secao: 'energia',
        ordem: 7,
      },
      {
        codigo: 'INF-08',
        item_nome: 'Link de internet com velocidade contratada atendendo à classe da serventia',
        descricao:
          'Capacidade de banda larga compatível com a movimentação e exigência de domínio da serventia (Classe 1: 2 Mbps, Classe 2: 10 Mbps, Classe 3: 50 Mbps).',
        secao: 'conectividade',
        ordem: 8,
      },
      {
        codigo: 'INF-09',
        item_nome: 'Link secundário de redundância energética/telecomunicações',
        descricao:
          'Segundo link de internet ativo com operadora ou meio físico distinto para tolerância a falhas na comunicação externa.',
        secao: 'conectividade',
        ordem: 9,
      },
      {
        codigo: 'INF-10',
        item_nome: 'Sistemas operacionais e softwares com suporte ativo (sem EOL)',
        descricao:
          'Todos os servidores e estações de trabalho utilizam versões com suporte oficial dos fabricantes ou com medidas compensatórias de isolamento.',
        secao: 'camada_logica',
        ordem: 10,
      },
      {
        codigo: 'INF-11',
        item_nome: 'Criptografia aplicada aos dados em repouso e em trânsito',
        descricao:
          'Mecanismos de cifragem em discos, bancos de dados, volumes de armazenamento e comunicações de rede (SSL/TLS, BitLocker, LUKS).',
        secao: 'camada_logica',
        ordem: 11,
      },
    ]

    try {
      const allOrgs = app.findRecordsByFilter('organizations', '', '', 100, 0)
      for (let o = 0; o < allOrgs.length; o++) {
        const orgId = allOrgs[o].id
        for (let i = 0; i < defaultChecklist.length; i++) {
          const item = defaultChecklist[i]
          const rec = new Record(infraChecklistItens)
          rec.set('organization', orgId)
          rec.set('codigo', item.codigo)
          rec.set('item_nome', item.item_nome)
          rec.set('descricao', item.descricao)
          rec.set('secao', item.secao)
          rec.set('status', 'pendente')
          rec.set('ordem', item.ordem)
          try {
            app.save(rec)
          } catch (_) {}
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('infra_checklist_itens')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('infra_links')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('infra_itens')
      app.delete(col)
    } catch (_) {}
  },
)
