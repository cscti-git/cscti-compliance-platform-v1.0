/**
 * Utilitários centralizados de formatação de data/hora no padrão brasileiro (São Paulo)
 * Fuso horário: America/Sao_Paulo (UTC-3)
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo'
export const BRAZIL_LOCALE = 'pt-BR'

/**
 * Formata data e hora completos: DD/MM/AAAA, HH:mm:ss ou HH:mm no fuso de São Paulo
 */
export function formatDateTime(
  date: string | number | Date | null | undefined,
  options?: { includeSeconds?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? '-'
  if (!date) return fallback

  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return fallback

    return d.toLocaleString(BRAZIL_LOCALE, {
      timeZone: BRAZIL_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: options?.includeSeconds ? '2-digit' : undefined,
    })
  } catch (_) {
    return fallback
  }
}

/**
 * Formata apenas data: DD/MM/AAAA no fuso de São Paulo
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  fallback = '-',
): string {
  if (!date) return fallback

  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return fallback

    return d.toLocaleDateString(BRAZIL_LOCALE, {
      timeZone: BRAZIL_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch (_) {
    return fallback
  }
}

/**
 * Formata apenas hora: HH:mm:ss ou HH:mm no fuso de São Paulo
 */
export function formatTime(
  date: string | number | Date | null | undefined,
  includeSeconds = true,
  fallback = '-',
): string {
  if (!date) return fallback

  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return fallback

    return d.toLocaleTimeString(BRAZIL_LOCALE, {
      timeZone: BRAZIL_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
    })
  } catch (_) {
    return fallback
  }
}

/**
 * Converte data para string no fuso America/Sao_Paulo no formato YYYY-MM-DD
 */
function getLocalDateStringSp(date: Date): string {
  // Cria representação de data local no fuso de SP
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

/**
 * Formata tempo relativo no padrão brasileiro ("hoje", "ontem", "há N dias", "há Nh", "há N min")
 * considerando o fuso horário America/Sao_Paulo para cálculo de dias civis.
 */
export function formatRelativeTimeSp(
  date: string | number | Date | null | undefined,
  fallback = 'nunca',
): string {
  if (!date) return fallback
  try {
    const d = date instanceof Date ? date : new Date(date)
    const timeMs = d.getTime()
    if (isNaN(timeMs)) return fallback

    const now = new Date()
    const diffMs = now.getTime() - timeMs
    if (diffMs < 0) return 'agora'

    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)

    if (diffSec < 60) return `há ${diffSec}s`
    if (diffMin < 60) return `há ${diffMin} min`
    if (diffHour < 24) {
      // Comparar também se caiu em dia civil anterior
      const todayStr = getLocalDateStringSp(now)
      const targetStr = getLocalDateStringSp(d)
      if (todayStr === targetStr) {
        return `há ${diffHour}h`
      }
    }

    // Comparação de dias civis no fuso de Brasília
    const todayStr = getLocalDateStringSp(now)
    const targetStr = getLocalDateStringSp(d)
    if (todayStr === targetStr) {
      return 'hoje'
    }

    // Calcular diferença de dias a partir dos dias civis
    const [yNow, mNow, dNow] = todayStr.split('-').map(Number)
    const [yTgt, mTgt, dTgt] = targetStr.split('-').map(Number)
    const dateNowUtc = Date.UTC(yNow, mNow - 1, dNow)
    const dateTgtUtc = Date.UTC(yTgt, mTgt - 1, dTgt)
    const diffDaysCivis = Math.round((dateNowUtc - dateTgtUtc) / (1000 * 60 * 60 * 24))

    if (diffDaysCivis === 1) return 'ontem'
    if (diffDaysCivis > 1) return `há ${diffDaysCivis} dias`

    return `há ${diffHour}h`
  } catch (_) {
    return fallback
  }
}
