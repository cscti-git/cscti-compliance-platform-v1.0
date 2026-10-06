import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileCheck2,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Upload,
  Eye,
  Hash,
  Sparkles,
  RefreshCw,
  Mail,
  Clock,
  ShieldCheck,
  Inbox,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  processarEvidenciaBackup,
  listBackupProcessamentos,
  fetchEvidenciasImap,
} from '@/services/backupService'
import { getIntegrations } from '@/services/csctiService'
import type {
  BackupEvidenciaItem,
  BackupRotinaItem,
  BackupProcessamentoItem,
  EvidenciaStatus,
  IntegrationItem,
  BackupImapFetchResponse,
} from '@/types/cscti'

interface BackupEvidenciasTabProps {
  evidencias: BackupEvidenciaItem[]
  rotinas: BackupRotinaItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupEvidenciasTab: React.FC<BackupEvidenciasTabProps> = ({
  evidencias,
  rotinas,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()

  // Modal Registrar Evidência (Upload/Colar HTML ou texto)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [remetente, setRemetente] = useState('newsletter@proitcs.com.br')
  const [assunto, setAssunto] = useState('[CRI][Success] Backup VMs GOLD (4 objects)')
  const [rotinaId, setRotinaId] = useState('')
  const [conteudo, setConteudo] = useState(
    `<div style="font-family: Arial, sans-serif;">
<div style="background-color: #00B050; color: white; padding: 15px;">
  <div style="float: left;">
    <h2 style="margin: 0;">Backup job: Backup VMs GOLD</h2>
    <p style="margin: 5px 0 0 0; font-size: 12px;">Created by SRV-BK-VEEAM\\veeam at 12/07/2022 14:45.</p>
  </div>
  <div style="float: right; text-align: right;">
    <h2 style="margin: 0;">Success</h2>
    <p style="margin: 5px 0 0 0; font-size: 12px;">4 of 4 VMs processed</p>
  </div>
  <div style="clear: both;"></div>
</div>

<div style="background-color: #f2f2f2; padding: 10px; font-size: 12px; margin-top: 5px;">
  terça-feira, 6 de outubro de 2026 08:05:06
</div>

<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;" border="1">
  <tr>
    <td style="font-weight: bold; width: 12%;">Success</td><td style="width: 8%;">4</td>
    <td style="font-weight: bold; width: 12%;">Start time</td><td style="width: 12%;">08:05:06</td>
    <td style="font-weight: bold; width: 12%;">Total size</td><td style="width: 12%;">1,5 TB</td>
    <td style="font-weight: bold; width: 12%;">Backup size</td><td style="width: 12%;">3,5 GB</td>
    <td></td>
  </tr>
  <tr>
    <td style="font-weight: bold;">Warning</td><td>0</td>
    <td style="font-weight: bold;">End time</td><td>08:16:22</td>
    <td style="font-weight: bold;">Data read</td><td>18,8 GB</td>
    <td style="font-weight: bold;">Dedupe</td><td>1,0x</td>
    <td></td>
  </tr>
  <tr>
    <td style="font-weight: bold;">Error</td><td>0</td>
    <td style="font-weight: bold;">Duration</td><td>0:11:15</td>
    <td style="font-weight: bold;">Transferred</td><td>3,1 GB</td>
    <td style="font-weight: bold;">Compression</td><td>4,0x</td>
    <td></td>
  </tr>
</table>

<div style="background-color: #e6e6e6; padding: 8px; font-weight: bold; font-size: 13px; margin-top: 15px;">
  Details
</div>

<table style="width: 100%; border-collapse: collapse; font-size: 12px;" border="1">
  <tr style="background-color: #f9f9f9; font-weight: bold;">
    <th>Name</th><th>Status</th><th>Start time</th><th>End time</th><th>Size</th><th>Read</th><th>Transferred</th><th>Duration</th><th>Details</th>
  </tr>
  <tr>
    <td>SRV-PRODUCAO-01</td><td style="color: green; font-weight: bold;">Success</td><td>08:10:05</td><td>08:11:47</td><td>620 GB</td><td>3,5 GB</td><td>275,1 MB</td><td>0:01:41</td><td></td>
  </tr>
  <tr>
    <td>SPCM-PROTESTO</td><td style="color: green; font-weight: bold;">Success</td><td>08:10:05</td><td>08:12:33</td><td>270 GB</td><td>2,4 GB</td><td>448,7 MB</td><td>0:02:27</td><td></td>
  </tr>
  <tr>
    <td>SRV-ATOS-DB</td><td style="color: green; font-weight: bold;">Success</td><td>08:12:26</td><td>08:16:14</td><td>420 GB</td><td>10,6 GB</td><td>1,8 GB</td><td>0:03:48</td><td></td>
  </tr>
  <tr>
    <td>SRV-DOCUMENTOS</td><td style="color: green; font-weight: bold;">Success</td><td>08:11:25</td><td>08:12:54</td><td>240 GB</td><td>2,4 GB</td><td>578,3 MB</td><td>0:01:28</td><td></td>
  </tr>
</table>

<div style="margin-top: 25px; font-size: 11px; color: #666;">
  Veeam Backup & Replication 12.3.1.1139
</div>
</div>`,
  )

  // Conector IMAP e Estado de Ingestão
  const [emailConnector, setEmailConnector] = useState<IntegrationItem | null>(null)
  const [fetchingImap, setFetchingImap] = useState(false)
  const [lastFetchResult, setLastFetchResult] = useState<BackupImapFetchResponse | null>(null)

  useEffect(() => {
    let isMounted = true
    if (orgId) {
      getIntegrations(orgId).then(({ email }) => {
        if (isMounted) {
          setEmailConnector(email)
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [orgId])

  const handleFetchImap = async () => {
    setFetchingImap(true)
    try {
      const res = await fetchEvidenciasImap(orgId)
      setLastFetchResult(res)

      if (res.success) {
        toast({
          title: 'Busca de e-mail concluída',
          description: `${res.mensagens_verificadas} mensagens verificadas • ${res.evidencias_criadas} nova(s) evidência(s) ingerida(s) • ${res.evidencias_duplicadas} já existente(s).`,
        })
        onReload()
        // Atualizar estado do conector
        const { email } = await getIntegrations(orgId)
        setEmailConnector(email)
      } else {
        toast({
          title: res.configured ? 'Aviso na busca IMAP' : 'Conector IMAP não configurado',
          description: res.message,
          variant: res.status === 'erro' ? 'destructive' : 'default',
        })
      }
    } catch (err: unknown) {
      toast({
        title: 'Erro na busca de evidências via e-mail',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setFetchingImap(false)
    }
  }

  // Modal Detalhes do Processamento / Evidência
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedEvidencia, setSelectedEvidencia] = useState<BackupEvidenciaItem | null>(null)
  const [processamentos, setProcessamentos] = useState<BackupProcessamentoItem[]>([])
  const [procLoading, setProcLoading] = useState(false)

  const handleOpenRegistrar = () => {
    setRemetente('newsletter@proitcs.com.br')
    setAssunto('[CRI][Success] Backup VMs GOLD (4 objects)')
    setRotinaId(rotinas.length > 0 ? rotinas[0].id : '')
    setModalOpen(true)
  }

  const handlePreencherExemploVeeam = () => {
    setRemetente('newsletter@proitcs.com.br')
    setAssunto('[CRI][Success] Backup VMs GOLD (4 objects)')
    setConteudo(
      `<div style="font-family: Arial, sans-serif;">
<div style="background-color: #00B050; color: white; padding: 15px;">
  <div style="float: left;">
    <h2 style="margin: 0;">Backup job: Backup VMs GOLD</h2>
    <p style="margin: 5px 0 0 0; font-size: 12px;">Created by SRV-BK-VEEAM\\veeam at 12/07/2022 14:45.</p>
  </div>
  <div style="float: right; text-align: right;">
    <h2 style="margin: 0;">Success</h2>
    <p style="margin: 5px 0 0 0; font-size: 12px;">4 of 4 VMs processed</p>
  </div>
  <div style="clear: both;"></div>
</div>

<div style="background-color: #f2f2f2; padding: 10px; font-size: 12px; margin-top: 5px;">
  terça-feira, 6 de outubro de 2026 08:05:06
</div>

<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;" border="1">
  <tr>
    <td style="font-weight: bold; width: 12%;">Success</td><td style="width: 8%;">4</td>
    <td style="font-weight: bold; width: 12%;">Start time</td><td style="width: 12%;">08:05:06</td>
    <td style="font-weight: bold; width: 12%;">Total size</td><td style="width: 12%;">1,5 TB</td>
    <td style="font-weight: bold; width: 12%;">Backup size</td><td style="width: 12%;">3,5 GB</td>
    <td></td>
  </tr>
  <tr>
    <td style="font-weight: bold;">Warning</td><td>0</td>
    <td style="font-weight: bold;">End time</td><td>08:16:22</td>
    <td style="font-weight: bold;">Data read</td><td>18,8 GB</td>
    <td style="font-weight: bold;">Dedupe</td><td>1,0x</td>
    <td></td>
  </tr>
  <tr>
    <td style="font-weight: bold;">Error</td><td>0</td>
    <td style="font-weight: bold;">Duration</td><td>0:11:15</td>
    <td style="font-weight: bold;">Transferred</td><td>3,1 GB</td>
    <td style="font-weight: bold;">Compression</td><td>4,0x</td>
    <td></td>
  </tr>
</table>

<div style="background-color: #e6e6e6; padding: 8px; font-weight: bold; font-size: 13px; margin-top: 15px;">
  Details
</div>

<table style="width: 100%; border-collapse: collapse; font-size: 12px;" border="1">
  <tr style="background-color: #f9f9f9; font-weight: bold;">
    <th>Name</th><th>Status</th><th>Start time</th><th>End time</th><th>Size</th><th>Read</th><th>Transferred</th><th>Duration</th><th>Details</th>
  </tr>
  <tr>
    <td>SRV-PRODUCAO-01</td><td style="color: green; font-weight: bold;">Success</td><td>08:10:05</td><td>08:11:47</td><td>620 GB</td><td>3,5 GB</td><td>275,1 MB</td><td>0:01:41</td><td></td>
  </tr>
  <tr>
    <td>SPCM-PROTESTO</td><td style="color: green; font-weight: bold;">Success</td><td>08:10:05</td><td>08:12:33</td><td>270 GB</td><td>2,4 GB</td><td>448,7 MB</td><td>0:02:27</td><td></td>
  </tr>
  <tr>
    <td>SRV-ATOS-DB</td><td style="color: green; font-weight: bold;">Success</td><td>08:12:26</td><td>08:16:14</td><td>420 GB</td><td>10,6 GB</td><td>1,8 GB</td><td>0:03:48</td><td></td>
  </tr>
  <tr>
    <td>SRV-DOCUMENTOS</td><td style="color: green; font-weight: bold;">Success</td><td>08:11:25</td><td>08:12:54</td><td>240 GB</td><td>2,4 GB</td><td>578,3 MB</td><td>0:01:28</td><td></td>
  </tr>
</table>

<div style="margin-top: 25px; font-size: 11px; color: #666;">
  Veeam Backup & Replication 12.3.1.1139
</div>
</div>`,
    )
  }

  const handleProcessarNovaEvidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conteudo.trim()) return
    setSubmitting(true)
    try {
      const res = await processarEvidenciaBackup({
        organizationId: orgId,
        conteudo: conteudo.trim(),
        remetente: remetente.trim(),
        assunto: assunto.trim(),
        rotinaId: rotinaId || undefined,
        tipo: 'upload_manual',
      })

      if (res.success) {
        toast({
          title: 'Evidência processada com sucesso',
          description: `Status detectado: ${res.status.toUpperCase()} • Execução #${res.execucao_id || ''} gerada.`,
        })
      } else {
        toast({
          title: 'Evidência não reconhecida',
          description: res.message,
          variant: 'destructive',
        })
      }
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao processar evidência',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Reprocessar evidência existente
  const handleReprocessar = async (item: BackupEvidenciaItem) => {
    if (!item.conteudo) return
    try {
      toast({
        title: 'Reprocessando evidência...',
        description: 'Enviando comprovante para os adaptadores ativos.',
      })
      await processarEvidenciaBackup({
        organizationId: orgId,
        conteudo: item.conteudo,
        remetente: item.remetente,
        assunto: item.assunto,
        rotinaId: item.rotina,
        tipo: item.tipo === 'webhook' ? 'upload_manual' : item.tipo,
      })
      toast({
        title: 'Reprocessamento concluído',
        description: 'Os dados foram atualizados com sucesso.',
      })
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao reprocessar',
        description: err instanceof Error ? err.message : 'Falha no adaptador.',
        variant: 'destructive',
      })
    }
  }

  const handleVerDetalhes = async (item: BackupEvidenciaItem) => {
    setSelectedEvidencia(item)
    setDetailModalOpen(true)
    setProcLoading(true)
    try {
      const procs = await listBackupProcessamentos(orgId)
      setProcessamentos(procs.filter((p) => p.evidencia === item.id))
    } catch (err) {
      console.error(err)
    } finally {
      setProcLoading(false)
    }
  }

  const getStatusBadge = (st: EvidenciaStatus) => {
    switch (st) {
      case 'processada':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Processada
          </Badge>
        )
      case 'pendente':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
            <RefreshCw className="w-3 h-3 mr-1" /> Pendente
          </Badge>
        )
      case 'erro':
        return (
          <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px] font-bold">
            <XCircle className="w-3 h-3 mr-1" /> Erro
          </Badge>
        )
      case 'nao_reconhecida':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
            <HelpCircle className="w-3 h-3 mr-1" /> Não Reconhecida
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Evidências e Comprovantes de Backup
          </h2>
          <p className="text-xs text-slate-500">
            Comprovantes com cálculo automático de HASH SHA-256 (garantia estrita de idempotência) e
            extração inteligente via adaptadores VEEAM_HTML e EMAIL_HTML_GENERICO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canOperate && (
            <Button
              onClick={handleFetchImap}
              disabled={fetchingImap}
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-900 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-950 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-700 ${fetchingImap ? 'animate-spin' : ''}`}
              />
              {fetchingImap ? 'Buscando na Caixa...' : 'Buscar evidências agora'}
            </Button>
          )}

          {canOperate && (
            <Button
              onClick={handleOpenRegistrar}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Registrar Evidência (Manual / HTML)
            </Button>
          )}
        </div>
      </div>

      {/* Card de Visibilidade do Estado do Conector de E-mail IMAP */}
      <Card className="border-slate-200 bg-gradient-to-r from-slate-50/80 to-white shadow-2xs">
        <CardContent className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-800 shrink-0 mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 text-xs">
                  Ingestão Automática via E-mail IMAP
                </span>
                {emailConnector && emailConnector.enabled ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo (Job a cada 15 min)
                  </Badge>
                ) : emailConnector ? (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Desabilitado
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-semibold">
                    <HelpCircle className="w-3 h-3 mr-1" /> Não Configurado
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {emailConnector?.email_user ? (
                  <>
                    Caixa:{' '}
                    <span className="font-mono text-slate-700">{emailConnector.email_user}</span> (
                    {emailConnector.email_host}:{emailConnector.email_port || 993} /{' '}
                    {emailConnector.email_folder || 'INBOX'})
                  </>
                ) : (
                  'Cadastre os parâmetros da caixa em Configurações > Integrações para busca periódica automática.'
                )}
              </p>
              {/* Resumo da última verificação */}
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Última verificação:{' '}
                  <strong className="text-slate-800">
                    {lastFetchResult?.last_check
                      ? new Date(lastFetchResult.last_check).toLocaleString('pt-BR')
                      : emailConnector?.last_sync
                        ? new Date(emailConnector.last_sync).toLocaleString('pt-BR')
                        : 'Nunca executada'}
                  </strong>
                </span>
                {(lastFetchResult?.message || emailConnector?.last_sync_message) && (
                  <span
                    className="text-slate-500 truncate max-w-md hidden sm:inline"
                    title={lastFetchResult?.message || emailConnector?.last_sync_message}
                  >
                    • {lastFetchResult?.message || emailConnector?.last_sync_message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {canOperate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFetchImap}
                disabled={fetchingImap}
                className="h-8 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2.5 font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${fetchingImap ? 'animate-spin' : ''}`} />
                {fetchingImap ? 'Verificando...' : 'Verificar Caixa'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Evidências */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assunto / Remetente</th>
                  <th className="py-2.5 px-3">Rotina Vinculada</th>
                  <th className="py-2.5 px-3">Data Recebida</th>
                  <th className="py-2.5 px-3">Hash SHA-256</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evidencias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      Nenhuma evidência registrada. Clique em &ldquo;Registrar Evidência&rdquo; para
                      inserir o primeiro comprovante.
                    </td>
                  </tr>
                ) : (
                  evidencias.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3">{getStatusBadge(item.status_processamento)}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block truncate max-w-sm">
                          {item.assunto || 'Sem assunto'}
                        </span>
                        <span className="text-[11px] text-slate-500">{item.remetente}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-700 font-medium">
                          {item.expand?.rotina?.nome || 'Geral / Automático'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.data_recebida
                          ? new Date(item.data_recebida).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                        <span title={item.hash_conteudo}>
                          {item.hash_conteudo.slice(0, 12)}...{item.hash_conteudo.slice(-6)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalhes(item)}
                            className="h-7 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-2"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
                          </Button>
                          {canOperate && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReprocessar(item)}
                              className="h-7 text-[11px] text-slate-700 hover:bg-slate-100 px-2"
                              title="Reprocessar"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" /> Processar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Registrar Nova Evidência */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleProcessarNovaEvidencia} className="flex-1 flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#0B2545]" />
                Registrar Comprovante de Backup
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cole o conteúdo em texto ou HTML enviado pelo software de cópia (Veeam, Bacula,
                scripts locais). O sistema calculará o hash SHA-256 e extrairá os dados de
                conformidade.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Remetente / Origem
                  </label>
                  <Input
                    required
                    value={remetente}
                    onChange={(e) => setRemetente(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rotina Alvo</label>
                  <Select value={rotinaId} onValueChange={setRotinaId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione a rotina..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Automático / Geral</SelectItem>
                      {rotinas.map((r) => {
                        const freq =
                          r.periodicidade === 'intervalo_minutos'
                            ? `A cada ${r.intervalo_minutos || 30} min`
                            : r.periodicidade
                        const tipo = r.tipo_execucao || 'incremental'
                        return (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nome} ({freq} · {tipo})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assunto da Mensagem / Notificação
                </label>
                <Input
                  required
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Conteúdo do Comprovante (Texto ou HTML) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreencherExemploVeeam}
                      className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline"
                    >
                      Carregar exemplo real Veeam 12.x
                    </button>
                    <span className="text-[10px] text-slate-400">
                      Adaptador: Auto (VEEAM_HTML / EMAIL_HTML)
                    </span>
                  </div>
                </div>
                <Textarea
                  required
                  rows={8}
                  placeholder="Cole aqui o corpo do e-mail de backup ou log de execução..."
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="text-xs font-mono resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs"
              >
                {submitting ? 'Processando Adaptador...' : 'Processar Evidência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Processamento */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#0B2545]" />
              Detalhes da Evidência e Extração
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dados da prova digital e resultado estruturado gerado pelo adaptador de processamento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 text-xs">
            {selectedEvidencia && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Assunto:
                    </span>
                    <strong className="text-slate-900 text-sm">{selectedEvidencia.assunto}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Remetente:
                      </span>
                      <span>{selectedEvidencia.remetente}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Recebido em:
                      </span>
                      <span>
                        {selectedEvidencia.data_recebida
                          ? new Date(selectedEvidencia.data_recebida).toLocaleString('pt-BR')
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Hash SHA-256 (Integridade / Idempotência):
                    </span>
                    <span className="font-mono text-[11px] text-blue-900 break-all select-all">
                      {selectedEvidencia.hash_conteudo}
                    </span>
                  </div>
                </div>

                {/* Resultado do Processamento */}
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Extração do Adaptador
                  </span>
                  {procLoading ? (
                    <p className="text-slate-400 italic">Carregando extração...</p>
                  ) : processamentos.length === 0 ? (
                    <p className="text-slate-500 italic p-3 border rounded bg-slate-50">
                      Nenhum processamento registrado para esta evidência.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {processamentos.map((proc) => {
                        const res = (proc.resultado ||
                          {}) as import('@/types/cscti').BackupProcessamentoResultado
                        const vms = res.vms || []

                        return (
                          <div
                            key={proc.id}
                            className="p-3 rounded-lg border border-slate-200 bg-white space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-900 block text-xs">
                                  {res.job_name || 'Job de Backup'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Adaptador:{' '}
                                  <strong className="text-slate-700">{proc.adaptador_usado}</strong>{' '}
                                  (v{proc.versao_adaptador || '1.0'})
                                  {res.veeam_version ? ` • ${res.veeam_version}` : ''}
                                </span>
                              </div>
                              <Badge
                                className={`text-[10px] font-bold ${
                                  res.status_detectado === 'sucesso'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : res.status_detectado === 'parcial'
                                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-red-100 text-red-800 border-red-200'
                                }`}
                              >
                                {res.status_detectado?.toUpperCase() || 'PARCIAL'}
                              </Badge>
                            </div>

                            {/* Resumo formatado de métricas (especialmente Veeam) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-100 text-[11px]">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                  Tamanho / Backup
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {res.tamanho_formatado || res.metricas?.backup_size || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                  Duração
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {res.duracao || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                  Objetos / VMs
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {res.contadores?.processadas || vms.length || 0}
                                  {res.contadores?.total_vms
                                    ? ` de ${res.contadores.total_vms}`
                                    : ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                  Lido / Transf.
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {res.metricas?.transferred || res.metricas?.data_read || '—'}
                                </span>
                              </div>
                            </div>

                            {/* Tabela de Detalhes por VM se for Veeam */}
                            {vms.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                                  Detalhamento de Objetos / VMs ({vms.length})
                                </span>
                                <div className="border border-slate-200 rounded overflow-hidden">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                        <th className="py-1.5 px-2">Nome VM</th>
                                        <th className="py-1.5 px-2">Status</th>
                                        <th className="py-1.5 px-2">Início/Fim</th>
                                        <th className="py-1.5 px-2">Tamanho</th>
                                        <th className="py-1.5 px-2">Transf.</th>
                                        <th className="py-1.5 px-2">Duração</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {vms.map((vm, vIdx) => (
                                        <tr key={vIdx} className="hover:bg-slate-50/70">
                                          <td className="py-1.5 px-2 font-mono font-bold text-slate-800">
                                            {vm.nome}
                                          </td>
                                          <td className="py-1.5 px-2">
                                            <span
                                              className={`font-bold ${
                                                vm.status.toLowerCase().includes('success')
                                                  ? 'text-emerald-700'
                                                  : vm.status.toLowerCase().includes('warning')
                                                    ? 'text-amber-700'
                                                    : 'text-red-700'
                                              }`}
                                            >
                                              {vm.status}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">
                                            {vm.start_time || '—'}
                                            {vm.end_time ? ` → ${vm.end_time}` : ''}
                                          </td>
                                          <td className="py-1.5 px-2 font-mono text-slate-700">
                                            {vm.size || '—'}
                                          </td>
                                          <td className="py-1.5 px-2 font-mono text-slate-600">
                                            {vm.transferred || '—'}
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">
                                            {vm.duration || '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* JSON Bruto Colapsado */}
                            <details className="text-[10px] text-slate-500">
                              <summary className="cursor-pointer hover:text-slate-800 font-medium">
                                Ver payload JSON completo do adaptador
                              </summary>
                              <pre className="mt-1 p-2.5 bg-slate-900 text-slate-100 rounded text-[10px] font-mono overflow-x-auto max-h-36">
                                {JSON.stringify(proc.resultado, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Conteúdo Bruto Sanitizado */}
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1">
                    Conteúdo Bruto do Comprovante
                  </span>
                  <pre className="p-3 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedEvidencia.conteudo}
                  </pre>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BackupEvidenciasTab
