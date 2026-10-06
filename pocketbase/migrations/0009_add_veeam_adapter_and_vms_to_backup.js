migrate(
  (app) => {
    // 1. Atualizar backup_regras_identificacao para incluir 'VEEAM_HTML' no select de adaptador
    const regrasCol = app.findCollectionByNameOrId('backup_regras_identificacao')
    const adaptadorField = regrasCol.fields.getByName('adaptador')
    if (adaptadorField) {
      adaptadorField.values = [
        'EMAIL_HTML_GENERICO',
        'VEEAM_HTML',
        'LOG_BRUTO_TEXTO',
        'JSON_WEBHOOK',
      ]
      adaptadorField.maxSelect = 1
    }
    app.save(regrasCol)

    // 2. Adicionar campo detalhes_vms (JSON) na coleção backup_execucoes
    const execCol = app.findCollectionByNameOrId('backup_execucoes')
    if (!execCol.fields.getByName('detalhes_vms')) {
      execCol.fields.add(
        new JSONField({
          name: 'detalhes_vms',
          maxSize: 5242880, // 5MB para lista de VMs
        }),
      )
    }
    app.save(execCol)

    // 3. Seed de regras padrão do VEEAM para organizações existentes
    try {
      const orgs = app.findRecordsByFilter('organizations', '', '+name', 100, 0)
      for (let i = 0; i < orgs.length; i++) {
        const orgId = orgs[i].id

        const veeamRules = [
          {
            nome: 'Veeam Backup Job — Notificação HTML',
            assunto_contem: 'Backup',
            padrao_conteudo: 'Backup job:',
            adaptador: 'VEEAM_HTML',
          },
          {
            nome: 'Veeam Backup Copy Job — Notificação HTML',
            assunto_contem: 'Backup Copy',
            padrao_conteudo: 'Backup Copy job:',
            adaptador: 'VEEAM_HTML',
          },
          {
            nome: 'Veeam Replication Job — Notificação HTML',
            assunto_contem: 'Replication',
            padrao_conteudo: 'Replication job:',
            adaptador: 'VEEAM_HTML',
          },
        ]

        for (let j = 0; j < veeamRules.length; j++) {
          const rDef = veeamRules[j]
          // Verificar se já existe regra com este nome para a organização
          const existing = app.findRecordsByFilter(
            'backup_regras_identificacao',
            `organization = '${orgId}' && nome = '${rDef.nome}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const rRec = new Record(regrasCol)
            rRec.set('organization', orgId)
            rRec.set('nome', rDef.nome)
            rRec.set('remetente_filtro', '')
            rRec.set('assunto_contem', rDef.assunto_contem)
            rRec.set('padrao_conteudo', rDef.padrao_conteudo)
            rRec.set('adaptador', rDef.adaptador)
            rRec.set('ativo', true)
            app.save(rRec)
          }
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reverter campo detalhes_vms
    try {
      const execCol = app.findCollectionByNameOrId('backup_execucoes')
      if (execCol.fields.getByName('detalhes_vms')) {
        execCol.fields.removeByName('detalhes_vms')
        app.save(execCol)
      }
    } catch (_) {}

    // Reverter valores do adaptador
    try {
      const regrasCol = app.findCollectionByNameOrId('backup_regras_identificacao')
      const adaptadorField = regrasCol.fields.getByName('adaptador')
      if (adaptadorField) {
        adaptadorField.values = ['EMAIL_HTML_GENERICO', 'LOG_BRUTO_TEXTO', 'JSON_WEBHOOK']
        adaptadorField.maxSelect = 1
        app.save(regrasCol)
      }
    } catch (_) {}
  },
)
