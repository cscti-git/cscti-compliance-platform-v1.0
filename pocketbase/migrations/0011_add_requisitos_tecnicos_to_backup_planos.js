migrate(
  (app) => {
    const planosCol = app.findCollectionByNameOrId('backup_planos')

    // 1. rto_horas (number, opcional)
    if (!planosCol.fields.getByName('rto_horas')) {
      planosCol.fields.add(
        new NumberField({
          name: 'rto_horas',
          min: 0,
          onlyInt: false,
        }),
      )
    }

    // 2. rpo_horas (number, opcional)
    if (!planosCol.fields.getByName('rpo_horas')) {
      planosCol.fields.add(
        new NumberField({
          name: 'rpo_horas',
          min: 0,
          onlyInt: false,
        }),
      )
    }

    // 3. retencao_dias (number, opcional)
    if (!planosCol.fields.getByName('retencao_dias')) {
      planosCol.fields.add(
        new NumberField({
          name: 'retencao_dias',
          min: 0,
          onlyInt: true,
        }),
      )
    }

    // 4. periodicidade (select: intervalo_minutos, diaria, semanal, mensal)
    if (!planosCol.fields.getByName('periodicidade')) {
      planosCol.fields.add(
        new SelectField({
          name: 'periodicidade',
          values: ['intervalo_minutos', 'diaria', 'semanal', 'mensal'],
          maxSelect: 1,
        }),
      )
    }

    // 5. intervalo_minutos (number, 5-1440, opcional)
    if (!planosCol.fields.getByName('intervalo_minutos')) {
      planosCol.fields.add(
        new NumberField({
          name: 'intervalo_minutos',
          min: 5,
          max: 1440,
          onlyInt: true,
        }),
      )
    }

    // 6. janela_horario (text HH:MM, opcional)
    if (!planosCol.fields.getByName('janela_horario')) {
      planosCol.fields.add(
        new TextField({
          name: 'janela_horario',
          max: 10,
        }),
      )
    }

    // 7. destino (select multi: local, nuvem, externo)
    if (!planosCol.fields.getByName('destino')) {
      planosCol.fields.add(
        new SelectField({
          name: 'destino',
          values: ['local', 'nuvem', 'externo'],
          maxSelect: 3,
        }),
      )
    }

    app.save(planosCol)
  },
  (app) => {
    const planosCol = app.findCollectionByNameOrId('backup_planos')
    const fieldsToRemove = [
      'rto_horas',
      'rpo_horas',
      'retencao_dias',
      'periodicidade',
      'intervalo_minutos',
      'janela_horario',
      'destino',
    ]

    for (const field of fieldsToRemove) {
      if (planosCol.fields.getByName(field)) {
        planosCol.fields.removeByName(field)
      }
    }

    app.save(planosCol)
  },
)
