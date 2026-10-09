// Migração 0058 — Atestado Humano Diário (NOC) — Monitoramento Externo
// 1) Novos campos em backup_monitoramentos_externos:
//    - origem_tipo: 'email' | 'manual' (de onde veio o atestado)
//    - registrado_por: relation users (quem registrou manualmente)
//    - divergencias: json (divergências NOC × sistema detectadas)
//    - ativos_vinculados: json (ativos do inventário citados no relatório)
// 2) Endurecimento das regras de API (hoje frouxas: @request.auth.id != ''):
//    isolamento por organization + create/update só admin/suporte + delete só admin.
// 3) Backfill idempotente: registros existentes vieram de e-mails do NOC.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('backup_monitoramentos_externos')

    if (!col.fields.getByName('origem_tipo')) {
      col.fields.add(
        new SelectField({ name: 'origem_tipo', values: ['email', 'manual'], maxSelect: 1 }),
      )
    }
    if (!col.fields.getByName('registrado_por')) {
      col.fields.add(
        new RelationField({
          name: 'registrado_por',
          collectionId: '_pb_users_auth_',
          minSelect: 0,
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('divergencias')) {
      col.fields.add(new JSONField({ name: 'divergencias', maxSize: 2000000 }))
    }
    if (!col.fields.getByName('ativos_vinculados')) {
      col.fields.add(new JSONField({ name: 'ativos_vinculados', maxSize: 2000000 }))
    }

    // Regras de API: isolamento por organização (admin vê tudo);
    // escrita restrita a admin/suporte; exclusão somente admin.
    col.listRule =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')"
    col.viewRule = col.listRule
    col.createRule =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')"
    col.updateRule = col.createRule
    col.deleteRule =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && @request.auth.system_role = 'admin'"

    app.save(col)

    // Backfill idempotente: todos os registros existentes vieram do e-mail
    // diário do NOC (origem 'email'). O campo manual só nasce agora.
    app
      .db()
      .newQuery(
        "UPDATE backup_monitoramentos_externos SET origem_tipo = 'email' WHERE origem_tipo IS NULL OR origem_tipo = ''",
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('backup_monitoramentos_externos')
    for (const nomeCampo of [
      'origem_tipo',
      'registrado_por',
      'divergencias',
      'ativos_vinculados',
    ]) {
      try {
        col.fields.removeByName(nomeCampo)
      } catch (_) {}
    }
    // Restaura as regras originais
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    col.deleteRule = "@request.auth.id != ''"
    app.save(col)
  },
)
