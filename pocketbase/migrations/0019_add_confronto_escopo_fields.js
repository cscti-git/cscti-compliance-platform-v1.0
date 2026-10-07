migrate(
  (app) => {
    // 1. Adicionar campo confronto_escopo na coleção backup_execucoes
    const execCol = app.findCollectionByNameOrId('backup_execucoes')
    if (!execCol.fields.getByName('confronto_escopo')) {
      execCol.fields.add(
        new JSONField({
          name: 'confronto_escopo',
          required: false,
        }),
      )
      app.save(execCol)
    }

    // 2. Adicionar campo confronto_escopo na coleção backup_avaliacoes
    const avalCol = app.findCollectionByNameOrId('backup_avaliacoes')
    if (!avalCol.fields.getByName('confronto_escopo')) {
      avalCol.fields.add(
        new JSONField({
          name: 'confronto_escopo',
          required: false,
        }),
      )
      app.save(avalCol)
    }
  },
  (app) => {
    try {
      const execCol = app.findCollectionByNameOrId('backup_execucoes')
      const f1 = execCol.fields.getByName('confronto_escopo')
      if (f1) {
        execCol.fields.removeByName('confronto_escopo')
        app.save(execCol)
      }
    } catch (_) {}

    try {
      const avalCol = app.findCollectionByNameOrId('backup_avaliacoes')
      const f2 = avalCol.fields.getByName('confronto_escopo')
      if (f2) {
        avalCol.fields.removeByName('confronto_escopo')
        app.save(avalCol)
      }
    } catch (_) {}
  },
)
