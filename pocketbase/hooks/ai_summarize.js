routerAdd(
  'POST',
  '/backend/v1/ai/summarize',
  (e) => {
    const body = e.requestInfo().body || {}
    const content = (body.content || '').trim()
    const source = body.source || 'manual'

    if (!content) {
      return e.badRequestError('Conteúdo é obrigatório')
    }

    const prompt = `Analise o conteúdo de trabalho a seguir (importado de ${source}) e responda estritamente em formato JSON válido contendo:
- "title": Um título conciso, profissional e descritivo (máximo 60 caracteres) em Português do Brasil.
- "summary": Um resumo executivo claro e direto de 2 a 3 frases em Português do Brasil.
- "tags": Uma lista de 3 a 5 palavras-chave relevantes (todas em minúsculas, sem caracteres especiais ou pontuação).

Conteúdo:
"""
${content.slice(0, 4000)}
"""

Formato da resposta (apenas o JSON, sem markdown e sem explicações adicionais):
{"title": "...", "summary": "...", "tags": ["tag1", "tag2", "tag3"]}`

    try {
      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente de produtividade especializado em sintetizar e estruturar contextos de trabalho para desenvolvedores e analistas. Responda APENAS em JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
      })

      const rawText = aiRes.choices?.[0]?.message?.content || ''
      // Limpar markdown se o modelo envolver com ```json ... ```
      let cleanText = rawText.trim()
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim()
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim()
      }

      let parsed = { title: '', summary: '', tags: [] }
      try {
        parsed = JSON.parse(cleanText)
      } catch (_) {
        parsed = {
          title: 'Contexto Importado',
          summary: cleanText.slice(0, 200),
          tags: [source],
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      return e.json(500, {
        message: 'Falha ao processar com IA: ' + (err.message || 'erro interno'),
      })
    }
  },
  $apis.requireAuth(),
)
