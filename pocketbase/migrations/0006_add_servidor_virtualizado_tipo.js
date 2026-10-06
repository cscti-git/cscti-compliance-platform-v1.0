migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('inventory_assets')
    const tipoField = col.fields.getByName('tipo')
    if (tipoField) {
      tipoField.values = [
        'servidor_aplicacao',
        'servidor_virtualizado',
        'banco_dados',
        'storage_backup',
        'servico_nuvem',
        'estacao',
        'impressora_multifuncional',
        'equipamento_rede',
        'outro',
      ]
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('inventory_assets')
    const tipoField = col.fields.getByName('tipo')
    if (tipoField) {
      tipoField.values = [
        'servidor_aplicacao',
        'banco_dados',
        'storage_backup',
        'servico_nuvem',
        'estacao',
        'impressora_multifuncional',
        'equipamento_rede',
        'outro',
      ]
      app.save(col)
    }
  },
)
