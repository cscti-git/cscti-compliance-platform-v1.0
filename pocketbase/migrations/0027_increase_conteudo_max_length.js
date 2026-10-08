/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. backup_evidencias: aumentar limite do campo 'conteudo'
    // Comprovantes HTML de backup (ex: Veeam com dezenas de VMs) podem ter de 20KB a 2MB.
    // O padrão TextField do PocketBase v0.23+ aplica max = 5000 se max for 0/omitido.
    // Definimos max = 2.000.000 (2M caracteres) para acomodar e-mails e relatórios completos.
    try {
      const evidCol = app.findCollectionByNameOrId('backup_evidencias')
      const conteudoField = evidCol.fields.getByName('conteudo')
      if (conteudoField) {
        conteudoField.max = 2000000
        app.save(evidCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar backup_evidencias.conteudo:', e)
    }

    // 2. backup_monitoramentos_externos: aumentar limite de 'conteudo_bruto' e 'observacoes'
    try {
      const monCol = app.findCollectionByNameOrId('backup_monitoramentos_externos')
      let changed = false
      const cBrutoField = monCol.fields.getByName('conteudo_bruto')
      if (cBrutoField) {
        cBrutoField.max = 2000000
        changed = true
      }
      const obsMonField = monCol.fields.getByName('observacoes')
      if (obsMonField) {
        obsMonField.max = 50000
        changed = true
      }
      const acoesField = monCol.fields.getByName('acoes_realizadas')
      if (acoesField) {
        acoesField.max = 50000
        changed = true
      }
      const evidMencField = monCol.fields.getByName('evidencias_mencionadas')
      if (evidMencField) {
        evidMencField.max = 50000
        changed = true
      }
      if (changed) {
        app.save(monCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar backup_monitoramentos_externos:', e)
    }

    // 3. backup_execucoes: aumentar observacao para relatórios extensos
    try {
      const execCol = app.findCollectionByNameOrId('backup_execucoes')
      const obsField = execCol.fields.getByName('observacao')
      if (obsField) {
        obsField.max = 50000
        app.save(execCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar backup_execucoes.observacao:', e)
    }

    // 4. backup_avaliacoes: aumentar detalhe para laudos detalhados
    try {
      const avalCol = app.findCollectionByNameOrId('backup_avaliacoes')
      const detalheField = avalCol.fields.getByName('detalhe')
      if (detalheField) {
        detalheField.max = 50000
        app.save(avalCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar backup_avaliacoes.detalhe:', e)
    }

    // 5. backup_ocorrencias: aumentar descricao e resolucao
    try {
      const ocCol = app.findCollectionByNameOrId('backup_ocorrencias')
      let changedOc = false
      const descField = ocCol.fields.getByName('descricao')
      if (descField) {
        descField.max = 50000
        changedOc = true
      }
      const resField = ocCol.fields.getByName('resolucao')
      if (resField) {
        resField.max = 50000
        changedOc = true
      }
      if (changedOc) {
        app.save(ocCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar backup_ocorrencias:', e)
    }
  },
  (app) => {
    try {
      const evidCol = app.findCollectionByNameOrId('backup_evidencias')
      const conteudoField = evidCol.fields.getByName('conteudo')
      if (conteudoField) {
        conteudoField.max = 5000
        app.save(evidCol)
      }
    } catch (_) {}
  },
)
