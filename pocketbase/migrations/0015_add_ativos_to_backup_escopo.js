migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('backup_escopo')
    const assets = app.findCollectionByNameOrId('inventory_assets')

    if (!col.fields.getByName('ativos')) {
      col.fields.add(
        new RelationField({
          name: 'ativos',
          collectionId: assets.id,
          cascadeDelete: false,
          required: false,
          minSelect: 0,
          maxSelect: 100,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('backup_escopo')
    if (col.fields.getByName('ativos')) {
      col.fields.removeByName('ativos')
      app.save(col)
    }
  },
)
