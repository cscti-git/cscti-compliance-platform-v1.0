/**
 * Módulo de Vínculo Rigoroso comprovante -> rotina e fontes de backup
 * CSCTI-Compliance Cartorial (PocketBase hooks)
 *
 * Regras:
 * - Normalização: trim, lowercase, colapso de múltiplos espaços em um só.
 * - Casamento EXATO (igualdade normalizada) contra:
 *     1) nome da rotina
 *     2) aliases da rotina (split por vírgula, normalizados)
 *     3) aliases de cada fonte de backup da organização
 * - PROIBIDO heurística fraca (includes parciais como 'vm', 'acronis', 'gold' etc.)
 * - PROIBIDO fallback (jamais associar primeira rotina arbitrariamente)
 * - Retorno: { rotina: null | Record, fontesVinculadas: [...], motivo: string }
 */

function normalizarTexto(str) {
  if (str === null || str === undefined) return ''
  return String(str).trim().toLowerCase().replace(/\s+/g, ' ')
}

function extrairAliases(campoAliases) {
  if (!campoAliases) return []
  const partes = String(campoAliases).split(',')
  const lista = []
  for (let i = 0; i < partes.length; i++) {
    const limpo = normalizarTexto(partes[i])
    if (limpo) {
      lista.push(limpo)
    }
  }
  return lista
}

function vinculoRigoroso(nomeJob, rotinas, fontes) {
  const jobNorm = normalizarTexto(nomeJob)
  const rotinasLista = Array.isArray(rotinas) ? rotinas : []
  const fontesLista = Array.isArray(fontes) ? fontes : []

  if (!jobNorm) {
    return {
      rotina: null,
      fontesVinculadas: [],
      motivo:
        'Nenhum nome de job identificado no comprovante — cadastre o alias em Rotinas & Fontes.',
    }
  }

  let rotinaEncontrada = null
  let motivoMatch = ''

  // 1. Casamento direto contra nome da rotina ou aliases da rotina
  for (let i = 0; i < rotinasLista.length; i++) {
    const r = rotinasLista[i]
    if (!r) continue

    const rNome = typeof r.getString === 'function' ? r.getString('nome') : r.nome || ''
    const rNomeNorm = normalizarTexto(rNome)

    if (rNomeNorm && rNomeNorm === jobNorm) {
      rotinaEncontrada = r
      motivoMatch = `Nome da rotina "${rNome}" coincide com o job "${nomeJob}"`
      break
    }

    const rAliasesRaw = typeof r.getString === 'function' ? r.getString('aliases') : r.aliases || ''
    const rAliases = extrairAliases(rAliasesRaw)
    let aliasCasado = null
    for (let j = 0; j < rAliases.length; j++) {
      if (rAliases[j] === jobNorm) {
        aliasCasado = rAliases[j]
        break
      }
    }

    if (aliasCasado) {
      rotinaEncontrada = r
      motivoMatch = `Alias da rotina "${rNome}" ("${aliasCasado}") coincide com o job "${nomeJob}"`
      break
    }
  }

  // 2. Se ainda não achou por rotina, verificar se casa contra aliases das fontes
  const fontesVinculadas = []

  for (let fI = 0; fI < fontesLista.length; fI++) {
    const f = fontesLista[fI]
    if (!f) continue

    const fNome = typeof f.getString === 'function' ? f.getString('nome') : f.nome || ''
    const fAliasesRaw = typeof f.getString === 'function' ? f.getString('aliases') : f.aliases || ''
    const fAliases = extrairAliases(fAliasesRaw)

    let casouFonte = false
    let aliasFonteCasado = null
    for (let aI = 0; aI < fAliases.length; aI++) {
      if (fAliases[aI] === jobNorm) {
        casouFonte = true
        aliasFonteCasado = fAliases[aI]
        break
      }
    }

    if (casouFonte) {
      fontesVinculadas.push(f)

      // Se ainda não achamos a rotina, a fonte pode indicar qual é a rotina dela
      if (!rotinaEncontrada) {
        const rotinaDaFonteId =
          typeof f.getString === 'function' ? f.getString('rotina') : f.rotina || ''
        if (rotinaDaFonteId) {
          for (let rI = 0; rI < rotinasLista.length; rI++) {
            const rCand = rotinasLista[rI]
            if (rCand && rCand.id === rotinaDaFonteId) {
              rotinaEncontrada = rCand
              motivoMatch = `Fonte "${fNome}" vinculada pelo alias "${aliasFonteCasado}" direcionou para a rotina cadastrada`
              break
            }
          }
        }
      }
    }
  }

  if (rotinaEncontrada) {
    return {
      rotina: rotinaEncontrada,
      fontesVinculadas: fontesVinculadas,
      motivo: motivoMatch || `Rotina vinculada com rigor para o job "${nomeJob}"`,
    }
  }

  return {
    rotina: null,
    fontesVinculadas: fontesVinculadas,
    motivo: `Nenhuma rotina corresponde ao job '${nomeJob}' — cadastre o alias em Rotinas & Fontes`,
  }
}

module.exports = {
  normalizarTexto,
  extrairAliases,
  vinculoRigoroso,
}
