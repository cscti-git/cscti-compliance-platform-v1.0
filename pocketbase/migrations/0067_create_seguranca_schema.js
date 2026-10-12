migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')

    // 1. Coleção seg_solucoes (Catálogo de soluções de segurança do cliente)
    const segSolucoes = new Collection({
      name: 'seg_solucoes',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'endpoint_antivirus',
            'firewall',
            'monitoramento_soc_noc',
            'backup_seguranca',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'fornecedor', type: 'text' },
        { name: 'versao', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativa', 'inativa', 'em_avaliacao'],
          maxSelect: 1,
        },
        {
          name: 'escopo',
          type: 'select',
          required: false,
          values: [
            'todas_estacoes_servidores',
            'somente_servidores',
            'somente_estacoes',
            'especifico',
          ],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_seg_sol_org_status ON seg_solucoes (organization, status)',
        'CREATE INDEX idx_seg_sol_org_tipo ON seg_solucoes (organization, tipo)',
      ],
    })
    app.save(segSolucoes)

    // 2. Coleção seg_cobertura_exigida (Total de ativos exigidos por tipo de proteção por serventia)
    const segCoberturaExigida = new Collection({
      name: 'seg_cobertura_exigida',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_solucao',
          type: 'select',
          required: true,
          values: [
            'endpoint_antivirus',
            'firewall',
            'monitoramento_soc_noc',
            'backup_seguranca',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'quantidade_exigida', type: 'number', required: true },
        { name: 'base_calculo', type: 'text' }, // ex: "Derivado do inventário (estações + servidores)" ou "Manual"
        { name: 'ajuste_manual', type: 'bool' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_seg_cob_org_tipo ON seg_cobertura_exigida (organization, tipo_solucao)',
      ],
    })
    app.save(segCoberturaExigida)

    // 3. Coleção seg_comprovantes (Ingestão de comprovantes de segurança do cliente)
    const segComprovantes = new Collection({
      name: 'seg_comprovantes',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'solucao',
          type: 'relation',
          required: false,
          collectionId: segSolucoes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'data_comprovante', type: 'date', required: true }, // Verdade temporal (data do print/documento/email)
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['relatorio_console', 'print', 'pdf', 'email', 'laudo_auditoria', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'arquivos',
          type: 'file',
          maxSelect: 10,
          maxSize: 31457280, // 30 MB
          mimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'text/plain',
            'text/html',
            'message/rfc822',
          ],
        },
        { name: 'hash_sha256', type: 'text' },
        // Campos estruturados opcionais de leitura
        { name: 'maquinas_protegidas', type: 'number' },
        { name: 'maquinas_sem_agente', type: 'number' },
        { name: 'data_definicoes_atualizadas', type: 'date' },
        { name: 'ameacas_bloqueadas', type: 'number' },
        { name: 'eventos_relevantes', type: 'text' },
        {
          name: 'status_firewall',
          type: 'select',
          required: false,
          values: ['ativo', 'inativo', 'em_manutencao'],
          maxSelect: 1,
        },
        { name: 'data_revisao_regras_firewall', type: 'date' },
        { name: 'resumo_texto', type: 'text' },
        { name: 'registrado_por', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_seg_comp_org_data ON seg_comprovantes (organization, data_comprovante DESC)',
        'CREATE INDEX idx_seg_comp_org_sol ON seg_comprovantes (organization, solucao)',
      ],
    })
    app.save(segComprovantes)

    // 4. Coleção seg_itens_conformidade (Checklist de conformidade de segurança do ambiente)
    const segItensConformidade = new Collection({
      name: 'seg_itens_conformidade',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      updateRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      deleteRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')",
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'item_nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['endpoint', 'firewall', 'monitoramento', 'acessos_senhas', 'ativos_sistemas'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['comprovado', 'pendente', 'nao_conforme'],
          maxSelect: 1,
        },
        {
          name: 'comprovante_vinculado',
          type: 'relation',
          required: false,
          collectionId: segComprovantes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'prazo', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_seg_it_org_status ON seg_itens_conformidade (organization, status)',
        'CREATE INDEX idx_seg_it_org_ordem ON seg_itens_conformidade (organization, ordem)',
      ],
    })
    app.save(segItensConformidade)

    // 5. Seed automático dos itens de checklist neutros de segurança para todas as serventias existentes
    const defaultChecklistItens = [
      {
        item_nome: 'Antivírus/endpoint ativo em todas as estações e servidores',
        descricao:
          'Proteção contra malware e ameaças com agente instalado e ativo em todas as máquinas operacionais e servidores da serventia.',
        categoria: 'endpoint',
        ordem: 1,
      },
      {
        item_nome: 'Definições e assinaturas de antivírus atualizadas',
        descricao:
          'Mecanismo de atualização periódica ou contínua das assinaturas/regras de detecção em todos os endpoints.',
        categoria: 'endpoint',
        ordem: 2,
      },
      {
        item_nome: 'Firewall de perímetro ativo com regras revisadas',
        descricao:
          'Controle de tráfego de entrada e saída na borda da rede local da serventia com inspeção e bloqueio de portas não utilizadas.',
        categoria: 'firewall',
        ordem: 3,
      },
      {
        item_nome: 'Firewall local (host-based) ativo nos computadores e servidores',
        descricao:
          'Filtragem de conexões em cada equipamento, impedindo comunicação lateral indevida entre estações de trabalho.',
        categoria: 'firewall',
        ordem: 4,
      },
      {
        item_nome: 'Monitoramento contínuo do ambiente (SOC/NOC)',
        descricao:
          'Acompanhamento de alertas de conectividade, incidentes de segurança, indisponibilidade e integridade da infraestrutura.',
        categoria: 'monitoramento',
        ordem: 5,
      },
      {
        item_nome: 'Sistemas sem suporte (EOL - End of Life) identificados e tratados',
        descricao:
          'Levantamento de sistemas operacionais ou softwares descontinuados pelos fabricantes e plano de isolamento ou migração.',
        categoria: 'ativos_sistemas',
        ordem: 6,
      },
      {
        item_nome: 'Contas, privilégios e acessos revisados periodicamente',
        descricao:
          'Revisão dos acessos administrativos e revogação imediata de contas de colaboradores desligados ou transferidos.',
        categoria: 'acessos_senhas',
        ordem: 7,
      },
      {
        item_nome: 'Políticas de senhas fortes e rotação definidas',
        descricao:
          'Comprimento mínimo, bloqueio por tentativas incorretas e bloqueio automático de tela após inatividade em todas as estações.',
        categoria: 'acessos_senhas',
        ordem: 8,
      },
    ]

    try {
      const allOrgs = app.findRecordsByFilter('organizations', '', '', 100, 0)
      for (let o = 0; o < allOrgs.length; o++) {
        const orgId = allOrgs[o].id
        for (let i = 0; i < defaultChecklistItens.length; i++) {
          const item = defaultChecklistItens[i]
          const rec = new Record(segItensConformidade)
          rec.set('organization', orgId)
          rec.set('item_nome', item.item_nome)
          rec.set('descricao', item.descricao)
          rec.set('categoria', item.categoria)
          rec.set('status', 'pendente')
          rec.set('ordem', item.ordem)
          try {
            app.save(rec)
          } catch (_) {}
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('seg_itens_conformidade')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('seg_comprovantes')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('seg_cobertura_exigida')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('seg_solucoes')
      app.delete(col)
    } catch (_) {}
  },
)
