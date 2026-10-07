migrate(
  (app) => {
    const planos = app.findCollectionByNameOrId('backup_planos')
    const escopos = app.findCollectionByNameOrId('backup_escopo')

    if (!planos.fields.getByName('escopo')) {
      planos.fields.add(
        new RelationField({
          name: 'escopo',
          collectionId: escopos.id,
          cascadeDelete: false,
          required: false,
          minSelect: 0,
          maxSelect: 1,
        }),
      )
      planos.addIndex('idx_bkplanos_escopo', false, 'escopo', '')
      app.save(planos)
    }
  },
  (app) => {
    const planos = app.findCollectionByNameOrId('backup_planos')
    planos.removeIndex('idx_bkplanos_escopo')
    if (planos.fields.getByName('escopo')) {
      planos.fields.removeByName('escopo')
      app.save(planos)
    }
  },
)
