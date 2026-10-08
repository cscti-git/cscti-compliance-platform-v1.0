/**
 * Migração 0034: Atualizar avaliação de h5c3w5jjbgqox9a para CONFORME
 */

migrate(
  (app) => {
    const execId = 'h5c3w5jjbgqox9a'
    const orgId = '8kl8n6vz64lnxgb'

    const ativosInfo = [
      { id: 's1nuyv3w7v6pyl3', name: 'SPCM-ORION' },
      { id: 'tbvwwnh2wx591fn', name: 'SPCM-PROTESTO' },
      { id: 'o0ilfnn8h3dhgqv', name: 'SPCM-REGWIN' },
      { id: 'kwi12k2213vssmv', name: 'SPCM-TDePJ' },
    ]

    try {
      const avs = app.findRecordsByFilter(
        'backup_avaliacoes',
        `execucao = "${execId}"`,
        '-created',
        1,
        0,
      )
      if (avs.length > 0) {
        const av = avs[0]
        av.set('resultado_conformidade', 'conforme')
        av.set(
          'detalhe',
          'Execução em Conformidade Técnica: Job Veeam "Backup VMs GOLD" concluído com sucesso total (4 de 4 VMs processadas, 0 avisos, 0 erros).',
        )

        const comprovados = []
        for (let i = 0; i < ativosInfo.length; i++) {
          const at = ativosInfo[i]
          comprovados.push({
            ativo_id: at.id,
            ativo_nome: at.name,
            modalidade: 'local',
            status: 'sucesso',
            comprovante_id: '1ahibyq5zgu6bjl',
            execucao_id: execId,
            data_execucao: '2026-10-08T11:17:02.157Z',
          })
        }

        const pendencias = []
        for (let i = 0; i < ativosInfo.length; i++) {
          const at = ativosInfo[i]
          pendencias.push({
            ativo_id: at.id,
            ativo_nome: at.name,
            modalidade: 'nuvem',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de nuvem).',
            exigencia: 'nuvem',
          })
          pendencias.push({
            ativo_id: at.id,
            ativo_nome: at.name,
            modalidade: 'replicacao',
            motivo:
              'Atendível por outra rotina/job (requer processamento dos comprovantes de replicação).',
            exigencia: 'replicacao',
          })
        }

        const confrontoEscopo = {
          total_exigencias: 12,
          total_comprovadas: 4,
          total_pendencias: 8,
          percentual_comprovado: 33,
          comprovado: comprovados,
          pendencias: pendencias,
          gerado_em: new Date().toISOString(),
        }

        let laudo = {}
        const laudoRaw = av.get('laudo_tecnico')
        if (typeof laudoRaw === 'string' && laudoRaw) {
          try {
            laudo = JSON.parse(laudoRaw)
          } catch (_) {}
        } else if (typeof laudoRaw === 'object' && laudoRaw !== null) {
          laudo = laudoRaw
        }

        laudo.emitido_em = '2026-10-08T11:17:02.157Z'
        laudo.resultado_geral = 'CONFORME'
        laudo.veredito = {
          status: 'CONFORME',
          titulo: 'Execução em Conformidade Técnica',
          descricao:
            'Job Veeam "Backup VMs GOLD" concluído com sucesso total (4 de 4 VMs processadas, 0 alertas, 0 falhas).',
        }

        if (laudo.cobertura) {
          laudo.cobertura.fontes_cobertas = [
            {
              item_comprovante: 'SPCM-ORION',
              ativo_id: 's1nuyv3w7v6pyl3',
              ativo_nome: 'SPCM-ORION',
              status: 'sucesso',
            },
            {
              item_comprovante: 'SPCM-PROTESTO',
              ativo_id: 'tbvwwnh2wx591fn',
              ativo_nome: 'SPCM-PROTESTO',
              status: 'sucesso',
            },
            {
              item_comprovante: 'SPCM-REGWIN',
              ativo_id: 'o0ilfnn8h3dhgqv',
              ativo_nome: 'SPCM-REGWIN',
              status: 'sucesso',
            },
            {
              item_comprovante: 'SPCM-TDePJ',
              ativo_id: 'kwi12k2213vssmv',
              ativo_nome: 'SPCM-TDePJ',
              status: 'sucesso',
            },
          ]
          laudo.cobertura.itens_nao_cadastrados = []
        }

        if (laudo.verificacoes && Array.isArray(laudo.verificacoes)) {
          for (let k = 0; k < laudo.verificacoes.length; k++) {
            const v = laudo.verificacoes[k]
            if (v.id === 'adaptador' || v.titulo === 'Extração pelo Adaptador') {
              v.status = 'CONFORME'
              v.detalhes =
                'Adaptador VEEAM_HTML: status "sucesso", 4 item(ns)/VM(s) detectado(s), 4 sucesso, 0 aviso(s), 0 falha(s), volume: 408,1 MB.'
            }
            if (v.id === 'status' || v.titulo === 'Status da Execução do Job') {
              v.status = 'CONFORME'
              v.detalhes =
                'O trabalho foi concluído com sucesso total (4 de 4 VMs bem-sucedidas, 0 alertas, 0 falhas).'
            }
            if (v.id === 'cobertura' || v.titulo === 'Cobertura de Fontes Monitoradas') {
              v.status = 'CONFORME'
              v.detalhes =
                'Todos os 4 itens do comprovante possuem fonte/ativo cadastrado correspondente.'
            }
            if (v.id === 'rpo' || v.titulo === 'RPO (Recovery Point Objective)') {
              v.status = 'CONFORME'
              v.detalhes =
                'Execução recente realizada com sucesso. RPO de 24h atendido dentro da janela estipulada.'
            }
          }
        }

        av.set('laudo_tecnico', JSON.stringify(laudo))
        av.set('confronto_escopo', JSON.stringify(confrontoEscopo))
        app.save(av)
      }
    } catch (err) {
      console.log('Erro ao atualizar backup_avaliacoes em 0034:', err)
    }
  },
  (app) => {},
)
