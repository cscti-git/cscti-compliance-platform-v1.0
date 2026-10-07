migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('backup_evidencias')
    const statusField = col.fields.getByName('status_processamento')
    if (statusField) {
      statusField.values = [
        'pendente',
        'processada',
        'erro',
        'nao_reconhecida',
        'sem_dados_extraidos',
      ]
      statusField.maxSelect = 1
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('backup_evidencias')
    const statusField = col.fields.getByName('status_processamento')
    if (statusField) {
      statusField.values = ['pendente', 'processada', 'erro', 'nao_reconhecida']
      statusField.maxSelect = 1
      app.save(col)
    }
  },
)
