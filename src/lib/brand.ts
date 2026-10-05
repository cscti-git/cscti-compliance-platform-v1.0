/**
 * Identidade da Marca CSCTI — Constantes, Paleta e Rótulos Institucionais
 * CSCTI: Compliance & Segurança da Informação para Serventias Notariais e Registrais
 */

export const CSCTI_BRAND = {
  name: 'CSCTI',
  legalName: 'CSCTI Tecnologia & Governança',
  productName: 'CSCTI — Compliance Platform V2',
  tagline: 'Governança, conformidade e confiança para serventias',
  shortTagline: 'Conformidade que comprova.',
  normativeReference: 'Provimento CNJ 243/2026 & 213/2026',
  normativeSubtext:
    'Padrão nacional de conformidade tecnológica e segurança para cartórios extrajudiciais',
  version: '2.4.0-cnj',
  supportEmail: 'suporte@cscti.com.br',
  defaultCredentialsHint: 'Acesso institucional autenticado',
} as const

export const CSCTI_FEATURES = [
  {
    id: 'access',
    title: 'Acesso blindado e rastreável',
    description:
      'Isolamento multi-tenant por serventia com trilha de auditoria contínua e imutável para correições.',
  },
  {
    id: 'roles',
    title: 'Controle de acesso por perfis',
    description:
      'Perfis segregados (Administrador, Suporte e Usuário de Consulta) estritamente alinhados ao Provimento CNJ.',
  },
  {
    id: 'compliance',
    title: 'Governança de classes C1, C2 e C3',
    description:
      'Enquadramento automático por receita semestral, controle de prazos normativos e geração de dossiê comprobatório.',
  },
] as const
