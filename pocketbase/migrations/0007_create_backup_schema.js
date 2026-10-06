migrate(
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    const people = app.findCollectionByNameOrId('people')
    const assets = app.findCollectionByNameOrId('inventory_assets')

    // Regras de RLS padrão do CSCTI:
    // list/view = mesma organização ou admin
    // create/update/delete = admin ou suporte da mesma organização (ou admin geral)
    // delete em alguns itens críticos = admin
    const rlsRead =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin')"
    const rlsWrite =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && (@request.auth.system_role = 'admin' || @request.auth.system_role = 'suporte')"
    const rlsAdmin =
      "@request.auth.id != '' && (organization = @request.auth.organization || @request.auth.system_role = 'admin') && @request.auth.system_role = 'admin'"

    // 1. backup_escopo
    const backupEscopo = new Collection({
      name: 'backup_escopo',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
        { name: 'descricao', type: 'text' },
        { name: 'sistemas_protegidos', type: 'text' },
        {
          name: 'criticidade',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo', 'em_revisao'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_bkescopo_org_status ON backup_escopo (organization, status)'],
    })
    app.save(backupEscopo)

    // 2. backup_planos
    const backupPlanos = new Collection({
      name: 'backup_planos',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
        { name: 'descricao', type: 'text' },
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
      indexes: ['CREATE INDEX idx_bkplanos_org_status ON backup_planos (organization, status)'],
    })
    app.save(backupPlanos)

    // 3. backup_plano_requisitos
    // RLS: precisa de organization direto para a regra RLS funcionar perfeitamente e ter filtro veloz
    const backupPlanoRequisitos = new Collection({
      name: 'backup_plano_requisitos',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsWrite,
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
          name: 'plano',
          type: 'relation',
          required: true,
          collectionId: backupPlanos.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'requisito', type: 'text', required: true },
        { name: 'parametro', type: 'text', required: true },
        {
          name: 'tipo_requisito',
          type: 'select',
          values: ['rpo', 'rto', 'retencao', 'periodicidade', 'armazenamento', 'outro'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bkreq_plano ON backup_plano_requisitos (plano)',
        'CREATE INDEX idx_bkreq_org ON backup_plano_requisitos (organization)',
      ],
    })
    app.save(backupPlanoRequisitos)

    // 4. backup_rotinas
    const backupRotinas = new Collection({
      name: 'backup_rotinas',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsWrite,
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
          name: 'plano',
          type: 'relation',
          required: true,
          collectionId: backupPlanos.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'periodicidade',
          type: 'select',
          required: true,
          values: ['diaria', 'semanal', 'mensal', 'personalizada'],
          maxSelect: 1,
        },
        { name: 'horario', type: 'text' },
        { name: 'dias_semana', type: 'json' },
        {
          name: 'responsavel',
          type: 'relation',
          required: false,
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
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
        'CREATE INDEX idx_bkrotinas_org ON backup_rotinas (organization)',
        'CREATE INDEX idx_bkrotinas_plano ON backup_rotinas (plano)',
      ],
    })
    app.save(backupRotinas)

    // 5. backup_fontes
    const backupFontes = new Collection({
      name: 'backup_fontes',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsWrite,
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
          name: 'rotina',
          type: 'relation',
          required: true,
          collectionId: backupRotinas.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'ativo_inventario',
          type: 'relation',
          required: false,
          collectionId: assets.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo_fonte',
          type: 'select',
          required: true,
          values: ['banco_de_dados', 'arquivos', 'sistema', 'e_mail', 'maquina_virtual', 'outro'],
          maxSelect: 1,
        },
        { name: 'caminho_identificacao', type: 'text', required: true },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bkfontes_rotina ON backup_fontes (rotina)',
        'CREATE INDEX idx_bkfontes_org ON backup_fontes (organization)',
      ],
    })
    app.save(backupFontes)

    // 6. backup_regras_identificacao
    const backupRegrasIdentificacao = new Collection({
      name: 'backup_regras_identificacao',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsWrite,
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
          name: 'fonte',
          type: 'relation',
          required: false,
          collectionId: backupFontes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'remetente_filtro', type: 'text' },
        { name: 'assunto_contem', type: 'text' },
        { name: 'padrao_conteudo', type: 'text' },
        {
          name: 'adaptador',
          type: 'select',
          required: true,
          values: ['EMAIL_HTML_GENERICO', 'LOG_BRUTO_TEXTO', 'JSON_WEBHOOK'],
          maxSelect: 1,
        },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_bkregras_org ON backup_regras_identificacao (organization)'],
    })
    app.save(backupRegrasIdentificacao)

    // 7. backup_evidencias (SHA-256 único por organização para idempotência)
    const backupEvidencias = new Collection({
      name: 'backup_evidencias',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
          name: 'rotina',
          type: 'relation',
          required: false,
          collectionId: backupRotinas.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'fonte',
          type: 'relation',
          required: false,
          collectionId: backupFontes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['e_mail', 'upload_manual', 'webhook'],
          maxSelect: 1,
        },
        { name: 'remetente', type: 'text' },
        { name: 'assunto', type: 'text' },
        { name: 'data_recebida', type: 'date' },
        { name: 'hash_conteudo', type: 'text', required: true },
        { name: 'conteudo', type: 'text' },
        {
          name: 'status_processamento',
          type: 'select',
          required: true,
          values: ['pendente', 'processada', 'erro', 'nao_reconhecida'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_bkevidencias_org_hash ON backup_evidencias (organization, hash_conteudo)',
        'CREATE INDEX idx_bkevidencias_org_status ON backup_evidencias (organization, status_processamento)',
      ],
    })
    app.save(backupEvidencias)

    // 8. backup_processamentos
    const backupProcessamentos = new Collection({
      name: 'backup_processamentos',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
          name: 'evidencia',
          type: 'relation',
          required: true,
          collectionId: backupEvidencias.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'adaptador_usado', type: 'text', required: true },
        { name: 'versao_adaptador', type: 'text' },
        { name: 'resultado', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bkproc_evidencia ON backup_processamentos (evidencia)',
        'CREATE INDEX idx_bkproc_org ON backup_processamentos (organization)',
      ],
    })
    app.save(backupProcessamentos)

    // 9. backup_execucoes
    const backupExecucoes = new Collection({
      name: 'backup_execucoes',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
          name: 'rotina',
          type: 'relation',
          required: false,
          collectionId: backupRotinas.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'evidencia',
          type: 'relation',
          required: false,
          collectionId: backupEvidencias.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date' },
        { name: 'data_fim', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['sucesso', 'erro', 'parcial', 'nao_executada'],
          maxSelect: 1,
        },
        {
          name: 'origem_registro',
          type: 'select',
          required: true,
          values: ['manual', 'evidencia'],
          maxSelect: 1,
        },
        { name: 'tamanho_bytes', type: 'number' },
        { name: 'tamanho_formatado', type: 'text' },
        { name: 'destino', type: 'text' },
        { name: 'observacao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bkexec_org_status ON backup_execucoes (organization, status)',
        'CREATE INDEX idx_bkexec_org_inicio ON backup_execucoes (organization, data_inicio DESC)',
      ],
    })
    app.save(backupExecucoes)

    // 10. backup_avaliacoes
    const backupAvaliacoes = new Collection({
      name: 'backup_avaliacoes',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
          name: 'execucao',
          type: 'relation',
          required: true,
          collectionId: backupExecucoes.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'resultado_conformidade',
          type: 'select',
          required: true,
          values: ['conforme', 'nao_conforme', 'atencao'],
          maxSelect: 1,
        },
        { name: 'detalhe', type: 'text' },
        { name: 'itens_avaliados', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bkaval_execucao ON backup_avaliacoes (execucao)',
        'CREATE INDEX idx_bkaval_org ON backup_avaliacoes (organization)',
      ],
    })
    app.save(backupAvaliacoes)

    // 11. backup_ocorrencias
    const backupOcorrencias = new Collection({
      name: 'backup_ocorrencias',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'falha_de_backup',
            'falta_de_evidencia',
            'atraso_de_rotina',
            'erro_de_processamento',
            'teste_sem_sucesso',
            'outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'severidade',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberta', 'em_analise', 'resolvida'],
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'execucao',
          type: 'relation',
          required: false,
          collectionId: backupExecucoes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'evidencia',
          type: 'relation',
          required: false,
          collectionId: backupEvidencias.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'resolucao', type: 'text' },
        { name: 'resolvida_em', type: 'date' },
        {
          name: 'resolvida_por',
          type: 'relation',
          required: false,
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bkocorr_org_status ON backup_ocorrencias (organization, status)',
        'CREATE INDEX idx_bkocorr_org_tipo ON backup_ocorrencias (organization, tipo)',
      ],
    })
    app.save(backupOcorrencias)

    // 12. backup_testes_recuperacao
    const backupTestesRecuperacao = new Collection({
      name: 'backup_testes_recuperacao',
      type: 'base',
      listRule: rlsRead,
      viewRule: rlsRead,
      createRule: rlsWrite,
      updateRule: rlsWrite,
      deleteRule: rlsAdmin,
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
          name: 'ativo',
          type: 'relation',
          required: false,
          collectionId: assets.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'fonte',
          type: 'relation',
          required: false,
          collectionId: backupFontes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'data_teste', type: 'date', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['restauracao_total', 'restauracao_parcial', 'simulacao'],
          maxSelect: 1,
        },
        {
          name: 'resultado',
          type: 'select',
          required: true,
          values: ['sucesso', 'parcial', 'falha'],
          maxSelect: 1,
        },
        { name: 'tempo_decorrido_minutos', type: 'number' },
        {
          name: 'responsavel',
          type: 'relation',
          required: false,
          collectionId: people.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'escopo_testado', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'evidencia_comprobatoria', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bktestes_org_data ON backup_testes_recuperacao (organization, data_teste DESC)',
      ],
    })
    app.save(backupTestesRecuperacao)

    // Seed inicial para a organização "CSCTI - teste" para o usuário Leandro testar imediatamente
    try {
      const demoOrg = app.findFirstRecordByData('organizations', 'name', 'CSCTI - teste')
      if (demoOrg) {
        // Escopo inicial
        const escopoRec = new Record(backupEscopo)
        escopoRec.set('organization', demoOrg.id)
        escopoRec.set('nome', 'Escopo Principal de Continuidade da Serventia')
        escopoRec.set(
          'descricao',
          'Abrange o banco de dados do sistema notarial/registral, repositório de documentos digitalizados e imagens de máquinas virtuais dos servidores de aplicação.',
        )
        escopoRec.set(
          'sistemas_protegidos',
          'SGBD PostgreSQL (atos notariais), Storage NAS (PDF/A e certidões), VM-SVR-APLICACAO-01',
        )
        escopoRec.set('criticidade', 'alta')
        escopoRec.set('status', 'ativo')
        app.save(escopoRec)

        // Plano inicial
        const planoRec = new Record(backupPlanos)
        planoRec.set('organization', demoOrg.id)
        planoRec.set('nome', 'Plano de Continuidade e Cópia 3-2-1')
        planoRec.set(
          'descricao',
          'Estratégia 3-2-1 de cópias de segurança com 3 vias, 2 mídias distintas e 1 cópia externa/nuvem com retenção de 30 dias e histórico semestral.',
        )
        planoRec.set('status', 'ativo')
        app.save(planoRec)

        // Requisitos do plano
        const reqData = [
          {
            req: 'RPO Alvo (Ponto Máximo de Recuperação)',
            param: 'Máximo de 24 horas (diário)',
            tipo: 'rpo',
          },
          {
            req: 'RTO Alvo (Tempo Máximo de Restauração)',
            param: 'Até 4 horas para sistemas críticos',
            tipo: 'rto',
          },
          {
            req: 'Política de Retenção Local',
            param: '30 dias de cópias incrementais e completas semanais',
            tipo: 'retencao',
          },
          {
            req: 'Local de Armazenamento Secundário',
            param: 'Storage NAS isolado e nuvem criptografada externa',
            tipo: 'armazenamento',
          },
        ]
        for (let r = 0; r < reqData.length; r++) {
          const rq = new Record(backupPlanoRequisitos)
          rq.set('organization', demoOrg.id)
          rq.set('plano', planoRec.id)
          rq.set('requisito', reqData[r].req)
          rq.set('parametro', reqData[r].param)
          rq.set('tipo_requisito', reqData[r].tipo)
          app.save(rq)
        }

        // Buscar pessoa responsável (Leandro) se houver
        let respPersonId = null
        try {
          const p = app.findFirstRecordByData('people', 'organization', demoOrg.id)
          if (p) respPersonId = p.id
        } catch (_) {}

        // Rotina inicial
        const rotinaRec = new Record(backupRotinas)
        rotinaRec.set('organization', demoOrg.id)
        rotinaRec.set('plano', planoRec.id)
        rotinaRec.set('nome', 'Rotina Noturna Diária — Banco de Dados e Documentos')
        rotinaRec.set('periodicidade', 'diaria')
        rotinaRec.set('horario', '23:00')
        rotinaRec.set('dias_semana', ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'])
        if (respPersonId) rotinaRec.set('responsavel', respPersonId)
        rotinaRec.set('status', 'ativo')
        app.save(rotinaRec)

        // Buscar ativo de inventário se houver
        let assetDbId = null
        try {
          const ast = app.findFirstRecordByData('inventory_assets', 'organization', demoOrg.id)
          if (ast) assetDbId = ast.id
        } catch (_) {}

        // Fonte inicial
        const fonteRec = new Record(backupFontes)
        fonteRec.set('organization', demoOrg.id)
        fonteRec.set('rotina', rotinaRec.id)
        if (assetDbId) fonteRec.set('ativo_inventario', assetDbId)
        fonteRec.set('tipo_fonte', 'banco_de_dados')
        fonteRec.set('caminho_identificacao', 'PostgreSQL /base_atos_cartorio (Dump Full + WALs)')
        fonteRec.set('ativo', true)
        app.save(fonteRec)

        // Regra de identificação inicial
        const regraRec = new Record(backupRegrasIdentificacao)
        regraRec.set('organization', demoOrg.id)
        regraRec.set('fonte', fonteRec.id)
        regraRec.set('nome', 'Identificador de E-mails Veeam / Bacula / Shell Backup')
        regraRec.set('remetente_filtro', 'backup')
        regraRec.set('assunto_contem', 'Backup')
        regraRec.set('adaptador', 'EMAIL_HTML_GENERICO')
        regraRec.set('ativo', true)
        app.save(regraRec)

        // Teste de recuperação homologado
        const testeRec = new Record(backupTestesRecuperacao)
        testeRec.set('organization', demoOrg.id)
        if (assetDbId) testeRec.set('ativo', assetDbId)
        testeRec.set('fonte', fonteRec.id)
        testeRec.set('data_teste', '2025-01-15 14:00:00.000Z')
        testeRec.set('tipo', 'restauracao_total')
        testeRec.set('resultado', 'sucesso')
        testeRec.set('tempo_decorrido_minutos', 42)
        if (respPersonId) testeRec.set('responsavel', respPersonId)
        testeRec.set(
          'escopo_testado',
          'Restauração de banco de dados do cartório em ambiente isolado (sandbox de teste).',
        )
        testeRec.set(
          'observacoes',
          'Base restaurada com 100% de integridade referencial. Tabelas de livros e atos conferidas sem inconsistências.',
        )
        testeRec.set(
          'evidencia_comprobatoria',
          'Laudo emitido pelo encarregado de TI com hash de integridade verificado com sucesso.',
        )
        app.save(testeRec)
      }
    } catch (_) {}
  },
  (app) => {
    const cols = [
      'backup_testes_recuperacao',
      'backup_ocorrencias',
      'backup_avaliacoes',
      'backup_execucoes',
      'backup_processamentos',
      'backup_evidencias',
      'backup_regras_identificacao',
      'backup_fontes',
      'backup_rotinas',
      'backup_plano_requisitos',
      'backup_planos',
      'backup_escopo',
    ]
    for (let i = 0; i < cols.length; i++) {
      try {
        const c = app.findCollectionByNameOrId(cols[i])
        app.delete(c)
      } catch (_) {}
    }
  },
)
