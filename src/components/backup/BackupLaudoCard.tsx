import { useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Layers,
  FileText,
  PlusCircle,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { criarFontesPendentes } from '@/services/backupService'
import type { BackupLaudoTecnico, BackupVerificacaoItem } from '@/types/cscti'

import type { BackupConfrontoEscopo } from '@/types/cscti'

interface BackupLaudoCardProps {
  laudo?: BackupLaudoTecnico | null
  confrontoEscopo?: BackupConfrontoEscopo | null
  className?: string
  titulo?: string
  rotinaId?: string
  evidenciaId?: string
  onFontesCadastradas?: (novoLaudo?: BackupLaudoTecnico | null) => void
}

export function BackupLaudoCard({
  laudo: initialLaudo,
  confrontoEscopo,
  className = '',
  titulo,
  rotinaId: propRotinaId,
  evidenciaId: propEvidenciaId,
  onFontesCadastradas,
}: BackupLaudoCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [internalLaudo, setInternalLaudo] = useState<BackupLaudoTecnico | null>(null)
  const [loadingCriar, setLoadingCriar] = useState(false)

  const laudo = internalLaudo || initialLaudo
  const canManageFontes = user?.system_role === 'admin' || user?.system_role === 'suporte'
  const targetRotinaId = propRotinaId || laudo?.vinculos?.rotina_id || ''
  const targetEvidenciaId = propEvidenciaId || ''

  if (!laudo && !confrontoEscopo) {
    return (
      <div
        className={`p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500 ${className}`}
      >
        <FileText className="w-6 h-6 mx-auto mb-1 text-slate-400" />
        Nenhum laudo técnico estruturado disponível para este comprovante.
      </div>
    )
  }

  const verificacoes: BackupVerificacaoItem[] = Array.isArray(laudo.verificacoes)
    ? laudo.verificacoes
    : []

  // Regra de Negócio C: Veredito único derivado da pior verificação
  const temNaoConforme = verificacoes.some(
    (chk) => chk.status === 'nao_conforme' || chk.passou === false,
  )
  const temAtencao = verificacoes.some((chk) => chk.status === 'atencao')

  const resultadoEfetivo: 'conforme' | 'atencao' | 'nao_conforme' = temNaoConforme
    ? 'nao_conforme'
    : temAtencao
      ? 'atencao'
      : (laudo.resultado as 'conforme' | 'atencao' | 'nao_conforme') || 'conforme'

  const isConforme = resultadoEfetivo === 'conforme'
  const isAtencao = resultadoEfetivo === 'atencao'

  const vereditoBoxStyles = isConforme
    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
    : isAtencao
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-red-50 border-red-200 text-red-900'

  const vereditoBadgeStyles = isConforme
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : isAtencao
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-red-600 hover:bg-red-700 text-white'

  const fontesNaoCobertas = laudo.cobertura?.fontes_nao_cobertas || []

  return (
    <Card className={`border border-slate-200 shadow-sm ${className}`}>
      <CardHeader className="pb-3 pt-4 px-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B2545]" />
            {titulo || 'Laudo de Avaliação de Conformidade'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {laudo.gerado_em && (
              <span className="text-[11px] text-slate-500">
                Emitido em:{' '}
                <strong className="text-slate-700 font-mono">
                  {new Date(laudo.gerado_em).toLocaleString('pt-BR')}
                </strong>
              </span>
            )}
            <Badge
              className={`text-[10px] uppercase font-bold tracking-wider ${vereditoBadgeStyles}`}
            >
              {resultadoEfetivo === 'conforme'
                ? 'Conforme'
                : resultadoEfetivo === 'atencao'
                  ? 'Atenção'
                  : 'Não Conforme'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Veredito em destaque no topo */}
        <div className={`p-3.5 rounded-lg border flex items-start gap-3 ${vereditoBoxStyles}`}>
          <div className="mt-0.5 shrink-0">
            {isConforme ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : isAtencao ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="space-y-1 flex-1">
            <div className="font-semibold text-xs tracking-wide uppercase text-slate-700">
              Veredito Técnico do Sistema
            </div>
            <p className="text-xs sm:text-sm leading-relaxed font-medium">
              {laudo.veredito || 'Avaliação de conformidade concluída.'}
            </p>
          </div>
        </div>

        {/* Alerta / Badges suaves de itens/VMs não cadastrados na rotina */}
        {fontesNaoCobertas.length > 0 && (
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <Layers className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Itens detectados no comprovante sem fonte cadastrada na rotina:</span>
              </div>
              {canManageFontes && targetRotinaId && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingCriar}
                  onClick={async () => {
                    setLoadingCriar(true)
                    try {
                      const itensNomes = fontesNaoCobertas.map((f) => f.item).filter(Boolean)
                      const res = await criarFontesPendentes({
                        rotinaId: targetRotinaId,
                        itens: itensNomes,
                        evidenciaId: targetEvidenciaId || undefined,
                      })
                      toast({
                        title: 'Fontes cadastradas com sucesso!',
                        description:
                          res.message || `${itensNomes.length} fonte(s) vinculada(s) à rotina.`,
                      })
                      if (res.laudo_tecnico) {
                        setInternalLaudo(res.laudo_tecnico)
                      }
                      if (onFontesCadastradas) {
                        onFontesCadastradas(res.laudo_tecnico || null)
                      }
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar fontes.'
                      toast({
                        variant: 'destructive',
                        title: 'Erro ao cadastrar fontes',
                        description: msg,
                      })
                    } finally {
                      setLoadingCriar(false)
                    }
                  }}
                  className="h-7 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-semibold gap-1 shadow-2xs"
                >
                  {loadingCriar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5 text-amber-800" />
                  )}
                  Cadastrar fontes pendentes ({fontesNaoCobertas.length})
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {fontesNaoCobertas.map((f, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-amber-100/90 text-amber-900 border-amber-300 font-mono text-[10px] px-2 py-0.5"
                >
                  {f.item}
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-amber-800">
              {canManageFontes
                ? 'Clique no botão acima para criar automaticamente as fontes com os nomes exatos do comprovante e reavaliar o laudo para Conforme.'
                : 'Recomendação: solicite a um administrador ou suporte o cadastro das fontes acima para garantir rastreabilidade completa.'}
            </p>
          </div>
        )}

        {/* Lista vertical de verificações com ícones padronizados */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Verificações Automatizadas ({verificacoes.length})
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
            {verificacoes.map((item, idx) => {
              const statusItem = item.status || (item.passou ? 'conforme' : 'nao_conforme')
              const isItemConforme = statusItem === 'conforme'
              const isItemAtencao = statusItem === 'atencao'

              return (
                <div
                  key={idx}
                  className="p-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="mt-0.5 shrink-0">
                    {isItemConforme ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isItemAtencao ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{item.titulo}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                          isItemConforme
                            ? 'bg-emerald-100 text-emerald-800'
                            : isItemAtencao
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isItemConforme ? 'Conforme' : isItemAtencao ? 'Atenção' : 'Não Conforme'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">{item.detalhes}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ITEM 3: CONFRONTO EVIDÊNCIA × EXIGÊNCIAS DO ESCOPO */}
        {confrontoEscopo &&
          (confrontoEscopo.exigencias?.length > 0 ||
            confrontoEscopo.comprovado?.length > 0 ||
            confrontoEscopo.pendencias?.length > 0) && (
            <div className="pt-3 border-t border-slate-200 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0B2545]" />
                  <h4 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                    Confronto Evidência × Exigências do Escopo
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-500 font-mono">
                    {confrontoEscopo.escopo_nome
                      ? `Escopo: ${confrontoEscopo.escopo_nome}`
                      : 'Escopo do Inventário'}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700">
                    {confrontoEscopo.total_comprovadas || 0} comprovada(s) /{' '}
                    {confrontoEscopo.total_pendencias || 0} pendência(s)
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Seção A: Exigências do Escopo */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      Exigências do Escopo ({confrontoEscopo.exigencias?.length || 0} ativo(s))
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Cadastrado no Inventário
                    </span>
                  </div>

                  {confrontoEscopo.exigencias?.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">
                      Nenhum ativo vinculado a este escopo exige backup.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200/70 border border-slate-200 rounded bg-white overflow-hidden">
                      {confrontoEscopo.exigencias.map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50/70"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate">
                              {ex.ativo_nome}
                            </span>
                            {ex.ativo_tipo && (
                              <span className="text-[10px] text-slate-500 uppercase font-mono">
                                {ex.ativo_tipo.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight ${
                                ex.local
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title={ex.local ? 'Exige Backup Local' : 'Não exige Local'}
                            >
                              Local {ex.local ? '✓' : '—'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight ${
                                ex.nuvem
                                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title={ex.nuvem ? 'Exige Backup em Nuvem' : 'Não exige Nuvem'}
                            >
                              Nuvem {ex.nuvem ? '✓' : '—'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight ${
                                ex.replicacao
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title={
                                ex.replicacao ? 'Exige Replicação Externa' : 'Não exige Replicação'
                              }
                            >
                              Replicação {ex.replicacao ? '✓' : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seção B: Comprovado nesta evidência */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-emerald-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                      Comprovado nesta evidência ({confrontoEscopo.comprovado?.length || 0}{' '}
                      modalidade(s))
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold">
                      🟢 Homologado
                    </span>
                  </div>

                  {confrontoEscopo.comprovado?.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic p-2 bg-white rounded border border-slate-200">
                      Nenhuma modalidade de ativo do escopo foi comprovada por este comprovante
                      específico.
                    </p>
                  ) : (
                    <div className="divide-y divide-emerald-100 border border-emerald-200 rounded bg-white overflow-hidden">
                      {confrontoEscopo.comprovado.map((cp, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-emerald-50/40"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{cp.ativo_nome}</span>
                              <Badge className="bg-emerald-600 text-white text-[9px] uppercase font-bold py-0 h-4">
                                🟢 {cp.modalidade}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">
                              Item no comprovante:{' '}
                              <strong className="font-mono text-slate-700">
                                {cp.item_comprovante}
                              </strong>
                              {cp.plano_nome ? ` • Plano: ${cp.plano_nome}` : ''}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-mono shrink-0"
                          >
                            Comprovado
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seção C: Pendências */}
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-amber-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                      Pendências ({confrontoEscopo.pendencias?.length || 0})
                    </span>
                    <span className="text-[10px] text-amber-800 font-semibold">
                      🔴 Não comprovada nesta evidência
                    </span>
                  </div>

                  {/* Destaque explicando que a pendência pode ser atendida por outra rotina/evidência */}
                  <div className="p-2.5 rounded bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] leading-relaxed">
                    <strong>Nota sobre pendências:</strong> As pendências listadas abaixo
                    representam exigências do escopo que não foram comprovadas{' '}
                    <em>por este arquivo/comprovante específico</em>. Isso ocorre quando o ativo
                    exige outra modalidade (ex.: Nuvem) ou quando é protegido por outra rotina de
                    backup (ex.: Veeam vs. Acronis). A pendência{' '}
                    <strong>não é necessariamente um erro</strong> desta execução.
                  </div>

                  {confrontoEscopo.pendencias?.length === 0 ? (
                    <p className="text-[11px] text-emerald-800 font-semibold p-2 bg-emerald-50 rounded border border-emerald-200">
                      Nenhuma pendência! Todas as exigências do escopo foram integralmente
                      comprovadas por esta evidência.
                    </p>
                  ) : (
                    <div className="divide-y divide-amber-100 border border-amber-200 rounded bg-white overflow-hidden">
                      {confrontoEscopo.pendencias.map((pd, idx) => (
                        <div key={idx} className="p-2.5 space-y-1 text-xs hover:bg-amber-50/40">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{pd.ativo_nome}</span>
                              <Badge className="bg-red-100 text-red-800 border border-red-300 text-[9px] uppercase font-bold py-0 h-4">
                                🔴 {pd.modalidade_pendente}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-amber-800 font-medium">
                              {pd.atendivel_por_outra_rotina
                                ? 'Atendível por outra rotina'
                                : 'Ação requerida'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal">{pd.motivo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Rodapé contextual do laudo */}
        {(laudo.adaptador || laudo.vinculos || laudo.regra_identificacao) && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Regra</span>
              <span
                className="font-medium text-slate-700 truncate block"
                title={laudo.regra_identificacao?.nome}
              >
                {laudo.regra_identificacao?.nome || '—'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Adaptador</span>
              <span className="font-medium text-slate-700 font-mono">
                {laudo.adaptador?.codigo || '—'} (v{laudo.adaptador?.versao || '2.0.0'})
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">
                Rotina / Plano
              </span>
              <span
                className="font-medium text-slate-700 truncate block"
                title={`${laudo.vinculos?.rotina_nome || '—'} • ${laudo.vinculos?.plano_nome || '—'}`}
              >
                {laudo.vinculos?.rotina_nome || '—'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BackupLaudoCard
