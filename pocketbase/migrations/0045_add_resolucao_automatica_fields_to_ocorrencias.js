migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('backup_ocorrencias')
    const execCol = app.findCollectionByNameOrId('backup_execucoes')
    const evidCol = app.findCollectionByNameOrId('backup_evidencias')

    if (!col.fields.getByName('resolvida_automaticamente')) {
      col.fields.add(
        new BoolField({
          name: 'resolvida_automaticamente',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('resolvida_por_execucao')) {
      col.fields.add(
        new RelationField({
          name: 'resolvida_por_execucao',
          collectionId: execCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('resolvida_por_evidencia')) {
      col.fields.add(
        new RelationField({
          name: 'resolvida_por_evidencia',
          collectionId: evidCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('fato_real')) {
      col.fields.add(
        new JSONField({
          name: 'fato_real',
          maxSize: 1048576,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('backup_ocorrencias')

    if (col.fields.getByName('resolvida_automaticamente')) {
      col.fields.removeByName('resolvida_automaticamente')
    }
    if (col.fields.getByName('resolvida_por_execucao')) {
      col.fields.removeByName('resolvida_por_execucao')
    }
    if (col.fields.getByName('resolvida_por_evidencia')) {
      col.fields.removeByName('resolvida_por_evidencia')
    }
    if (col.fields.getByName('fato_real')) {
      col.fields.removeByName('fato_real')
    }

    app.save(col)
  },
)
