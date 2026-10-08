/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const tables = [
      'backup_ocorrencias',
      'backup_avaliacoes',
      'backup_processamentos',
      'backup_execucoes',
      'backup_evidencias',
      'backup_testes_recuperacao',
      'backup_fontes',
      'backup_rotinas',
      'backup_plano_requisitos',
      'backup_planos',
      'backup_escopo',
      'backup_regras_identificacao',
      'backup_monitoramentos_externos',
    ]

    for (const table of tables) {
      try {
        app.db().newQuery(`DELETE FROM ${table}`).execute()
        console.log(`[cleanup_backup_module] Tabela ${table} limpa com sucesso.`)
      } catch (e) {
        console.log(
          `[cleanup_backup_module] Tabela ${table} ignorada ou com erro:`,
          e?.message || e,
        )
      }
    }
  },
  (app) => {
    // Sem rollback para exclusão completa de dados
  },
)
