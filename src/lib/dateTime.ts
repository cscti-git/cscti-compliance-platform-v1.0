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
