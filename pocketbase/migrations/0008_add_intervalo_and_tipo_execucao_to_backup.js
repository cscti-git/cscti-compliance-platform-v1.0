migrate(
  (app) => {
    // 1. Atualizar backup_rotinas
    const rotinasCol = app.findCollectionByNameOrId('backup_rotinas')

    // Atualizar periodicidade para incluir 'intervalo_minutos'
    const periodicidadeField = rotinasCol.fields.getByName('periodicidade')
    if (periodicidadeField) {
      periodicidadeField.values = [
        'diaria',
        'semanal',
        'mensal',
        'personalizada',
        'intervalo_minutos',
      ]
      periodicidadeField.maxSelect = 1
    }

    // Adicionar campo intervalo_minutos (número entre 5 e 1440)
    if (!rotinasCol.fields.getByName('intervalo_minutos')) {
      rotinasCol.fields.add(
        new NumberField({
          name: 'intervalo_minutos',
          min: 5,
          max: 1440,
          onlyInt: true,
        }),
      )
    }

    // Adicionar campo tipo_execucao na rotina: incremental | diferencial | completo
    if (!rotinasCol.fields.getByName('tipo_execucao')) {
      rotinasCol.fields.add(
        new SelectField({
          name: 'tipo_execucao',
          values: ['incremental', 'diferencial', 'completo'],
          maxSelect: 1,
        }),
      )
    }

    app.save(rotinasCol)

    // 2. Atualizar backup_fontes
    const fontesCol = app.findCollectionByNameOrId('backup_fontes')

    // Permitir caracterizar tipo_execucao na fonte (caso a fonte tenha política específica)
    if (!fontesCol.fields.getByName('tipo_execucao')) {
      fontesCol.fields.add(
        new SelectField({
          name: 'tipo_execucao',
          values: ['padrao_rotina', 'incremental', 'diferencial', 'completo'],
          maxSelect: 1,
        }),
      )
    }

    app.save(fontesCol)

    // 3. Atualizar registros existentes da rotina padrão para ter tipo_execucao definido caso vazio
    try {
      app
        .db()
        .newQuery(`
        UPDATE backup_rotinas
        SET tipo_execucao = 'completo'
        WHERE tipo_execucao IS NULL OR tipo_execucao = ''
      `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    const rotinasCol = app.findCollectionByNameOrId('backup_rotinas')
    if (rotinasCol.fields.getByName('intervalo_minutos')) {
      rotinasCol.fields.removeByName('intervalo_minutos')
    }
    if (rotinasCol.fields.getByName('tipo_execucao')) {
      rotinasCol.fields.removeByName('tipo_execucao')
    }
    const periodicidadeField = rotinasCol.fields.getByName('periodicidade')
    if (periodicidadeField) {
      periodicidadeField.values = ['diaria', 'semanal', 'mensal', 'personalizada']
    }
    app.save(rotinasCol)

    const fontesCol = app.findCollectionByNameOrId('backup_fontes')
    if (fontesCol.fields.getByName('tipo_execucao')) {
      fontesCol.fields.removeByName('tipo_execucao')
    }
    app.save(fontesCol)
  },
)
