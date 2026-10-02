migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const contexts = app.findCollectionByNameOrId('contexts')

    // 1. Seed or find user leandro@cscti.com.br
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'leandro@cscti.com.br')
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('leandro@cscti.com.br')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Leandro')
      app.save(userRecord)
    }

    // 2. Seed initial sample contexts for this user (idempotent)
    const sampleContexts = [
      {
        title: 'Análise de requisitos para dashboard financeiro',
        source: 'chatgpt',
        summary:
          'Discussão detalhada sobre requisitos funcionais e métricas de desempenho de um dashboard de fluxo de caixa, incluindo gráficos de receitas, despesas e relatórios em PDF.',
        content:
          'Usuário: Como estruturar os requisitos de um dashboard financeiro para microempresas?\n\nChatGPT: Recomendo focar nos pilares fundamentais:\n1. Fluxo de Caixa Diário e Mensal (entradas, saídas, saldo previsto).\n2. DRE Simplificada (Receita Bruta, Custos Operacionais, EBITDA).\n3. Conciliação Bancária com importação de OFX e extratos.\n4. Alertas de contas a pagar/receber nos próximos 7 dias.\n5. Exportação em PDF e Excel.\n\nSugiro utilizar gráficos de linha para evolução do saldo e barras agrupadas para receitas vs despesas.',
        tags: ['financeiro', 'dashboard', 'requisitos'],
      },
      {
        title: 'Configuração de ambiente de desenvolvimento React',
        source: 'vm',
        summary:
          'Passo a passo técnico para preparar a VM de desenvolvimento com Node.js LTS, Vite, TypeScript, Tailwind CSS e Docker para banco local.',
        content:
          '# Setup da Máquina Virtual de Desenvolvimento\n\n1. Atualização do sistema:\n`sudo apt update && sudo apt upgrade -y`\n\n2. Instalação do Node.js v20 via fnm:\n`curl -fsSL https://fnm.vercel.app/install | bash`\n`fnm install 20 && fnm default 20`\n\n3. Instalação do pnpm e Vite:\n`npm install -g pnpm`\n\n4. Docker compose para serviços auxiliares (Redis, SQLite, PocketBase):\nExecutando containers isolados na porta 8090.',
        tags: ['react', 'ambiente', 'vm'],
      },
      {
        title: 'Estratégia de conteúdo para redes sociais',
        source: 'gemini',
        summary:
          'Plano editorial focado em geração de autoridade B2B, com cadência semanal de publicações no LinkedIn e carrosséis técnicos no Instagram.',
        content:
          'Planejamento Semanal:\n\n- Segunda-feira: Artigo analítico sobre tendências de automação no mercado B2B.\n- Terça-feira: Dica prática de produtividade com uso de ferramentas de IA.\n- Quarta-feira: Estudo de caso de cliente com métricas de redução de tempo em 40%.\n- Quinta-feira: Carrossel com erros comuns na transição de contextos entre ferramentas.\n- Sexta-feira: Reflexão sobre aprendizados da semana e convite para newsletter.',
        tags: ['marketing', 'conteúdo', 'estratégia'],
      },
    ]

    for (let i = 0; i < sampleContexts.length; i++) {
      const item = sampleContexts[i]
      try {
        app.findFirstRecordByData('contexts', 'title', item.title)
        // Already exists, skip
      } catch (_) {
        const record = new Record(contexts)
        record.set('title', item.title)
        record.set('source', item.source)
        record.set('summary', item.summary)
        record.set('content', item.content)
        record.set('tags', item.tags)
        record.set('owner_id', userRecord.id)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'leandro@cscti.com.br')
      const records = app.findRecordsByFilter('contexts', `owner_id = '${user.id}'`, '', 100, 0)
      for (let i = 0; i < records.length; i++) {
        app.delete(records[i])
      }
    } catch (_) {}
  },
)
