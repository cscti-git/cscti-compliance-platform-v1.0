migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    const people = app.findCollectionByNameOrId('people')

    // 1. Coleção papeis_designados (catálogo por serventia com atribuições detalhadas pré-preenchidas)
    const papeisDesignados = new Collection({
      name: 'papeis_designados',
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
        { name: 'papel', type: 'text', required: true },
        { name: 'codigo', type: 'text' },
        { name: 'descricao_curta', type: 'text' },
        { name: 'atribuicoes_detalhadas', type: 'text', required: true },
        { name: 'e_obrigatorio', type: 'bool' },
        { name: 'da_ferramenta', type: 'bool' },
        { name: 'modulo_vinculado', type: 'text' },
        { name: 'ordem', type: 'number' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_papeis_desig_org ON papeis_designados (organization, ordem, papel)',
      ],
    })
    app.save(papeisDesignados)

    // 2. Coleção designacoes (registro do vínculo com termo, anexos, hash e ciclo de vida)
    const designacoes = new Collection({
      name: 'designacoes',
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
          name: 'papel_designado',
          type: 'relation',
          required: true,
          collectionId: papeisDesignados.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'colaborador',
          type: 'relation',
          required: false,
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        // Dados do designado (persistidos para integridade histórica do termo mesmo se alterados na pessoa)
        { name: 'nome_designado', type: 'text', required: true },
        { name: 'cpf_designado', type: 'text' },
        { name: 'email_designado', type: 'email' },
        { name: 'telefone_designado', type: 'text' },
        { name: 'cargo_designado', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'rascunho',
            'pendente_assinatura',
            'assinada_fisica',
            'assinada_digital',
            'revogada',
          ],
          maxSelect: 1,
        },
        { name: 'data_designacao', type: 'date', required: true },
        { name: 'data_assinatura', type: 'date' },
        { name: 'plataforma_assinatura', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'atribuicoes_customizadas', type: 'text' },
        {
          name: 'anexos_comprovante',
          type: 'file',
          maxSelect: 10,
          maxSize: 31457280, // 30 MB
          mimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pkcs7-signature',
          ],
        },
        { name: 'hash_sha256', type: 'text' },
        { name: 'metodo_assinatura_detalhes', type: 'text' },
        { name: 'data_revogacao', type: 'date' },
        { name: 'motivo_revogacao', type: 'text' },
        { name: 'revogado_por', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_desig_org_papel ON designacoes (organization, papel_designado, status)',
        'CREATE INDEX idx_desig_org_status ON designacoes (organization, status)',
        'CREATE INDEX idx_desig_org_colab ON designacoes (organization, colaborador)',
      ],
    })
    app.save(designacoes)

    // 3. Coleção designacao_documentos (documentos e minutas geradas institucionalmente pelo sistema)
    const designacaoDocumentos = new Collection({
      name: 'designacao_documentos',
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
          name: 'designacao',
          type: 'relation',
          required: true,
          collectionId: designacoes.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'tipo_documento', type: 'text' }, // termo_designacao, termo_revogacao
        { name: 'versao', type: 'text' },
        { name: 'conteudo_html', type: 'text' },
        { name: 'conteudo_texto', type: 'text' },
        { name: 'dados_serventia_snapshot', type: 'json' },
        { name: 'dados_designado_snapshot', type: 'json' },
        { name: 'hash_conteudo', type: 'text' },
        { name: 'gerado_em', type: 'date' },
        { name: 'gerado_por', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_desig_doc_org_desig ON designacao_documentos (organization, designacao)',
      ],
    })
    app.save(designacaoDocumentos)

    // 4. Seed dos 7 Papéis Regimentais e Técnicos Essenciais por serventia
    const defaultRolesSeed = [
      {
        papel: 'Titular / Responsável pela Serventia',
        codigo: 'TITULAR_RESPONSAVEL',
        descricao_curta:
          'Direção geral, autoridade institucional máxima e representação legal da serventia.',
        atribuicoes_detalhadas:
          '1. Exercer a autoridade e direção geral sobre todas as atividades da serventia;\n' +
          '2. Aprovar formalmente as políticas institucionais de segurança da informação, privacidade de dados e continuidade operacional;\n' +
          '3. Designar formalmente e outorgar competências aos responsáveis técnicos e operacionais por meio de termos institucionalizados;\n' +
          '4. Assegurar a dotação de recursos orçamentários e infraestrutura necessários para a integridade, disponibilidade e confidencialidade dos serviços notariais e registrais;\n' +
          '5. Prestar declarações e informações aos órgãos correicionais e autoridades competentes sempre que solicitado.',
        e_obrigatorio: true,
        da_ferramenta: false,
        modulo_vinculado: 'governança',
        ordem: 10,
      },
      {
        papel: 'Responsável pela Segurança da Informação',
        codigo: 'RESP_SEGURANCA_INFO',
        descricao_curta:
          'Gestão da segurança cibernética, controles lógicos, conformidade técnica e resposta a incidentes.',
        atribuicoes_detalhadas:
          '1. Coordenar a implementação, manutenção e atualização contínua da Política de Segurança da Informação (PSI) da serventia;\n' +
          '2. Gerenciar controles de acesso lógico, privilégios de usuários, proteção contra malwares e políticas de senhas seguras;\n' +
          '3. Conduzir análises periódicas de riscos e vulnerabilidades na infraestrutura física e lógica da serventia;\n' +
          '4. Liderar os procedimentos de contenção, investigação e notificação em caso de incidentes de segurança cibernética;\n' +
          '5. Manter atualizadas as trilhas de auditoria e relatórios técnicos comprobatórios exigidos nas inspeções periódicas.',
        e_obrigatorio: true,
        da_ferramenta: false,
        modulo_vinculado: 'segurança',
        ordem: 20,
      },
      {
        papel: 'Encarregado de Dados Pessoais',
        codigo: 'ENCARREGADO_DADOS',
        descricao_curta:
          'Governança da proteção de dados pessoais, atendimento a titulares e conformidade de privacidade.',
        atribuicoes_detalhadas:
          '1. Atuar como canal oficial de comunicação entre a serventia, os titulares de dados pessoais e a autoridade fiscalizadora de privacidade;\n' +
          '2. Orientar os colaboradores e prestadores de serviços da serventia sobre as práticas institucionais de proteção de dados pessoais;\n' +
          '3. Receber reclamações e comunicações dos titulares, prestando esclarecimentos e adotando providências pertinentes;\n' +
          '4. Supervisionar o Registro das Operações de Tratamento de Dados (ROPA) e apoiar a elaboração de Relatórios de Impacto;\n' +
          '5. Acompanhar e reportar incidentes de violação de dados pessoais aos responsáveis institucionais e canais competentes.',
        e_obrigatorio: true,
        da_ferramenta: false,
        modulo_vinculado: 'lgpd',
        ordem: 30,
      },
      {
        papel: 'Administrador de TI / Responsável Técnico',
        codigo: 'ADMIN_TI_RESP_TECNICO',
        descricao_curta:
          'Operação técnica dos sistemas, infraestrutura de rede, servidores, firewalls e suporte.',
        atribuicoes_detalhadas:
          '1. Administrar a infraestrutura tecnológica local e em nuvem da serventia (servidores, redes, estações de trabalho e telecomunicações);\n' +
          '2. Implementar e monitorar regras de firewall, segmentação de rede (VLANs), antivírus e atualizações de segurança nos sistemas operacionais;\n' +
          '3. Assegurar a estabilidade, desempenho e monitoramento ativo dos links redundantes de internet e energia (nobreaks e geradores);\n' +
          '4. Gerenciar chamados técnicos, integrações com sistemas externos (GLPI, webhooks) e manutenção preventiva de hardware;\n' +
          '5. Executar as diretrizes emanadas pelo Responsável pela Segurança da Informação e pela direção da serventia.',
        e_obrigatorio: true,
        da_ferramenta: false,
        modulo_vinculado: 'infraestrutura',
        ordem: 40,
      },
      {
        papel: 'Responsável pelo Continuidade / Backups',
        codigo: 'RESP_CONTINUIDADE_BACKUP',
        descricao_curta:
          'Garantia da rotina de cópias de segurança, retenções locais e em nuvem, RPO e testes de recuperação.',
        atribuicoes_detalhadas:
          '1. Supervisionar a execução diária e periódica de todas as rotinas de backup da serventia (banco de dados, arquivos e máquinas virtuais);\n' +
          '2. Validar a aderência aos parâmetros de RPO (Recovery Point Objective) e RTO (Recovery Time Objective) nos destinos local, nuvem e replicação;\n' +
          '3. Acompanhar as notificações automáticas de sucesso ou erro das ferramentas (Veeam, Acronis, relatórios do NOC e logs);\n' +
          '4. Planejar, executar e documentar periodicamente os Testes de Recuperação e Restauração de dados com laudos técnicos comprobatórios;\n' +
          '5. Reportar prontamente qualquer falha ou degradação na redundância dos dados para pronta remediação.',
        e_obrigatorio: true,
        da_ferramenta: false,
        modulo_vinculado: 'backup',
        ordem: 50,
      },
      {
        papel: 'Responsável pelo Inventário',
        codigo: 'RESP_INVENTARIO_ATIVOS',
        descricao_curta:
          'Cadastramento, conferência física, ciclo de vida e classificação de criticidade dos ativos.',
        atribuicoes_detalhadas:
          '1. Manter atualizado o catálogo e mapeamento físico/lógico de todos os ativos computacionais, de rede e periféricos da serventia;\n' +
          '2. Identificar e etiquetar os equipamentos, registrando números de série, localização física, responsabilidade e configurações técnicas;\n' +
          '3. Validar a classificação de criticidade de cada ativo e suas exigências de proteção junto aos módulos de governança e continuidade;\n' +
          '4. Registrar a entrada, movimentação, desativação ou descarte seguro de equipamentos computacionais e mídias de armazenamento;\n' +
          '5. Conduzir inventários físicos periódicos confrontando os dados da serventia com as integrações automatizadas (GLPI).',
        e_obrigatorio: true,
        da_ferramenta: false,
        modulo_vinculado: 'inventario',
        ordem: 60,
      },
      {
        papel: 'Suporte da CSCTI (Especialista da Ferramenta)',
        codigo: 'SUPORTE_CSCTI_FERRAMENTA',
        descricao_curta:
          'Atendimento técnico da ferramenta CSCTI - Compliance, parametrizações e sustentação do sistema.',
        atribuicoes_detalhadas:
          '1. Prestar suporte operacional e técnico aos usuários da serventia no uso da plataforma CSCTI - Compliance;\n' +
          '2. Auxiliar na configuração inicial, parametrizações de conectores (IMAP, GLPI) e rotinas automatizadas de conformidade;\n' +
          '3. Monitorar a saúde técnica das integrações e ingestão de comprovantes de conformidade dentro da ferramenta;\n' +
          '4. Orientar a equipe da serventia sobre as melhores práticas de registro de evidências e geração de laudos comprobatórios;\n' +
          '5. Atuar exclusivamente no escopo da ferramenta de software, sem ingerência nas atribuições jurídicas ou notariais da serventia.',
        e_obrigatorio: false,
        da_ferramenta: true,
        modulo_vinculado: 'ferramenta',
        ordem: 70,
      },
    ]

    try {
      const allOrgs = app.findRecordsByFilter('organizations', '', '', 100, 0)
      for (let o = 0; o < allOrgs.length; o++) {
        const orgId = allOrgs[o].id
        for (let r = 0; r < defaultRolesSeed.length; r++) {
          const item = defaultRolesSeed[r]
          const rec = new Record(papeisDesignados)
          rec.set('organization', orgId)
          rec.set('papel', item.papel)
          rec.set('codigo', item.codigo)
          rec.set('descricao_curta', item.descricao_curta)
          rec.set('atribuicoes_detalhadas', item.atribuicoes_detalhadas)
          rec.set('e_obrigatorio', item.e_obrigatorio)
          rec.set('da_ferramenta', item.da_ferramenta)
          rec.set('modulo_vinculado', item.modulo_vinculado)
          rec.set('ordem', item.ordem)
          rec.set('status', 'ativo')
          try {
            app.save(rec)
          } catch (_) {}
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('designacao_documentos')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('designacoes')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('papeis_designados')
      app.delete(col)
    } catch (_) {}
  },
)
