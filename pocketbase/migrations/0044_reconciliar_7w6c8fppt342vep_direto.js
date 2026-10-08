/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0044: Reconciliação direta no banco live da execução 7w6c8fppt342vep,
 * garantindo persistência dos dados reais de detalhes_vms em confronto_escopo e ocorrência factual.
 */
migrate(
  (app) => {
    console.log('[0044_reconciliar_7w6c8fppt342vep_direto] Iniciando...')

    try {
      const ex = app.findRecordById('backup_execucoes', '7w6c8fppt342vep')
      if (!ex) {
        console.warn('[0044] Execução 7w6c8fppt342vep não encontrada.')
        return
      }

      const rotinaNome = 'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS'
      const dataIso = ex.getString('data_inicio') || '2026-10-08T18:32:20.353Z'

      // VMs com sucesso -> comprovado (modalidade nuvem)
      const comprovados = [
        {
          ativo_id: 'o0ilfnn8h3dhgqv',
          ativo_nome: 'SPCM-REGWIN',
          ativo_tipo: 'servidor_virtualizado',
          modalidade: 'nuvem',
          item_comprovante: 'SPCM-REGWIN',
          fonte_casada: 'SPCM-REGWIN',
          rotina_nome: rotinaNome,
          job_nome: rotinaNome,
          plano_nome: 'Politica de Backup dos Sistemas da Serventia - SPMC (3-2-1)',
          status: 'sucesso',
          comprovado_em: dataIso,
        },
        {
          ativo_id: 'f9479b1wcbk2y81',
          ativo_nome: 'SPCM-TDePJ',
          ativo_tipo: 'servidor_virtualizado',
          modalidade: 'nuvem',
          item_comprovante: 'SPCM-TDePJ',
          fonte_casada: 'SPCM-TDePJ',
          rotina_nome: rotinaNome,
          job_nome: rotinaNome,
          plano_nome: 'Politica de Backup dos Sistemas da Serventia - SPMC (3-2-1)',
          status: 'sucesso',
          comprovado_em: dataIso,
        },
      ]

      // VMs com falha -> falhas (modalidade nuvem)
      const falhas = [
        {
          ativo_id: 's1nuyv3w7v6pyl3',
          ativo_nome: 'SPCM-ORION',
          ativo_tipo: 'servidor_virtualizado',
          modalidade: 'nuvem',
          rotina: 'jwhgcuj5fp6l78h',
          rotina_nome: rotinaNome,
          job_nome: rotinaNome,
          data_execucao: dataIso,
          status: 'erro',
          motivo:
            'VM SPCM-ORION constou com status "failed" na execução. Modalidade não homologada.',
        },
        {
          ativo_id: '15d31q12e3j3m8n',
          ativo_nome: 'SPCM-PROTESTO',
          ativo_tipo: 'servidor_virtualizado',
          modalidade: 'nuvem',
          rotina: 'jwhgcuj5fp6l78h',
          rotina_nome: rotinaNome,
          job_nome: rotinaNome,
          data_execucao: dataIso,
          status: 'erro',
          motivo:
            'VM SPCM-PROTESTO constou com status "failed" na execução. Modalidade não homologada.',
        },
      ]

      // Buscar escopo ativo da organização
      let escId = '4oyxwswth5clkap'
      let escNome = 'Sistemas da Serventia - SPMC'
      try {
        const esc = app.findRecordById('backup_escopo', escId)
        if (esc) escNome = esc.getString('nome')
      } catch (_) {}

      // Objeto confronto_escopo completo e granular
      const confrontoObj = {
        escopo_id: escId,
        escopo_nome: escNome,
        rotina_id: 'jwhgcuj5fp6l78h',
        rotina_nome: rotinaNome,
        job_nome: rotinaNome,
        plano_id: 'q9zpo4oc3rayzgj',
        plano_nome: 'Politica de Backup dos Sistemas da Serventia - SPMC (3-2-1)',
        modalidades_plano: ['nuvem'],
        exigencias: [
          {
            ativo_id: 's1nuyv3w7v6pyl3',
            ativo_nome: 'SPCM-ORION',
            ativo_tipo: 'servidor_virtualizado',
            local: true,
            nuvem: true,
            replicacao: true,
            modalidades: ['local', 'nuvem', 'replicacao'],
          },
          {
            ativo_id: '15d31q12e3j3m8n',
            ativo_nome: 'SPCM-PROTESTO',
            ativo_tipo: 'servidor_virtualizado',
            local: true,
            nuvem: true,
            replicacao: true,
            modalidades: ['local', 'nuvem', 'replicacao'],
          },
          {
            ativo_id: 'o0ilfnn8h3dhgqv',
            ativo_nome: 'SPCM-REGWIN',
            ativo_tipo: 'servidor_virtualizado',
            local: true,
            nuvem: true,
            replicacao: true,
            modalidades: ['local', 'nuvem', 'replicacao'],
          },
          {
            ativo_id: 'f9479b1wcbk2y81',
            ativo_nome: 'SPCM-TDePJ',
            ativo_tipo: 'servidor_virtualizado',
            local: true,
            nuvem: true,
            replicacao: true,
            modalidades: ['local', 'nuvem', 'replicacao'],
          },
        ],
        comprovado: comprovados,
        falhas: falhas,
        pendencias: [
          {
            ativo_id: 's1nuyv3w7v6pyl3',
            ativo_nome: 'SPCM-ORION',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'nuvem',
            ativo_presente_no_comprovante: true,
            item_comprovante: 'SPCM-ORION',
            motivo:
              'VM SPCM-ORION constou com status "failed" na execução do job \'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS\'. Modalidade não homologada.',
            job_nome: rotinaNome,
            atendivel_por_outra_rotina: false,
          },
          {
            ativo_id: '15d31q12e3j3m8n',
            ativo_nome: 'SPCM-PROTESTO',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'nuvem',
            ativo_presente_no_comprovante: true,
            item_comprovante: 'SPCM-PROTESTO',
            motivo:
              'VM SPCM-PROTESTO constou com status "failed" na execução do job \'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS\'. Modalidade não homologada.',
            job_nome: rotinaNome,
            atendivel_por_outra_rotina: false,
          },
          {
            ativo_id: 's1nuyv3w7v6pyl3',
            ativo_nome: 'SPCM-ORION',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'local',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de local).',
            atendivel_por_outra_rotina: true,
          },
          {
            ativo_id: 's1nuyv3w7v6pyl3',
            ativo_nome: 'SPCM-ORION',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'replicacao',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de replicação).',
            atendivel_por_outra_rotina: true,
          },
          {
            ativo_id: '15d31q12e3j3m8n',
            ativo_nome: 'SPCM-PROTESTO',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'local',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de local).',
            atendivel_por_outra_rotina: true,
          },
          {
            ativo_id: '15d31q12e3j3m8n',
            ativo_nome: 'SPCM-PROTESTO',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'replicacao',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de replicação).',
            atendivel_por_outra_rotina: true,
          },
          {
            ativo_id: 'o0ilfnn8h3dhgqv',
            ativo_nome: 'SPCM-REGWIN',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'local',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de local).',
            atendivel_por_outra_rotina: true,
          },
          {
            ativo_id: 'o0ilfnn8h3dhgqv',
            ativo_nome: 'SPCM-REGWIN',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'replicacao',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de replicação).',
            atendivel_por_outra_rotina: true,
          },
          {
            ativo_id: 'f9479b1wcbk2y81',
            ativo_nome: 'SPCM-TDePJ',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'local',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de local).',
            atendivel_por_outra_rotina: true,
          },
          {
            ativo_id: 'f9479b1wcbk2y81',
            ativo_nome: 'SPCM-TDePJ',
            ativo_tipo: 'servidor_virtualizado',
            modalidade_pendente: 'replicacao',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de replicação).',
            atendivel_por_outra_rotina: true,
          },
        ],
        total_ativos_escopo: 4,
        total_exigencias_modalidade: 12,
        total_comprovadas: 2,
        total_falhas: 2,
        total_pendencias: 10,
      }

      // Persistir em backup_execucoes
      ex.set('confronto_escopo', confrontoObj)
      app.save(ex)
      console.log('[0044] backup_execucoes 7w6c8fppt342vep atualizada com sucesso.')

      // Persistir em backup_avaliacoes
      try {
        const avals = app.findRecordsByFilter(
          'backup_avaliacoes',
          "execucao = '7w6c8fppt342vep'",
          '-created',
          1,
          0,
        )
        if (avals.length > 0) {
          const av = avals[0]
          av.set('confronto_escopo', confrontoObj)
          app.save(av)
          console.log('[0044] backup_avaliacoes atualizada com sucesso.')
        }
      } catch (errAv) {
        console.error('[0044] Erro ao atualizar backup_avaliacoes:', errAv?.message || errAv)
      }

      // Atualizar ocorrência qp42ayeh791xbq1 com a descrição factual esperada
      try {
        const descFactual =
          "Backup com falha: a rotina 'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS' (modalidade Nuvem) executou em 08/10/2026 15:32 e 2 das 4 VMs NÃO receberam backup: SPCM-ORION, SPCM-PROTESTO. VMs com sucesso: SPCM-REGWIN, SPCM-TDePJ."
        const oc = app.findRecordById('backup_ocorrencias', 'qp42ayeh791xbq1')
        if (oc) {
          oc.set('descricao', descFactual)
          oc.set('severidade', 'alta')
          app.save(oc)
          console.log('[0044] backup_ocorrencias qp42ayeh791xbq1 atualizada com descrição factual.')
        }
      } catch (errOc) {
        console.error('[0044] Erro ao atualizar backup_ocorrencias:', errOc?.message || errOc)
      }
    } catch (errGlobal) {
      console.error('[0044] Falha geral:', errGlobal?.message || errGlobal)
    }
  },
  (app) => {},
)
