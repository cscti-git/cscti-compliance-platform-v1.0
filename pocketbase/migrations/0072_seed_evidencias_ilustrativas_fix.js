migrate(
  (app) => {
    // 1. Garantir que a coleção evidencias aceita SVG nos mimeTypes
    try {
      const col = app.findCollectionByNameOrId('evidencias')
      const arquivosField = col.fields.getByName('arquivos')
      if (arquivosField) {
        // Garantir image/svg+xml nos mimeTypes
        const tipos = arquivosField.mimeTypes || []
        if (tipos.indexOf('image/svg+xml') === -1) {
          tipos.push('image/svg+xml')
          arquivosField.mimeTypes = tipos
          app.save(col)
        }
      }
    } catch (e) {
      console.log('Aviso ao ajustar mimeTypes de evidencias:', e)
    }

    // 2. Identificar organizações ativas
    let orgs = []
    try {
      orgs = app.findRecordsByFilter('organizations', '', '-created', 10, 0)
    } catch (e) {
      console.log('Erro ao buscar organizações:', e)
      return
    }

    if (!orgs || orgs.length === 0) {
      console.log('Nenhuma organização encontrada')
      return
    }

    const evidenciasCol = app.findCollectionByNameOrId('evidencias')
    const categoriasCol = app.findCollectionByNameOrId('evidencia_categorias')

    // 8 ilustrações requisitadas pelo usuário
    const ilustracoes = [
      {
        catCode: 'RACKS',
        catNome: 'Racks',
        titulo: 'Ilustração — Rack de servidores 42U',
        descricao:
          'Ilustração técnica esquemática do rack de servidores 42U fechado com PDUs redundantes. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'rack', 'topologia', 'simulada'],
      },
      {
        catCode: 'NOBREAKS',
        catNome: 'Nobreaks',
        titulo: 'Ilustração — Nobreak senoidal online e banco de baterias',
        descricao:
          'Ilustração técnica esquemática do nobreak senoidal online de dupla conversão e gabinete externo de baterias estacionárias. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'nobreak', 'energia', 'simulada'],
      },
      {
        catCode: 'GERADOR',
        catNome: 'Gerador de energia',
        titulo: 'Ilustração — Grupo motogerador e QTA',
        descricao:
          'Ilustração técnica esquemática do grupo motogerador silenciado com quadro de transferência automática (QTA). Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'gerador', 'energia', 'simulada'],
      },
      {
        catCode: 'AR_CONDICIONADO',
        catNome: 'Ar-condicionado',
        titulo: 'Ilustração — Ar-condicionado split em revezamento',
        descricao:
          'Ilustração técnica esquemática da climatização contínua com revezamento automático 24x7 e monitoramento térmico. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'climatizacao', 'ambiente_fisico', 'simulada'],
      },
      {
        catCode: 'EXTINTORES',
        catNome: 'Extintores de incêndio',
        titulo: 'Ilustração — Extintor de incêndio CO2 limpo',
        descricao:
          'Ilustração técnica esquemática do extintor classe BC por gás limpo (CO2) próprio para equipamentos de informática. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'extintor', 'incendio', 'simulada'],
      },
      {
        catCode: 'SERVIDORES',
        catNome: 'Servidores',
        titulo: 'Ilustração — Servidores hosts e virtualização',
        descricao:
          'Ilustração técnica esquemática dos servidores físicos em cluster de alta disponibilidade para virtualização de bancos e sistemas. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'servidores', 'cluster', 'simulada'],
      },
      {
        catCode: 'SWITCHES_REDES',
        catNome: 'Switches / Redes',
        titulo: 'Ilustração — Switches gerenciáveis e DIO de fibra óptica',
        descricao:
          'Ilustração técnica esquemática do switch de núcleo gerenciável L3 e distribuidor interno óptico (DIO) com uplinks 10G. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'switch', 'rede', 'fibra', 'simulada'],
      },
      {
        catCode: 'SALA_TI',
        catNome: 'Sala de TI',
        titulo: 'Ilustração — Sala de TI com controle biométrico e CFTV',
        descricao:
          'Ilustração técnica esquemática da porta reforçada com tranca eletromagnética, leitor biométrico IP e câmera de monitoramento. Imagem ilustrativa a ser substituída pela foto real da serventia.',
        tags: ['ilustracao', 'sala_ti', 'acesso_fisico', 'simulada'],
      },
    ]

    const dataHoje = '2026-10-13 12:00:00.000Z'

    // Iterar para cada organização encontrada (especialmente a de teste principal)
    for (let o = 0; o < orgs.length; o++) {
      const orgId = orgs[o].id

      for (let i = 0; i < ilustracoes.length; i++) {
        const item = ilustracoes[i]

        // Buscar categoria da org
        let catId = ''
        let catNome = item.catNome
        try {
          const cats = app.findRecordsByFilter(
            'evidencia_categorias',
            `organization = '${orgId}' && (code = '${item.catCode}' || name ~ '${item.catNome}')`,
            'ordem',
            1,
            0,
          )
          if (cats && cats.length > 0) {
            catId = cats[0].id
            catNome = cats[0].getString('name') || item.catNome
          }
        } catch (_) {}

        // Verificar se já existe evidência com este título
        let rec
        try {
          const existentes = app.findRecordsByFilter(
            'evidencias',
            `organization = '${orgId}' && titulo = '${item.titulo}'`,
            '',
            1,
            0,
          )
          if (existentes && existentes.length > 0) {
            rec = existentes[0]
          }
        } catch (_) {}

        if (!rec) {
          rec = new Record(evidenciasCol)
          rec.set('organization', orgId)
        }

        if (catId) rec.set('categoria', catId)
        rec.set('categoria_nome', catNome)
        rec.set('titulo', item.titulo)
        rec.set('descricao', item.descricao)
        rec.set('data_evidencia', dataHoje)
        rec.set('responsavel_registro', 'Sistema CSCTI (Ilustração Regulamentar)')
        rec.set('tags', item.tags)
        rec.set('status', 'conforme')
        rec.set(
          'observacoes_revisao',
          'Imagem ilustrativa temporária semeada para composição topológica. Substituir pela foto real da serventia quando da vistoria.',
        )

        try {
          app.save(rec)
        } catch (errSave) {
          console.log(`Erro ao salvar evidencia ${item.titulo}:`, errSave)
        }
      }
    }
  },
  (app) => {
    try {
      const records = app.findRecordsByFilter('evidencias', "titulo ~ 'Ilustração —'", '', 200, 0)
      for (let i = 0; i < records.length; i++) {
        app.delete(records[i])
      }
    } catch (_) {}
  },
)
