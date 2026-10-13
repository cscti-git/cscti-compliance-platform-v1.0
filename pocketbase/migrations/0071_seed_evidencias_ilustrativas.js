migrate(
  (app) => {
    // Buscar a organização de teste principal e categorias existentes
    let org
    try {
      org = app.findFirstRecordByData('organizations', 'name', 'CSCTI - teste 2')
    } catch (_) {
      try {
        const orgs = app.findRecordsByFilter('organizations', '', '-created', 1, 0)
        if (orgs.length > 0) org = orgs[0]
      } catch (e) {
        console.log('Nenhuma organização encontrada para seed de evidências ilustrativas:', e)
        return
      }
    }

    if (!org) {
      console.log('Organização não localizada para o seed')
      return
    }

    const orgId = org.id
    const evidenciasCol = app.findCollectionByNameOrId('evidencias')
    const categoriasCol = app.findCollectionByNameOrId('evidencia_categorias')

    // Mapeamento das 8 categorias pedidas com seus arquivos e descrições
    const ilustracoes = [
      {
        catCode: 'RACKS',
        catNomeFallback: 'Racks',
        titulo: 'Ilustração — Rack de servidores 42U',
        descricao:
          'Ilustração técnica esquemática do rack de servidores 42U fechado com PDUs redundantes. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-rack.svg',
        tags: ['ilustracao', 'rack', 'topologia', 'simulada'],
      },
      {
        catCode: 'NOBREAKS',
        catNomeFallback: 'Nobreaks',
        titulo: 'Ilustração — Nobreak senoidal online e banco de baterias',
        descricao:
          'Ilustração técnica esquemática do nobreak senoidal online de dupla conversão e gabinete externo de baterias estacionárias. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-nobreak.svg',
        tags: ['ilustracao', 'nobreak', 'energia', 'simulada'],
      },
      {
        catCode: 'GERADOR',
        catNomeFallback: 'Gerador de energia',
        titulo: 'Ilustração — Grupo motogerador e QTA',
        descricao:
          'Ilustração técnica esquemática do grupo motogerador silenciado com quadro de transferência automática (QTA). Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-gerador.svg',
        tags: ['ilustracao', 'gerador', 'energia', 'simulada'],
      },
      {
        catCode: 'AR_CONDICIONADO',
        catNomeFallback: 'Ar-condicionado',
        titulo: 'Ilustração — Ar-condicionado split em revezamento',
        descricao:
          'Ilustração técnica esquemática da climatização contínua com revezamento automático 24x7 e monitoramento térmico. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-ar-condicionado.svg',
        tags: ['ilustracao', 'climatizacao', 'ambiente_fisico', 'simulada'],
      },
      {
        catCode: 'EXTINTORES',
        catNomeFallback: 'Extintores de incêndio',
        titulo: 'Ilustração — Extintor de incêndio CO2 limpo',
        descricao:
          'Ilustração técnica esquemática do extintor classe BC por gás limpo (CO2) próprio para equipamentos de informática. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-extintor.svg',
        tags: ['ilustracao', 'extintor', 'incendio', 'simulada'],
      },
      {
        catCode: 'SERVIDORES',
        catNomeFallback: 'Servidores',
        titulo: 'Ilustração — Servidores hosts e virtualização',
        descricao:
          'Ilustração técnica esquemática dos servidores físicos em cluster de alta disponibilidade para virtualização de bancos e sistemas. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-servidores.svg',
        tags: ['ilustracao', 'servidores', 'cluster', 'simulada'],
      },
      {
        catCode: 'SWITCHES_REDES',
        catNomeFallback: 'Switches / Redes',
        titulo: 'Ilustração — Switches gerenciáveis e DIO de fibra óptica',
        descricao:
          'Ilustração técnica esquemática do switch de núcleo gerenciável L3 e distribuidor interno óptico (DIO) com uplinks 10G. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-switches.svg',
        tags: ['ilustracao', 'switch', 'rede', 'fibra', 'simulada'],
      },
      {
        catCode: 'SALA_TI',
        catNomeFallback: 'Sala de TI',
        titulo: 'Ilustração — Sala de TI com controle biométrico e CFTV',
        descricao:
          'Ilustração técnica esquemática da porta reforçada com tranca eletromagnética, leitor biométrico IP e câmera de monitoramento. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        arquivo: 'ilustracao-sala-ti.svg',
        tags: ['ilustracao', 'sala_ti', 'acesso_fisico', 'simulada'],
      },
    ]

    const dataHoje = new Date().toISOString().split('T')[0] + ' 00:00:00.000Z'

    for (let i = 0; i < ilustracoes.length; i++) {
      const item = ilustracoes[i]

      // Localizar a categoria correspondente na serventia
      let catId = ''
      let catNome = item.catNomeFallback
      try {
        const catRecs = app.findRecordsByFilter(
          'evidencia_categorias',
          `organization = '${orgId}' && (code = '${item.catCode}' || name ~ '${item.catNomeFallback}')`,
          'ordem',
          1,
          0,
        )
        if (catRecs.length > 0) {
          catId = catRecs[0].id
          catNome = catRecs[0].getString('name') || item.catNomeFallback
        }
      } catch (_) {}

      // Verificar se já existe evidência semeada com este título para evitar duplicação
      try {
        const existentes = app.findRecordsByFilter(
          'evidencias',
          `organization = '${orgId}' && titulo = '${item.titulo}'`,
          '',
          1,
          0,
        )
        if (existentes.length > 0) {
          // Atualiza registro existente garantindo tags e descrição
          const rec = existentes[0]
          rec.set('categoria_nome', catNome)
          if (catId) rec.set('categoria', catId)
          rec.set('descricao', item.descricao)
          rec.set('tags', item.tags)
          rec.set('arquivos', [item.arquivo])
          rec.set('status', 'conforme')
          app.save(rec)
          continue
        }
      } catch (_) {}

      // Criar nova evidência ilustrativa
      const rec = new Record(evidenciasCol)
      rec.set('organization', orgId)
      if (catId) rec.set('categoria', catId)
      rec.set('categoria_nome', catNome)
      rec.set('titulo', item.titulo)
      rec.set('descricao', item.descricao)
      rec.set('data_evidencia', dataHoje)
      rec.set('responsavel_registro', 'Sistema CSCTI (Ilustração Regulamentar)')
      rec.set('tags', item.tags)
      rec.set('arquivos', [item.arquivo])
      rec.set('status', 'conforme')
      rec.set(
        'observacoes_revisao',
        'Imagem ilustrativa temporária semeada para composição topológica. Substituir pela foto real da serventia quando da vistoria.',
      )

      try {
        app.save(rec)
      } catch (err) {
        console.log(`Erro ao semear evidencia ilustrativa ${item.titulo}:`, err)
      }
    }
  },
  (app) => {
    // Rollback: remove registros criados com o prefixo "Ilustração —"
    try {
      const records = app.findRecordsByFilter('evidencias', "titulo ~ 'Ilustração —'", '', 100, 0)
      for (let i = 0; i < records.length; i++) {
        app.delete(records[i])
      }
    } catch (_) {}
  },
)
