migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')

    // 1. Coleção conformidade_itens (catálogo neutro dos itens de conformidade por etapa)
    const conformidadeItens = new Collection({
      name: 'conformidade_itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.system_role = 'admin'",
      fields: [
        { name: 'codigo', type: 'text', required: true }, // ex: "1.1", "2.1", etc.
        { name: 'etapa', type: 'number', required: true }, // 1 a 6
        { name: 'etapa_titulo', type: 'text', required: true },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text', required: true },
        { name: 'exigencia_detalhada', type: 'text' },
        { name: 'modulo_origem', type: 'text' }, // designacoes, lgpd, inventario, evidencias, backup, seguranca, manual
        { name: 'link_modulo', type: 'text' }, // Rota direta para o módulo
        { name: 'tipo_evidencia_esperada', type: 'text' },
        { name: 'obrigatorio_c1', type: 'bool' },
        { name: 'obrigatorio_c2', type: 'bool' },
        { name: 'obrigatorio_c3', type: 'bool' },
        { name: 'ordem', type: 'number', required: true },
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
        'CREATE UNIQUE INDEX idx_conf_itens_codigo ON conformidade_itens (codigo)',
        'CREATE INDEX idx_conf_itens_etapa ON conformidade_itens (etapa, ordem)',
      ],
    })
    app.save(conformidadeItens)

    // 2. Coleção conformidade_status (registro por serventia e item de conformidade)
    const conformidadeStatus = new Collection({
      name: 'conformidade_status',
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
          name: 'item',
          type: 'relation',
          required: true,
          collectionId: conformidadeItens.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'item_codigo', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['comprovado', 'parcial', 'pendente', 'nao_conforme'],
          maxSelect: 1,
        },
        { name: 'fonte_modulo', type: 'text' },
        { name: 'referencia_comprovante', type: 'text' },
        { name: 'link_comprovante', type: 'text' },
        { name: 'hash_sha256', type: 'text' },
        { name: 'data_comprovacao', type: 'date' },
        { name: 'avaliado_automaticamente', type: 'bool' },
        { name: 'avaliado_por', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'metadados', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_conf_status_org_item ON conformidade_status (organization, item_codigo)',
        'CREATE INDEX idx_conf_status_org_st ON conformidade_status (organization, status)',
      ],
    })
    app.save(conformidadeStatus)

    // 3. Coleção conformidade_eventos (trilha append-only de alterações e histórico)
    const conformidadeEventos = new Collection({
      name: 'conformidade_eventos',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      createRule:
        "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')",
      updateRule: null, // append-only
      deleteRule: null, // append-only
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: orgs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'item_codigo', type: 'text', required: true },
        { name: 'status_anterior', type: 'text' },
        { name: 'status_novo', type: 'text', required: true },
        { name: 'origem_avaliacao', type: 'text' }, // automatico_modulo, manual_declarado
        { name: 'usuario_nome', type: 'text' },
        { name: 'motivo', type: 'text' },
        { name: 'evidencia_referencia', type: 'text' },
        { name: 'hash_sha256', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_conf_eventos_org_item ON conformidade_eventos (organization, item_codigo, created DESC)',
      ],
    })
    app.save(conformidadeEventos)

    // 4. Catálogo neutro dos 56 itens de conformidade distribuídos nas 6 Etapas
    const ITENS_SEED = [
      // ================= ETAPA 1: GOVERNANÇA E CONFORMIDADE LEGAL (1.1 a 1.11) =================
      {
        codigo: '1.1',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Designações formais de responsáveis e atribuições',
        descricao:
          'Designação formalizada do Responsável pela Segurança da Informação, Encarregado de Dados e equipe técnica com termos assinados.',
        exigencia_detalhada:
          'A serventia deve possuir formalizadas e assinadas as designações dos papéis institucionais e técnicos essenciais.',
        modulo_origem: 'designacoes',
        link_modulo: '/configuracoes?tab=papeis',
        tipo_evidencia_esperada:
          'Termo de designação com assinatura física ou digital e hash SHA-256',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 101,
      },
      {
        codigo: '1.2',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Política de Segurança da Informação aprovada e ciência dos colaboradores',
        descricao:
          'PSI formalmente aprovada pela direção da serventia, com comprovantes de ciência e capacitação de prepostos e colaboradores.',
        exigencia_detalhada:
          'Documento da Política de Segurança da Informação aprovado pelo Titular e com registro de ciência expressa de colaboradores.',
        modulo_origem: 'lgpd',
        link_modulo: '/lgpd?tab=ciencia',
        tipo_evidencia_esperada:
          'Termos de ciência da PSI assinados pelos colaboradores com protocolo',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 102,
      },
      {
        codigo: '1.3',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Política de controle de acessos lógicos e segregação de funções',
        descricao:
          'Regras formais de concessão, revisão periódica e revogação imediata de credenciais e privilégios de acesso aos sistemas.',
        exigencia_detalhada:
          'Procedimento operacional documentado de gerenciamento de identidades e acessos com segregação de funções.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Documento de política de acessos e relatório de revisão de privilégios',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 103,
      },
      {
        codigo: '1.4',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Registro das operações de tratamento de dados pessoais (ROPA)',
        descricao:
          'Mapeamento completo dos ciclos de vida de dados pessoais tratados na serventia, com finalidades, bases legais e retenção.',
        exigencia_detalhada:
          'Inventário formal das operações de tratamento de dados com discriminação de dados sensíveis e tempos de descarte.',
        modulo_origem: 'lgpd',
        link_modulo: '/lgpd?tab=operacoes',
        tipo_evidencia_esperada: 'Relatório ROPA institucional preenchido e atualizado',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 104,
      },
      {
        codigo: '1.5',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Procedimento formal de gestão e resposta a incidentes de segurança',
        descricao:
          'Fluxo documentado para detecção, triagem, contenção, investigação e registro formal de incidentes de segurança cibernética.',
        exigencia_detalhada:
          'Processo institucionalizado e equipe definida para tratamento imediato de ocorrências de segurança.',
        modulo_origem: 'lgpd',
        link_modulo: '/lgpd?tab=incidentes',
        tipo_evidencia_esperada:
          'Fluxograma e formulário de registro de incidentes institucionalizado',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 105,
      },
      {
        codigo: '1.6',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Canal de comunicação de incidentes com prazo de até 72 horas',
        descricao:
          'Capacidade comprovada de notificação tempestiva à direção, autoridade competente e titulares em caso de incidentes relevantes.',
        exigencia_detalhada:
          'Canal e modelo de relatório pré-estabelecido para envio de comunicação com prazo de resposta em até 72 horas.',
        modulo_origem: 'lgpd',
        link_modulo: '/lgpd?tab=incidentes',
        tipo_evidencia_esperada:
          'Canal oficial configurado e registro de protocolo de teste/comunicação',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 106,
      },
      {
        codigo: '1.7',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Inventário completo e atualizado de ativos tecnológicos',
        descricao:
          'Catálogo de servidores, estações de trabalho, equipamentos de rede, mídias de armazenamento e serviços em nuvem.',
        exigencia_detalhada:
          'Inventário com identificação unívoca, número de série, localização física e classificação de criticidade dos ativos.',
        modulo_origem: 'inventario',
        link_modulo: '/ativos',
        tipo_evidencia_esperada: 'Relatório consolidado do inventário com sincronização ativa',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 107,
      },
      {
        codigo: '1.8',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Contratos e licenças com cláusulas formais de proteção e confidencialidade',
        descricao:
          'Instrumentos contratuais de fornecedores de TI e prestadores com cláusulas de sigilo, níveis de serviço e conformidade.',
        exigencia_detalhada:
          'Contratos de suporte, software de cartório e serviços com aditivos de segurança e confidencialidade anexados.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Cópias de contratos e termos de confidencialidade com fornecedores',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 108,
      },
      {
        codigo: '1.9',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Programa de conscientização e treinamento periódico da equipe',
        descricao:
          'Evidências de treinamentos e orientações ministrados aos prepostos sobre segurança da informação e prevenção a ameaças.',
        exigencia_detalhada:
          'Lista de presença, certificados ou atas de treinamento de equipe sobre boas práticas cibernéticas.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada: 'Certificados, listas de presença e materiais de capacitação',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 109,
      },
      {
        codigo: '1.10',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Regulamentação de uso de dispositivos pessoais e trabalho remoto (BYOD)',
        descricao:
          'Diretriz formal regulamentando requisitos de segurança para eventual acesso remoto ou uso de dispositivos móveis.',
        exigencia_detalhada:
          'Termo de uso e política de acesso remoto com exigência de canal seguro (VPN) e autenticação forte.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada: 'Norma interna de trabalho remoto e registros de ciência',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 110,
      },
      {
        codigo: '1.11',
        etapa: 1,
        etapa_titulo: 'Etapa 1 — Governança e Conformidade Legal',
        titulo: 'Procedimento seguro para descarte de mídias e documentos sigilosos',
        descricao:
          'Método formal de desmagnetização, trituração física ou sobrescrita segura de mídias de armazenamento e discos desativados.',
        exigencia_detalhada:
          'Laudos ou termos de descarte seguro de mídias e equipamentos com certificação de destruição segura dos dados.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada: 'Termo de descarte seguro ou laudo de empresa especializada',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 111,
      },

      // ================= ETAPA 2: INFRAESTRUTURA E CONTINUIDADE (2.1 a 2.9) =================
      {
        codigo: '2.1',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Energia elétrica ininterrupta: nobreak dimensionado e laudo de aterramento',
        descricao:
          'Sistemas de alimentação ininterrupta (nobreaks) para servidores e equipamentos críticos com laudo elétrico de aterramento.',
        exigencia_detalhada:
          'Comprovação de nobreaks operacionais com autonomia suficiente e relatório técnico de aterramento elétrico das instalações.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Fotos do nobreak, laudo de aterramento elétrico com ART/RRT anexado',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 201,
      },
      {
        codigo: '2.2',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Plano de contingência energética e gerador (quando exigível por classe)',
        descricao:
          'Solução de contingência contra interrupções prolongadas de fornecimento elétrico (gerador de energia ou contrato dedicado).',
        exigencia_detalhada:
          'Registro de inspeção e funcionamento do gerador ou procedimento alternativo formal de contingência de energia.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Fotos do gerador, contrato de manutenção preventiva e laudo de teste',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 202,
      },
      {
        codigo: '2.3',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Ambiente físico restrito com controle de acesso e climatização',
        descricao:
          'Sala de servidores ou rack fechado com controle físico de acesso, climatização dedicada e prevenção contra incêndio.',
        exigencia_detalhada:
          'Fotografias e registros do ambiente seguro de TI, com chave/biometria, ar-condicionado redundante e extintor adequado.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Fotos da sala de TI/rack, controle de entrada e extintor para eletrônicos',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 203,
      },
      {
        codigo: '2.4',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Conectividade e redundância de links de internet conforme classe',
        descricao:
          'Links dedicados de alta disponibilidade com failover automático ou secundário conforme o porte e classe da serventia.',
        exigencia_detalhada:
          'Contratos de provedores de acesso a internet distintos e configuração de redundância de roteamento.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada: 'Contratos e faturas de dois links distintos de telecomunicação',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 204,
      },
      {
        codigo: '2.5',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Plano de continuidade e rotinas de backup com RTO e RPO definidos',
        descricao:
          'Política de cópias de segurança locais e remotas com tempos máximos de recuperação (RTO) e perda de dados (RPO) pactuados.',
        exigencia_detalhada:
          'Planos e rotinas de backup cadastradas com escopo de ativos protegidos, periodicidade e retenção em conformidade.',
        modulo_origem: 'backup',
        link_modulo: '/backup',
        tipo_evidencia_esperada:
          'Comprovantes automáticos de execução de backup e laudos de validação',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 205,
      },
      {
        codigo: '2.6',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Backup em nuvem ou local geograficamente distinto com retenção histórica',
        descricao:
          'Envio diário ou periódico de cópias para destino externo seguro, garantindo sobrevivência em caso de sinistro físico.',
        exigencia_detalhada:
          'Comprovação de rotinas de cópia para destino Nuvem ou Replicação com integridade verificada.',
        modulo_origem: 'backup',
        link_modulo: '/backup',
        tipo_evidencia_esperada:
          'Laudo de backup em modalidade Nuvem ou Replicação dentro da janela RPO',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 206,
      },
      {
        codigo: '2.7',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Endpoint/antivírus em todas as estações, sem sistemas operacionais sem suporte',
        descricao:
          'Proteção ativa de estações e servidores com solução homologada e erradicação de sistemas descontinuados pelo fabricante.',
        exigencia_detalhada:
          'Relatório de console de antivírus cobrindo 100% dos ativos inventariados e ausência de sistemas legados desatualizados.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=cobertura',
        tipo_evidencia_esperada:
          'Relatório de console de endpoint com número de máquinas protegidas',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 207,
      },
      {
        codigo: '2.8',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Documento formal de arquitetura tecnológica e topologia de rede',
        descricao:
          'Diagrama atualizado da rede da serventia, detalhando segmentação de VLANs, roteadores, servidores e firewall.',
        exigencia_detalhada:
          'Topologia física e lógica elaborada por responsável técnico, com mapa de endereçamento IP e fluxos de dados.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada: 'Diagrama de rede assinado pelo responsável técnico de TI',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 208,
      },
      {
        codigo: '2.9',
        etapa: 2,
        etapa_titulo: 'Etapa 2 — Infraestrutura e Continuidade Operacional',
        titulo: 'Firewall perimetral ativo com regras restritivas e inspeção de conexões',
        descricao:
          'Dispositivo ou software dedicado de borda controlando tráfego de entrada e saída, bloqueando acessos indevidos.',
        exigencia_detalhada:
          'Comprovante técnico de configuração de firewall com inspeção de portas e revisão periódica de permissões.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=solucoes',
        tipo_evidencia_esperada:
          'Relatório de regras do firewall e print da console de administração',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 209,
      },

      // ================= ETAPA 3: PROTEÇÃO E CRIPTOGRAFIA (3.1 a 3.10) =================
      {
        codigo: '3.1',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Criptografia em repouso nos bancos de dados e volumes de armazenamento',
        descricao:
          'Uso de algoritmos fortes (AES-256 ou equivalente) em discos, storages e bancos com dados notariais e registrais.',
        exigencia_detalhada:
          'Comprovação de cifragem ativa nas partições de banco de dados e arquivos digitais da serventia.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada: 'Laudo técnico de configuração de criptografia de banco e volume',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 301,
      },
      {
        codigo: '3.2',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Criptografia em trânsito com protocolos modernos (TLS 1.2+)',
        descricao:
          'Garantia de que todo tráfego web, conexões administrativas e consultas externas utilizem HTTPS/TLS 1.2 ou superior.',
        exigencia_detalhada:
          'Certificados digitais SSL/TLS válidos e desativação de cifras e protocolos legados (SSLv3, TLS 1.0, TLS 1.1).',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Relatório de teste SSL/TLS ou verificação de certificado com cifra forte',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 302,
      },
      {
        codigo: '3.3',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Gestão segura de chaves criptográficas e certificados digitais',
        descricao:
          'Mecanismos de armazenamento seguro de chaves privadas (tokens criptográficos, HSM ou cofres virtuais homologados).',
        exigencia_detalhada:
          'Procedimento formal de controle de expiração, renovação e custódia segura de certificados digitais.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Inventário de certificados e registro de custódia física/lógica de tokens',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 303,
      },
      {
        codigo: '3.4',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Autenticação multifator (MFA) nos acessos administrativos e externos',
        descricao:
          'Exigência de segundo fator de autenticação para acessos à VPN, consoles de servidores, e-mails e sistemas de gestão.',
        exigencia_detalhada:
          'Comprovante de habilitação do MFA obrigatório para usuários com perfil de suporte, administrador e acesso externo.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Relatório de políticas ativas de MFA do provedor de identidade ou console',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 304,
      },
      {
        codigo: '3.5',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Política de complexidade de senhas e bloqueio após tentativas inválidas',
        descricao:
          'Requisitos técnicos de comprimento mínimo, caracteres variados, rotação periódica e bloqueio contra força bruta.',
        exigencia_detalhada:
          'Parâmetros implementados no diretório de usuários (Active Directory ou LDAP local) comprovados.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada: 'Print de GPO ou configuração de política de senhas do domínio',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 305,
      },
      {
        codigo: '3.6',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Segmentação de rede local em zonas e isolamento de rede Wi-Fi de visitantes',
        descricao:
          'Separação lógica entre a rede de produção da serventia, equipamentos de balcão e rede sem fio para o público.',
        exigencia_detalhada:
          'VLANs configuradas com isolamento estrito de tráfego impedindo acesso da rede pública aos servidores internos.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Configuração do switch/roteador com as VLANs e regras de firewall inter-zonas',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 306,
      },
      {
        codigo: '3.7',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Controle de portas USB e mídias removíveis não autorizadas',
        descricao:
          'Bloqueio de uso indiscriminado de pendrives e discos externos nas estações para prevenir vazamento e contaminação.',
        exigencia_detalhada:
          'Política aplicada via GPO ou software de endpoint bloqueando gravação em mídias USB não autorizadas.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Comprovante de configuração de política de bloqueio de armazenamento USB',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 307,
      },
      {
        codigo: '3.8',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Proteção contra e-mails maliciosos, phishing e spoofing (SPF, DKIM e DMARC)',
        descricao:
          'Registros DNS configurados no domínio oficial da serventia com políticas rigorosas de validação de remetentes.',
        exigencia_detalhada:
          'Comprovante de validação externa dos registros SPF, chave DKIM e política DMARC em modo quarentena/rejeição.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Relatório de checagem dos registros SPF, DKIM e DMARC na zona DNS',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 308,
      },
      {
        codigo: '3.9',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Criptografia das cópias de backup com chave protegida fora do ambiente de origem',
        descricao:
          'Garantia de que os arquivos de backup gerados estejam protegidos por chave forte, impossibilitando leitura não autorizada.',
        exigencia_detalhada:
          'Parâmetro de criptografia de job habilitado nos softwares de backup (Veeam, Acronis ou similar).',
        modulo_origem: 'backup',
        link_modulo: '/backup',
        tipo_evidencia_esperada:
          'Configuração do job de backup comprovando a criptografia habilitada',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 309,
      },
      {
        codigo: '3.10',
        etapa: 3,
        etapa_titulo: 'Etapa 3 — Proteção e Criptografia',
        titulo: 'Auditoria de integridade dos arquivos e registros notariais',
        descricao:
          'Cálculo periódico de resumos criptográficos (hashes SHA-256) dos livros, termos e acervos digitalizados da serventia.',
        exigencia_detalhada:
          'Relatório de conferência de integridade das bases de dados com registros de hashes verificados.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Relatório de integridade com lista de hashes calculados e validados',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 310,
      },

      // ================= ETAPA 4: DETECÇÃO E RESPOSTA (4.1 a 4.9) =================
      {
        codigo: '4.1',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo:
          'Gestão contínua de vulnerabilidades com correção de falhas críticas em até 30 dias',
        descricao:
          'Varreduras periódicas de falhas de segurança em sistemas e aplicação prioritária de patches e atualizações de segurança.',
        exigencia_detalhada:
          'Relatórios de escaneamento de vulnerabilidades demonstrando tratamento tempestivo dos alertas de criticidade alta.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Relatório de scanner de vulnerabilidade e histórico de aplicação de patches',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 401,
      },
      {
        codigo: '4.2',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Monitoramento contínuo de eventos de segurança (SOC ou NOC dedicado)',
        descricao:
          'Acompanhamento de telemetria, logs de acesso, quedas de links e alertas de incidentes 24/7 ou em horário operacional.',
        exigencia_detalhada:
          'Contrato ativo com central de monitoramento (NOC/SOC) e relatórios periódicos de análise preventiva.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=solucoes',
        tipo_evidencia_esperada: 'Relatórios analíticos do SOC/NOC e atestados de monitoramento',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 402,
      },
      {
        codigo: '4.3',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Centralização e guarda segura de logs de auditoria por no mínimo 1 ano',
        descricao:
          'Servidor de logs remoto (Syslog/SIEM) com retenção mínima legal, impedindo adulteração por agentes locais.',
        exigencia_detalhada:
          'Configuração de exportação de logs de roteadores, firewalls e servidores para repositório protegido.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada: 'Comprovante do servidor de logs com política de retenção ativada',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 403,
      },
      {
        codigo: '4.4',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Sincronização de relógios de todos os sistemas via protocolo NTP oficial',
        descricao:
          'Alinhamento temporal de todos os servidores e equipamentos da serventia com a hora oficial brasileira (NTP.br).',
        exigencia_detalhada:
          'Configuração dos servidores e estações apontando para servidores de tempo homologados com verificação de desvio.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada: 'Comprovante de sincronização NTP com os servidores do ntp.br',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 404,
      },
      {
        codigo: '4.5',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Detecção e resposta de ameaças em estações com módulo EDR ou equivalente',
        descricao:
          'Monitoramento comportamental contra ramsomware, bloqueio de processos maliciosos e isolamento automático de hosts.',
        exigencia_detalhada:
          'Console de gerenciamento demonstrando telemetria em tempo real e proteção comportamental habilitada.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=cobertura',
        tipo_evidencia_esperada: 'Laudo de proteção com módulo comportamental/antiransomware ativo',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 405,
      },
      {
        codigo: '4.6',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Procedimento formal de preservação de evidências forenses em caso de invasão',
        descricao:
          'Protocolo documentado de isolamento de rede, geração de imagem forense e cadeia de custódia para perícia policial.',
        exigencia_detalhada:
          'Manual de conduta da equipe técnica e modelo de relatório de custódia de dados em caso de sinistro digital.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada: 'Documento normativo de preservação forense e cadeia de custódia',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 406,
      },
      {
        codigo: '4.7',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Controle de alteração e monitoramento de integridade de arquivos críticos (FIM)',
        descricao:
          'Monitoramento de modificações não autorizadas em arquivos de configuração dos sistemas e bancos de dados.',
        exigencia_detalhada:
          'Software ou rotina de inspeção de integridade gerando alertas diante de alterações em binários do sistema.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Relatório ou log do serviço de verificação de integridade de arquivos',
        obrigatorio_c1: false,
        obrigatorio_c2: false,
        obrigatorio_c3: true,
        ordem: 407,
      },
      {
        codigo: '4.8',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Simulação periódica de phishing e engenharia social com os colaboradores',
        descricao:
          'Testes controlados para avaliar o discernimento dos prepostos na identificação de fraudes e e-mails suspeitos.',
        exigencia_detalhada:
          'Relatório de campanha de simulação de phishing com percentual de acerto e plano educativo para reincidentes.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Relatório analítico de resultado da campanha de simulação de phishing',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 408,
      },
      {
        codigo: '4.9',
        etapa: 4,
        etapa_titulo: 'Etapa 4 — Detecção e Resposta a Incidentes',
        titulo: 'Revisão semestral de permissões administrativas e contas desativadas',
        descricao:
          'Expurgo sistemático de credenciais de colaboradores desligados e redução das permissões ao mínimo necessário.',
        exigencia_detalhada:
          'Ata formal de revisão de contas de usuários com assinatura do Responsável pela Segurança.',
        modulo_origem: 'seguranca',
        link_modulo: '/seguranca?tab=checklist',
        tipo_evidencia_esperada:
          'Relatório assinado de auditoria de contas do diretório de usuários',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 409,
      },

      // ================= ETAPA 5: CONTINUIDADE AVANÇADA E TESTES (5.1 a 5.8) =================
      {
        codigo: '5.1',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Teste periódico de restauração de backup com laudo técnico formal',
        descricao:
          'Simulação de recuperação completa ou parcial de banco de dados em ambiente isolado, cronometrando tempo e integridade.',
        exigencia_detalhada:
          'Laudo emitido por profissional técnico habilitado comprovando a restauração bem-sucedida e consistência dos registros.',
        modulo_origem: 'backup',
        link_modulo: '/backup',
        tipo_evidencia_esperada:
          'Laudo de teste de restauração com tempo decorrido, escopo e assinatura técnica',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 501,
      },
      {
        codigo: '5.2',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Simulação anual de extração integral e portabilidade do acervo',
        descricao:
          'Teste demonstrando a capacidade da serventia de extrair e exportar a totalidade dos dados notariais e registrais.',
        exigencia_detalhada:
          'Registro de execução do procedimento de extração do banco em formato padronizado e auditável.',
        modulo_origem: 'backup',
        link_modulo: '/backup',
        tipo_evidencia_esperada:
          'Relatório de simulação de extração de base de dados com validação de hashes',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 502,
      },
      {
        codigo: '5.3',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Plano de Continuidade de Negócios (PCN) e Recuperação de Desastres (DRP)',
        descricao:
          'Documento detalhado contemplando procedimentos de contingência para sinistros graves (incêndio, inundação, furto).',
        exigencia_detalhada:
          'Manual de desastre contendo contatos de emergência, ordem de restabelecimento dos serviços e local secundário de operação.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada: 'Plano de Continuidade de Negócios homologado pelo Titular',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 503,
      },
      {
        codigo: '5.4',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Teste prático de contingência energética e autonomia dos nobreaks',
        descricao:
          'Simulação de corte geral do fornecimento elétrico da concessionária para atestar a entrada efetiva dos nobreaks e gerador.',
        exigencia_detalhada:
          'Relatório de teste prático de chaveamento sem interrupção dos serviços com medição da autonomia real observada.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Relatório fotográfico e laudo de teste com corte simulado de energia',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 504,
      },
      {
        codigo: '5.5',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Teste prático de failover dos links de internet secundários',
        descricao:
          'Desconexão forçada do link principal de fibra óptica para comprovar comutação automática para a conexão reserva.',
        exigencia_detalhada:
          'Registro de log do roteador demonstrando tempo de transição sem perda das sessões ativas da serventia.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada: 'Relatório do teste de failover emitido pelo responsável de rede',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 505,
      },
      {
        codigo: '5.6',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Validação da imutabilidade das cópias de segurança (Backup Imutável / WORM)',
        descricao:
          'Configuração de retenção protegida contra exclusão ou criptografia acidental, invulnerável a ameaças ramsomware.',
        exigencia_detalhada:
          'Comprovante técnico de repositório imutável habilitado com bloqueio de expiração antecipada.',
        modulo_origem: 'backup',
        link_modulo: '/backup',
        tipo_evidencia_esperada:
          'Print da console comprovando flag de imutabilidade (Object Lock/WORM)',
        obrigatorio_c1: false,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 506,
      },
      {
        codigo: '5.7',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Avaliação de maturidade de segurança e auditoria independente',
        descricao:
          'Auditoria externa ou avaliação técnica de conformidade realizada por empresa ou consultoria especializada de segurança.',
        exigencia_detalhada:
          'Relatório de diagnóstico de segurança com recomendações de melhoria e plano de remediação associado.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Relatório de avaliação técnica emitido por entidade ou perito independente',
        obrigatorio_c1: false,
        obrigatorio_c2: false,
        obrigatorio_c3: true,
        ordem: 507,
      },
      {
        codigo: '5.8',
        etapa: 5,
        etapa_titulo: 'Etapa 5 — Continuidade Avançada e Testes Operacionais',
        titulo: 'Atualização periódica e teste de mesa do plano de incidentes cibernéticos',
        descricao:
          'Reunião anual da equipe gestora para simular cenários hipotéticos de vazamento ou indisponibilidade crítica (tabletop).',
        exigencia_detalhada:
          'Ata assinada de exercício simulado de crise de segurança com registro de lições aprendidas e revisões documentais.',
        modulo_origem: 'lgpd',
        link_modulo: '/lgpd?tab=incidentes',
        tipo_evidencia_esperada: 'Ata de reunião e relatório de exercício de crise cibernética',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 508,
      },

      // ================= ETAPA 6: DOSSIÊ FINAL E DECLARAÇÃO ANUAL (6.1 a 6.9) =================
      {
        codigo: '6.1',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Consolidação de evidências comprobatórias de todas as etapas',
        descricao:
          'Reunião e validação cruzada de todos os atestados, laudos, fotografias e políticas institucionais obrigatórias.',
        exigencia_detalhada:
          'Auditoria integral dos vínculos de comprovação das Etapas 1 a 5, sem pendências críticas impeditivas.',
        modulo_origem: 'manual',
        link_modulo: '/conformidade',
        tipo_evidencia_esperada:
          'Verificação do painel de conformidade com todas as etapas precedentes concluídas',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 601,
      },
      {
        codigo: '6.2',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Cálculo e verificação de hashes SHA-256 de todas as evidências arquivadas',
        descricao:
          'Garantia de integridade documental inviolável para apresentação em inspeção ou auditoria correicional.',
        exigencia_detalhada:
          'Tabela de integridade dos arquivos comprobatórios com resumo SHA-256 aferido no armazenamento seguro.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Relatório oficial contendo hashes SHA-256 de todos os anexos comprobatórios',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 602,
      },
      {
        codigo: '6.3',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Geração formal do Dossiê de Etapas em formato de impressão e custódia digital',
        descricao:
          'Emissão de relatórios estruturados de cada etapa, discriminando itens obrigatórios e comprovantes vinculados.',
        exigencia_detalhada:
          'Dossiê comprobatório formatado em padrão A4 institucional da serventia com numeração sequencial de folhas.',
        modulo_origem: 'manual',
        link_modulo: '/relatorios/conformidade',
        tipo_evidencia_esperada: 'Dossiê técnico emitido pelo sistema CSCTI - Compliance',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 603,
      },
      {
        codigo: '6.4',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Assinatura digital institucional do Titular / Responsável pela Serventia',
        descricao:
          'Subscrição do documento pelo responsável legal mediante certificado digital ICP-Brasil válido.',
        exigencia_detalhada:
          'Assinatura eletrônica qualificada com protocolo e datação certificada dos relatórios comprobatórios.',
        modulo_origem: 'designacoes',
        link_modulo: '/relatorios/conformidade',
        tipo_evidencia_esperada: 'Manifesto assinado digitalmente pelo Titular da Serventia',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 604,
      },
      {
        codigo: '6.5',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Preenchimento e protocolo da declaração periódica perante a autoridade competente',
        descricao:
          'Submissão dos dados de conformidade nos formulários oficiais dos sistemas institucionais de fiscalização.',
        exigencia_detalhada:
          'Comprovante de envio ou protocolo de declaração de cumprimento de diretrizes técnicas.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Comprovante ou protocolo emitido pelo sistema oficial de fiscalização',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 605,
      },
      {
        codigo: '6.6',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Custódia das evidências e dossiês pelo prazo mínimo de 5 anos',
        descricao:
          'Repositório arquivístico permanente assegurando guarda inviolável e disponibilidade imediata para inspeções futuras.',
        exigencia_detalhada:
          'Política de arquivo institucional garantindo preservação de todos os dossiês e laudos pelo quinquênio legal.',
        modulo_origem: 'evidencias',
        link_modulo: '/evidencias',
        tipo_evidencia_esperada:
          'Termo de arquivamento seguro e política de guarda documental de 5 anos',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 606,
      },
      {
        codigo: '6.7',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Registro de planos de ação para itens com necessidade de aprimoramento contínuo',
        descricao:
          'Cadastro de medidas preventivas e corretivas com prazos determinados para aperfeiçoamento contínuo.',
        exigencia_detalhada:
          'Mapeamento dos planos de adequação com responsáveis designados e acompanhamento de status.',
        modulo_origem: 'manual',
        link_modulo: '/planos-de-acao',
        tipo_evidencia_esperada: 'Cronograma formal de planos de ação registrado',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 607,
      },
      {
        codigo: '6.8',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo:
          'Relatório Executivo Simplificado (Classes 1) ou Dossiê Técnico Integral (Classes 2 e 3)',
        descricao:
          'Adequação do formato de comprovação ao porte da serventia: modelo sintético ou aprofundado com hash de integridade.',
        exigencia_detalhada:
          'Documento compatibilizado com a exigência proporcional à classe da serventia conforme cadastro.',
        modulo_origem: 'manual',
        link_modulo: '/relatorios/conformidade',
        tipo_evidencia_esperada: 'Relatório estruturado emitido conforme a classe da serventia',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 608,
      },
      {
        codigo: '6.9',
        etapa: 6,
        etapa_titulo: 'Etapa 6 — Dossiê Final Comprobatório e Declaração Anual',
        titulo: 'Certidão institucional de conformidade do ambiente expedida pela plataforma CSCTI',
        descricao:
          'Atestado emitido pela plataforma CSCTI - Compliance consolidando a trilha de integridade, telemetria e auditoria.',
        exigencia_detalhada:
          'Certificado de encerramento do ciclo de conformidade com QR Code / hash de validação pública.',
        modulo_origem: 'manual',
        link_modulo: '/relatorios/conformidade',
        tipo_evidencia_esperada:
          'Certidão eletrônica de conformidade técnica emitida pela plataforma CSCTI',
        obrigatorio_c1: true,
        obrigatorio_c2: true,
        obrigatorio_c3: true,
        ordem: 609,
      },
    ]

    // Salvar itens do catálogo
    for (let i = 0; i < ITENS_SEED.length; i++) {
      const it = ITENS_SEED[i]
      const rec = new Record(conformidadeItens)
      rec.set('codigo', it.codigo)
      rec.set('etapa', it.etapa)
      rec.set('etapa_titulo', it.etapa_titulo)
      rec.set('titulo', it.titulo)
      rec.set('descricao', it.descricao)
      rec.set('exigencia_detalhada', it.exigencia_detalhada)
      rec.set('modulo_origem', it.modulo_origem)
      rec.set('link_modulo', it.link_modulo)
      rec.set('tipo_evidencia_esperada', it.tipo_evidencia_esperada)
      rec.set('obrigatorio_c1', it.obrigatorio_c1)
      rec.set('obrigatorio_c2', it.obrigatorio_c2)
      rec.set('obrigatorio_c3', it.obrigatorio_c3)
      rec.set('ordem', it.ordem)
      rec.set('status', 'ativo')
      try {
        app.save(rec)
      } catch (err) {
        // Se já existir, ignora
      }
    }

    // 5. Seed inicial de conformidade_status para serventias existentes
    try {
      const allOrgs = app.findRecordsByFilter('organizations', '', '', 100, 0)
      const allCatalogItens = app.findRecordsByFilter('conformidade_itens', '', 'ordem', 200, 0)

      for (let o = 0; o < allOrgs.length; o++) {
        const org = allOrgs[o]
        for (let itIdx = 0; itIdx < allCatalogItens.length; itIdx++) {
          const catalogItem = allCatalogItens[itIdx]
          const stRec = new Record(conformidadeStatus)
          stRec.set('organization', org.id)
          stRec.set('item', catalogItem.id)
          stRec.set('item_codigo', catalogItem.getString('codigo'))
          stRec.set('status', 'pendente')
          stRec.set('fonte_modulo', catalogItem.getString('modulo_origem'))
          stRec.set('referencia_comprovante', '')
          stRec.set('link_comprovante', catalogItem.getString('link_modulo'))
          stRec.set('avaliado_automaticamente', true)
          stRec.set('observacoes', 'Aguardando comprovação integrada no ambiente do cliente.')
          try {
            app.save(stRec)
          } catch (_) {}
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('conformidade_eventos')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('conformidade_status')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('conformidade_itens')
      app.delete(col)
    } catch (_) {}
  },
)
