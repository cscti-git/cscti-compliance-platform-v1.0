routerAdd(
  'POST',
  '/backend/v1/ai/analyze',
  (e) => {
    const body = e.requestInfo().body || {}
    const content = (body.content || '').trim()
    const title = (body.title || '').trim()
    const summary = (body.summary || '').trim()
    const action = (body.action || '').trim()
    const customQuestion = (body.customQuestion || '').trim()

    if (!content) {
      return e.badRequestError('Conteúdo é obrigatório')
    }

    let userInstruction = ''
    if (action === 'bullets') {
      userInstruction =
        'Faça um resumo analítico e bem estruturado em bullet points dos principais pontos, decisões e detalhes técnicos.'
    } else if (action === 'tasks') {
      userInstruction =
        'Identifique e extraia todas as tarefas, pendências, checklists ou itens acionáveis encontrados neste contexto.'
    } else if (action === 'simple') {
      userInstruction =
        'Explique este conteúdo em termos simples e acessíveis, ideal para alinhar com partes não-técnicas ou stakeholders.'
    } else if (action === 'next_steps') {
      userInstruction =
        'Sugira os próximos passos lógicos e recomendações práticas para dar andamento neste trabalho ou projeto.'
    } else if (customQuestion) {
      userInstruction = customQuestion
    } else {
      userInstruction = 'Analise e faça considerações úteis sobre este conteúdo de trabalho.'
    }

    const prompt = `Contexto de Trabalho:
Título: ${title}
Resumo prévio: ${summary}

Conteúdo Original:
"""
${content.slice(0, 5000)}
"""

Solicitação: ${userInstruction}
Por favor, responda de forma profissional e formatada em Markdown claro em Português do Brasil.`

    try {
      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              "Você é o assistente inteligente do aplicativo 'Contexto', que ajuda desenvolvedores e times a reaproveitarem seus contextos de trabalho gerados em ChatGPT, Claude, Gemini ou VMs.",
          },
          { role: 'user', content: prompt },
        ],
      })

      const responseText = aiRes.choices?.[0]?.message?.content || ''
      return e.json(200, { result: responseText })
    } catch (err) {
      return e.json(500, {
        message: 'Falha ao analisar com IA: ' + (err.message || 'erro interno'),
      })
    }
  },
  $apis.requireAuth(),
)
