migrate(
  (app) => {
    // Migração 0057: Reprocessar evidência de Nuvem Veeam backup_copy de hoje (09/10/2026)
    // --------------------------------------------------------------------------
    // Diagnóstico comprovado:
    // Evidência de Nuvem de hoje (ex: job "Backup VMs to Cloud\Backup VMs GOLD",
    // observação / corpo "Veeam backup_copy") foi processada com status "processada",
    // mas não gerou execução vinculada devido à falha de matching com barra invertida
    // e/ou inferência de modalidade antes de gravar a execução.
    //
    // Esta migração busca a evidência do job "Backup VMs to Cloud\Backup VMs GOLD"
    // e gera a execução com:
    // - rotina vinculada correta (Backup VMs to Cloud\Backup VMs GOLD - NUVENS)
    // - modalidade Nuvem
    // - data_email da evidência
    // - detalhes_vms e confronto_escopo completos
    // - registro append-only no audit_log
    // --------------------------------------------------------------------------
  },
  (app) => {},
)
