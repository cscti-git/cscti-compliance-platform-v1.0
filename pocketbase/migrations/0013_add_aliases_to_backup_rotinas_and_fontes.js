migrate(
  (app) => {
    // 1. Adicionar campo "aliases" em backup_rotinas
    const rotinasCol = app.findCollectionByNameOrId('backup_rotinas')
    if (!rotinasCol.fields.getByName('aliases')) {
      rotinasCol.fields.add(
        new TextField({
          name: 'aliases',
          required: false,
        }),
      )
      app.save(rotinasCol)
    }

    // 2. Adicionar campo "aliases" em backup_fontes
    const fontesCol = app.findCollectionByNameOrId('backup_fontes')
    if (!fontesCol.fields.getByName('aliases')) {
      fontesCol.fields.add(
        new TextField({
          name: 'aliases',
          required: false,
        }),
      )
      app.save(fontesCol)
    }
  },
  (app) => {
    const rotinasCol = app.findCollectionByNameOrId('backup_rotinas')
    if (rotinasCol.fields.getByName('aliases')) {
      rotinasCol.fields.removeByName('aliases')
      app.save(rotinasCol)
    }

    const fontesCol = app.findCollectionByNameOrId('backup_fontes')
    if (fontesCol.fields.getByName('aliases')) {
      fontesCol.fields.removeByName('aliases')
      app.save(fontesCol)
    }
  },
)
