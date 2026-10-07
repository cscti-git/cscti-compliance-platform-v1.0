migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('inventory_assets')

    if (!col.fields.getByName('exige_backup_local')) {
      col.fields.add(
        new BoolField({
          name: 'exige_backup_local',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('exige_backup_nuvem')) {
      col.fields.add(
        new BoolField({
          name: 'exige_backup_nuvem',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('exige_backup_replicacao')) {
      col.fields.add(
        new BoolField({
          name: 'exige_backup_replicacao',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('inventory_assets')

    if (col.fields.getByName('exige_backup_local')) {
      col.fields.removeByName('exige_backup_local')
    }
    if (col.fields.getByName('exige_backup_nuvem')) {
      col.fields.removeByName('exige_backup_nuvem')
    }
    if (col.fields.getByName('exige_backup_replicacao')) {
      col.fields.removeByName('exige_backup_replicacao')
    }

    app.save(col)
  },
)
