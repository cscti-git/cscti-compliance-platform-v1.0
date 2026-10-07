migrate(
  (app) => {
    const planos = app.findCollectionByNameOrId('backup_planos')
    const destinoField = planos.fields.getByName('destino')
    if (destinoField) {
      // Aceita 'local', 'nuvem', 'replicacao' e mantém 'externo' para compatibilidade
      destinoField.values = ['local', 'nuvem', 'replicacao', 'externo']
      app.save(planos)
    }

    // Atualizar registros existentes onde destino continha 'externo' para 'replicacao'
    try {
      app
        .db()
        .newQuery(`
        UPDATE backup_planos
        SET destino = replace(destino, '"externo"', '"replicacao"')
        WHERE destino LIKE '%"externo"%'
      `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    const planos = app.findCollectionByNameOrId('backup_planos')
    const destinoField = planos.fields.getByName('destino')
    if (destinoField) {
      destinoField.values = ['local', 'nuvem', 'externo']
      app.save(planos)
    }
  },
)
