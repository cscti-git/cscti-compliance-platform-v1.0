migrate(
  (app) => {
    // 1. Atualizar backup_regras_identificacao para incluir 'ACRONIS_PDF' e 'NOC_DIARIO' no select de adaptador
    const regrasCol = app.findCollectionByNameOrId('backup_regras_identificacao')
    const adaptadorField = regrasCol.fields.getByName('adaptador')
    if (adaptadorField) {
      adaptadorField.values = [
        'EMAIL_HTML_GENERICO',
        'VEEAM_HTML',
        'ACRONIS_PDF',
        'NOC_DIARIO',
        'LOG_BRUTO_TEXTO',
        'JSON_WEBHOOK',
      ]
      adaptadorField.maxSelect = 1
    }
    app.save(regrasCol)

    // 2. Criar coleção backup_monitoramentos_externos
    const orgsCol = app.findCollectionByNameOrId('organizations')
    const evidenciasCol = app.findCollectionByNameOrId('backup_evidencias')

    const monitoramentoCol = new Collection({
      name: 'backup_monitoramentos_externos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'data_monitoramento',
          type: 'date',
          required: false,
        },
        {
          name: 'origem_remetente',
          type: 'text',
          required: false,
        },
        {
          name: 'assunto',
          type: 'text',
          required: false,
        },
        {
          name: 'status_geral',
          type: 'select',
          values: ['ok', 'falha', 'atencao'],
          maxSelect: 1,
          required: false,
        },
        {
          name: 'clientes_status',
          type: 'json',
          required: false,
          maxSize: 2097152,
        },
        {
          name: 'acoes_realizadas',
          type: 'text',
          required: false,
        },
        {
          name: 'observacoes',
          type: 'text',
          required: false,
        },
        {
          name: 'evidencias_mencionadas',
          type: 'text',
          required: false,
        },
        {
          name: 'comprovante_tem_imagem',
          type: 'bool',
          required: false,
        },
        {
          name: 'hash_conteudo',
          type: 'text',
          required: true,
        },
        {
          name: 'evidencia',
          type: 'relation',
          required: false,
          collectionId: evidenciasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'conteudo_bruto',
          type: 'text',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_bkmonit_org ON backup_monitoramentos_externos (organization)',
        'CREATE UNIQUE INDEX idx_bkmonit_org_hash ON backup_monitoramentos_externos (organization, hash_conteudo)',
      ],
    })
    app.save(monitoramentoCol)

    // 3. Seed de regras padrão para Acronis (PDF) e NOC Diário por organização
    try {
      const orgs = app.findRecordsByFilter('organizations', '', '+name', 100, 0)
      for (let i = 0; i < orgs.length; i++) {
        const orgId = orgs[i].id

        const novasRegras = [
          {
            nome: 'Acronis Cloud Backup — Relatório PDF Diário',
            remetente_filtro: 'noreply@cloud.acronis.com',
            assunto_contem: 'RELATÓRIO DIÁRIO',
            padrao_conteudo: 'Atividades diárias - SocNoc',
            adaptador: 'ACRONIS_PDF',
          },
          {
            nome: 'NOC — Análise Preventiva Diária de Backup',
            remetente_filtro: '',
            assunto_contem: 'ANALISE PREVENTIVA DIARIA DE BACKUP',
            padrao_conteudo: 'Informações do Ambiente',
            adaptador: 'NOC_DIARIO',
          },
        ]

        for (let j = 0; j < novasRegras.length; j++) {
          const rDef = novasRegras[j]
          const existing = app.findRecordsByFilter(
            'backup_regras_identificacao',
            `organization = '${orgId}' && nome = '${rDef.nome}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const rRec = new Record(regrasCol)
            rRec.set('organization', orgId)
            rRec.set('nome', rDef.nome)
            rRec.set('remetente_filtro', rDef.remetente_filtro)
            rRec.set('assunto_contem', rDef.assunto_contem)
            rRec.set('padrao_conteudo', rDef.padrao_conteudo)
            rRec.set('adaptador', rDef.adaptador)
            rRec.set('ativo', true)
            app.save(rRec)
          }
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reverter coleção
    try {
      const monitoramentoCol = app.findCollectionByNameOrId('backup_monitoramentos_externos')
      app.delete(monitoramentoCol)
    } catch (_) {}

    // Reverter valores de adaptador
    try {
      const regrasCol = app.findCollectionByNameOrId('backup_regras_identificacao')
      const adaptadorField = regrasCol.fields.getByName('adaptador')
      if (adaptadorField) {
        adaptadorField.values = [
          'EMAIL_HTML_GENERICO',
          'VEEAM_HTML',
          'LOG_BRUTO_TEXTO',
          'JSON_WEBHOOK',
        ]
        adaptadorField.maxSelect = 1
        app.save(regrasCol)
      }
    } catch (_) {}
  },
)
