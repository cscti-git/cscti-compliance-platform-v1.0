migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('backup_avaliacoes')
    if (!col.fields.getByName('laudo_tecnico')) {
      col.fields.add(
        new JSONField({
          name: 'laudo_tecnico',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('backup_avaliacoes')
    const f = col.fields.getByName('laudo_tecnico')
    if (f) {
      col.fields.removeByName('laudo_tecnico')
      app.save(col)
    }
  },
)
