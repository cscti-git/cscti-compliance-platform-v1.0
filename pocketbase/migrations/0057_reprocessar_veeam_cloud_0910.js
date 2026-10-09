/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0057: Reprocesso idempotente da evidência sl3hneeebmrzc4b (Backup VMs to Cloud - Nuvem)
 * Criação da execução factual de backup que faltava na base.
 */
migrate(
  (app) => {
    console.log('[0057_reprocessar_veeam_cloud_0910] Iniciando migração...')

    const evidenciaId = 'sl3hneeebmrzc4b'
    const rotinaId = 'jwhgcuj5fp6l78h'
    const orgId = '8kl8n6vz64lnxgb'
    const dataIso = '2026-10-09T12:10:59.000Z'

    // 1. Idempotência: verificar se já existe execução com evidencia=sl3hneeebmrzc4b
    const execsExistentes = app.findRecordsByFilter(
      'backup_execucoes',
      `evidencia = '${evidenciaId}'`,
      '-created',
      1,
      0,
    )

    if (execsExistentes.length > 0) {
      console.log(
        `[0057_reprocessar_veeam_cloud_0910] Execução já existente para a evidência ${evidenciaId} (ID: ${execsExistentes[0].id}). Pulando criação.`,
      )
      return
    }

    // 2. Carregar evidência, rotina, plano e escopo para vínculos factuais
    let evRec = null
    try {
      evRec = app.findRecordById('backup_evidencias', evidenciaId)
    } catch (_) {}

    let rotinaRec = null
    try {
      rotinaRec = app.findRecordById('backup_rotinas', rotinaId)
    } catch (_) {}

    const rotinaNome = rotinaRec
      ? rotinaRec.getString('nome')
      : 'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS'

    let planoRec = null
    let escopoRec = null
    if (rotinaRec) {
      const planoId = rotinaRec.getString('plano')
      if (planoId) {
        try {
          planoRec = app.findRecordById('backup_planos', planoId)
        } catch (_) {}
      }
    }

    if (planoRec) {
      const escId = planoRec.getString('escopo')
      if (escId) {
        try {
          escopoRec = app.findRecordById('backup_escopo', escId)
        } catch (_) {}
      }
    }

    if (!escopoRec) {
      try {
        const escList = app.findRecordsByFilter(
          'backup_escopo',
          `organization = '${orgId}' && status = 'ativo'`,
          '+created',
          1,
          0,
        )
        if (escList.length > 0) escopoRec = escList[0]
      } catch (_) {}
    }

    // 3. Montar dados das 4 VMs e confronto
    const ativosMap = [
      { id: 's1nuyv3w7v6pyl3', nome: 'SPCM-ORION', tipo: 'servidor_virtualizado' },
      { id: 'tbvwwnh2wx591fn', nome: 'SPCM-PROTESTO', tipo: 'servidor_virtualizado' },
      { id: 'o0ilfnn8h3dhgqv', nome: 'SPCM-REGWIN', tipo: 'servidor_virtualizado' },
      { id: 'kwi12k2213vssmv', nome: 'SPCM-TDePJ', tipo: 'servidor_virtualizado' },
    ]

    const detalhesVms = [
      {
        nome: 'SPCM-ORION',
        status: 'success',
        ativo_id: 's1nuyv3w7v6pyl3',
        status_escopo: 'coberto',
        fora_escopo: false,
      },
      {
        nome: 'SPCM-PROTESTO',
        status: 'success',
        ativo_id: 'tbvwwnh2wx591fn',
        status_escopo: 'coberto',
        fora_escopo: false,
      },
      {
        nome: 'SPCM-REGWIN',
        status: 'success',
        ativo_id: 'o0ilfnn8h3dhgqv',
        status_escopo: 'coberto',
        fora_escopo: false,
      },
      {
        nome: 'SPCM-TDePJ',
        status: 'success',
        ativo_id: 'kwi12k2213vssmv',
        status_escopo: 'coberto',
        fora_escopo: false,
      },
    ]

    const comprovados = []
    const pendencias = []
    const exigencias = []

    for (let aI = 0; aI < ativosMap.length; aI++) {
      const at = ativosMap[aI]
      exigencias.push({
        ativo_id: at.id,
        ativo_nome: at.nome,
        ativo_tipo: at.tipo,
        local: true,
        nuvem: true,
        replicacao: true,
        modalidades: ['local', 'nuvem', 'replicacao'],
      })

      comprovados.push({
        ativo_id: at.id,
        ativo_nome: at.nome,
        ativo_tipo: at.tipo,
        modalidade: 'nuvem',
        item_comprovante: at.nome,
        fonte_casada: at.nome,
        rotina_nome: rotinaNome,
        job_nome: 'Backup VMs to Cloud/Backup VMs GOLD',
        plano_nome: planoRec ? planoRec.getString('nome') : null,
        status: 'sucesso',
        comprovado_em: dataIso,
      })

      pendencias.push({
        ativo_id: at.id,
        ativo_nome: at.nome,
        ativo_tipo: at.tipo,
        modalidade_pendente: 'local',
        ativo_presente_no_comprovante: true,
        item_comprovante: at.nome,
        motivo: 'Atendível por outra rotina/job (requer processamento dos comprovantes de local).',
        job_nome: 'Backup VMs to Cloud/Backup VMs GOLD',
        atendivel_por_outra_rotina: true,
      })

      pendencias.push({
        ativo_id: at.id,
        ativo_nome: at.nome,
        ativo_tipo: at.tipo,
        modalidade_pendente: 'replicacao',
        ativo_presente_no_comprovante: true,
        item_comprovante: at.nome,
        motivo:
          'Atendível por outra rotina/job (requer processamento dos comprovantes de replicação).',
        job_nome: 'Backup VMs to Cloud/Backup VMs GOLD',
        atendivel_por_outra_rotina: true,
      })
    }

    const confrontoEscopo = {
      escopo_id: escopoRec ? escopoRec.id : null,
      escopo_nome: escopoRec ? escopoRec.getString('nome') : 'Sistemas da Serventia - SPCM',
      rotina_id: rotinaId,
      rotina_nome: rotinaNome,
      plano_id: planoRec ? planoRec.id : null,
      plano_nome: planoRec ? planoRec.getString('nome') : null,
      modalidades_plano: ['local', 'nuvem', 'replicacao'],
      exigencias: exigencias,
      comprovado: comprovados,
      pendencias: pendencias,
      falhas: [],
      total_ativos_escopo: ativosMap.length,
      total_exigencias_modalidade: exigencias.length * 3,
      total_comprovadas: comprovados.length,
      total_falhas: 0,
      total_pendencias: pendencias.length,
      job_nome: 'Backup VMs to Cloud/Backup VMs GOLD',
    }

    // 4. Criar o registro em backup_execucoes
    const execCol = app.findCollectionByNameOrId('backup_execucoes')
    const execRec = new Record(execCol)
    execRec.set('organization', orgId)
    execRec.set('rotina', rotinaId)
    execRec.set('evidencia', evidenciaId)
    execRec.set('data_inicio', dataIso)
    execRec.set('data_fim', dataIso)
    execRec.set('data_email', dataIso)
    execRec.set('status', 'sucesso')
    execRec.set('origem_registro', 'evidencia')
    execRec.set('destino', 'Nuvem Criptografada Externa (S3 / Cloud)')
    execRec.set(
      'observacao',
      'Veeam backup_copy: "Backup VMs to Cloud/Backup VMs GOLD" (4 VM(s) detalhada(s)) [v12.x]. Duração: n/d.',
    )
    execRec.set('detalhes_vms', detalhesVms)
    execRec.set('confronto_escopo', confrontoEscopo)

    app.save(execRec)
    console.log(
      `[0057_reprocessar_veeam_cloud_0910] Execução #${execRec.id} criada com sucesso para a evidência ${evidenciaId}.`,
    )

    // 5. Garantir que a evidência tem rotina vinculada e status_processamento = 'processada'
    if (evRec) {
      let evAlterada = false
      if (evRec.getString('rotina') !== rotinaId) {
        evRec.set('rotina', rotinaId)
        evAlterada = true
      }
      if (evRec.getString('status_processamento') !== 'processada') {
        evRec.set('status_processamento', 'processada')
        evAlterada = true
      }
      if (evAlterada) {
        app.save(evRec)
      }
    }
  },
  (app) => {
    // Revert opcional
    try {
      const execs = app.findRecordsByFilter(
        'backup_execucoes',
        "evidencia = 'sl3hneeebmrzc4b'",
        '-created',
        1,
        0,
      )
      if (execs.length > 0) {
        app.delete(execs[0])
      }
    } catch (_) {}
  },
)
