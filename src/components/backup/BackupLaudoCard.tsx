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

interface BackupLaudoCardProps {
  laudo?: BackupLaudoTecnico | null
  className?: string
  titulo?: string
  rotinaId?: string
  evidenciaId?: string
  onFontesCadastradas?: (novoLaudo?: BackupLaudoTecnico | null) => void
}

export function BackupLaudoCard({
  laudo: initialLaudo,
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

  if (!laudo) {
    return (
      <div
        className={`p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500 ${className}`}
      >
        <FileText className="w-6 h-6 mx-auto mb-1 text-slate-400" />
        Nenhum laudo técnico estruturado disponível para este comprovante.
      </div>
    )
  }

  const resultado = laudo.resultado || 'conforme'
  const isConforme = resultado === 'conforme'
  const isAtencao = resultado === 'atencao'

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

  const verificacoes: BackupVerificacaoItem[] = Array.isArray(laudo.verificacoes)
    ? laudo.verificacoes
    : []

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
              {resultado === 'conforme'
                ? 'Conforme'
                : resultado === 'atencao'
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
