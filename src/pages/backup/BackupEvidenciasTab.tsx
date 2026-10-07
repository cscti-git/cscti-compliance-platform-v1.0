import React, { useState, useEffect, useRef } from 'react'
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
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  processarEvidenciaBackup,
  listBackupProcessamentos,
  listBackupMonitoramentos,
  deleteBackupMonitoramento,
  fetchEvidenciasImap,
  getBackupAvaliacaoByEvidencia,
} from '@/services/backupService'
import { getIntegrations } from '@/services/csctiService'
import { BackupLaudoCard } from '@/components/backup/BackupLaudoCard'
import type {
  BackupEvidenciaItem,
  BackupRotinaItem,
  BackupProcessamentoItem,
  BackupMonitoramentoExternoItem,
  BackupAvaliacaoItem,
  EvidenciaStatus,
  IntegrationItem,
  BackupImapFetchResponse,
} from '@/types/cscti'
import {
  FileText,
  Activity,
  UserCheck,
  ShieldAlert,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Fingerprint,
  Sliders,
  AlertOctagon,
  Trash2,
  FileUp,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { extrairConteudoArquivo } from '@/lib/comprovanteImport'
import { Checkbox } from '@/components/ui/checkbox'
import { excluirBackupEvidencia, limparTodasEvidencias } from '@/services/backupService'

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

  // Sub-abas dentro de Evidências: "evidencias" | "monitoramento_externo"
  const [activeSubTab, setActiveSubTab] = useState<'evidencias' | 'monitoramento_externo'>(
    'evidencias',
  )

  // Monitoramentos Externos do NOC
  const [monitoramentos, setMonitoramentos] = useState<BackupMonitoramentoExternoItem[]>([])
  const [selectedMonit, setSelectedMonit] = useState<BackupMonitoramentoExternoItem | null>(null)
  const [monitModalOpen, setMonitModalOpen] = useState(false)

  // Tipo de comprovante no modal de registro
  const [formTipo, setFormTipo] = useState<'veeam' | 'acronis_pdf' | 'noc_diario' | 'generico'>(
    'veeam',
  )
  const [nomeArquivoAnexo, setNomeArquivoAnexo] = useState('')
  const [pdfTextoSimulado, setPdfTextoSimulado] = useState('')

  // Estado para Importação de Arquivo (HTML, PDF, TXT, EML, XLSX)
  const [importingFile, setImportingFile] = useState(false)
  const [importedFileInfo, setImportedFileInfo] = useState<{
    nome: string
    tamanhoKb: number
    tipo: string
    vmsCount?: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Conector IMAP e Estado de Ingestão (comportamento fail-closed verificado)
  const [emailConnector, setEmailConnector] = useState<IntegrationItem | null>(null)
  const [fetchingImap, setFetchingImap] = useState(false)
  const [lastFetchResult, setLastFetchResult] = useState<BackupImapFetchResponse | null>(null)

  // Estado para Exclusão Controlada de Evidência Individual
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [evidenciaParaExcluir, setEvidenciaParaExcluir] = useState<BackupEvidenciaItem | null>(null)
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState(false)
  const [perguntaSeguranca, setPerguntaSeguranca] = useState(false)
  const [excluindoEvidencia, setExcluindoEvidencia] = useState(false)

  // Estado para Limpeza Total de Evidências (Começar do Zero)
  const [limparTodasModalOpen, setLimparTodasModalOpen] = useState(false)
  const [fraseLimpeza, setFraseLimpeza] = useState('')
  const [motivoLimpeza, setMotivoLimpeza] = useState('')
  const [confirmacaoCheckboxLimpeza, setConfirmacaoCheckboxLimpeza] = useState(false)
  const [limpandoTodas, setLimpandoTodas] = useState(false)

  const reloadMonitoramentos = () => {
    if (orgId) {
      listBackupMonitoramentos(orgId)
        .then((data) => setMonitoramentos(data))
        .catch((err) => console.error(err))
    }
  }

  useEffect(() => {
    let isMounted = true
    if (orgId) {
      getIntegrations(orgId).then(({ email }) => {
        if (isMounted) {
          setEmailConnector(email)
        }
      })
      listBackupMonitoramentos(orgId).then((data) => {
        if (isMounted) {
          setMonitoramentos(data)
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

      toast({
        title: 'Ingestão Automática via Agente Local',
        description:
          'A leitura periódica da caixa postal IMAP é executada pelo agente local instalado na VM do cliente. Para processar comprovantes nesta versão hosted, utilize "Registrar Evidência / Anexo PDF".',
      })
      // Atualizar estado do conector
      const { email } = await getIntegrations(orgId)
      setEmailConnector(email)
    } catch (err: unknown) {
      toast({
        title: 'Conector de E-mail IMAP',
        description:
          'A leitura da caixa postal será realizada pelo agente local na VM do cliente. Utilize "Registrar Evidência / Anexo PDF" para entrada imediata.',
      })
    } finally {
      setFetchingImap(false)
    }
  }

  // Painel explicativo colapsável: "Como o sistema valida um comprovante"
  const [guiaValidacaoOpen, setGuiaValidacaoOpen] = useState(true)

  // Modal Detalhes do Processamento / Evidência + Laudo
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedEvidencia, setSelectedEvidencia] = useState<BackupEvidenciaItem | null>(null)
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<BackupAvaliacaoItem | null>(null)
  const [processamentos, setProcessamentos] = useState<BackupProcessamentoItem[]>([])
  const [procLoading, setProcLoading] = useState(false)

  const handleOpenRegistrar = () => {
    setRemetente('newsletter@proitcs.com.br')
    setAssunto('[CRI][Success] Backup VMs GOLD (4 objects)')
    setRotinaId(rotinas.length > 0 ? rotinas[0].id : '')
    setFormTipo('veeam')
    setNomeArquivoAnexo('')
    setPdfTextoSimulado('')
    setImportedFileInfo(null)
    setModalOpen(true)
  }

  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]

    setImportingFile(true)
    try {
      const res = await extrairConteudoArquivo(file)

      // Preencher campos
      setConteudo(res.conteudo)
      setNomeArquivoAnexo(res.nomeArquivo)
      if (res.assunto) {
        setAssunto(res.assunto)
      }
      if (res.remetente) {
        setRemetente(res.remetente)
      }

      // Se for PDF
      if (res.tipoDetectado === 'pdf') {
        setFormTipo('acronis_pdf')
        setPdfTextoSimulado(res.conteudo)
      } else if (res.tipoDetectado === 'html') {
        setFormTipo('veeam')
      } else {
        setFormTipo('generico')
      }

      setImportedFileInfo({
        nome: res.nomeArquivo,
        tamanhoKb: Math.round(res.tamanhoBytes / 1024),
        tipo: res.tipoDetectado.toUpperCase(),
        vmsCount: res.vmsDetectadas?.length,
      })

      toast({
        title: 'Arquivo importado com sucesso',
        description: `Conteúdo extraído de "${res.nomeArquivo}". Verifique os dados abaixo antes de processar.`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Falha ao importar arquivo',
        description:
          err instanceof Error
            ? err.message
            : 'Formato ou tamanho inválido. Utilize HTML, PDF, TXT, EML ou XLSX até 10 MB.',
        variant: 'destructive',
      })
    } finally {
      setImportingFile(false)
      // Resetar input para permitir selecionar o mesmo arquivo novamente se desejar
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  const handleSelecionarModelo = (tipo: 'veeam' | 'acronis_pdf' | 'noc_diario' | 'generico') => {
    setFormTipo(tipo)
    if (tipo === 'veeam') {
      setRemetente('newsletter@proitcs.com.br')
      setAssunto('[CRI][Success] Backup VMs GOLD (4 objects)')
      setNomeArquivoAnexo('')
      setPdfTextoSimulado('')
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
    } else if (tipo === 'acronis_pdf') {
      setRemetente('noreply-abc@cloud.acronis.com')
      setAssunto('RELATÓRIO DIÁRIO EM 6 de out de 2026 às 05:02')
      setNomeArquivoAnexo('Atividades diárias - SocNoc.2026-10-06-08-02UTC.pdf')
      setConteudo(
        `<div style="font-family: Arial, sans-serif;">
  <p><strong>Nome do relatório:</strong> Atividades diárias - SocNoc</p>
  <p><strong>Gerado em:</strong> 6 de out de 2026 às 05:02</p>
  <p><strong>Intervalo de tempo:</strong> 05/10/2026 - 06/10/2026</p>
  <p><strong>Formato do arquivo:</strong> PDF</p>
  <p>1 anexo: Atividades diárias - SocNoc.2026-10-06-08-02UTC.pdf (44 KB)</p>
</div>`,
      )
      setPdfTextoSimulado(
        `# Atividades diárias - SocNoc
terça-feira, 6 de outubro de 2026 às 05:02
Intervalo de tempo: 05/10/2026 - 06/10/2026

Lista de atividades (1 dia):

| Resultado | Nome da atividade | Nome do plano | Hora de início | Hora de término | Duração | Tipo da atividade | Iniciado por | Bytes salvos | Bytes processados | Fonte de dados | Local de destino |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| OK | Plano de proteção 'Backup_SRV-FILESERVER' | Backup_SRV-FILESERVER | 19:00 | 19:00 | poucos segundos | Planos de backup | Agendado | 0 | 0 | SRV-FILESERVER | Nuvem |
| OK | Plano de proteção 'Backup_SRV-FILESERVER' | Backup_SRV-FILESERVER | 19:00 | 19:05 | 6 minutos | Planos de backup | Agendado | 1.15 GB | 2.21 GB | SRV-FILESERVER | Nuvem |
| OK | Plano de proteção 'BK-SPCM-TDePJ' | BK-SPCM-TDePJ | 19:30 | 19:36 | 6 minutos | Planos de backup | Agendado | 644.60 MB | 32.36 GB | SPCM-TDePJ | Nuvem |
| OK | Plano de proteção 'BK-SPCM-ORION' | BK-SPCM-ORION | 19:45 | 19:50 | 6 minutos | Planos de backup | Agendado | 1.31 GB | 4.24 GB | Máquina inteira | Nuvem |
| OK | Plano de proteção 'BK-SPCM-PROTESTO' | BK-SPCM-PROTESTO | 20:00 | 20:04 | 5 minutos | Planos de backup | Agendado | 429.48 MB | 1.43 GB | Máquina inteira | Nuvem |`,
      )
    } else if (tipo === 'noc_diario') {
      setRemetente('noc@cloudsolutions.com.br')
      setAssunto(
        'PRO CLOUD SOLUTIONS | NOC – ANALISE PREVENTIVA DIARIA DE BACKUP 05/10/2026 | Cartório',
      )
      setNomeArquivoAnexo('')
      setPdfTextoSimulado('')
      setConteudo(
        `<div style="font-family: Arial, sans-serif;">
<p>Boa Tarde</p>
<p>Este e um e-mail de report diário de acessos realizados em seu ambiente para analise nos itens abaixo de modo preventivo:</p>
<ul>
  <li>Backup;</li>
</ul>
<p><strong>Informações do Ambiente:</strong></p>
<table border="1" style="border-collapse: collapse; width: 100%;">
  <tr style="background-color: #f2f2f2;">
    <th>Cliente</th>
    <th>Status</th>
    <th>Ações a realizadas pelo NOC para correção</th>
  </tr>
  <tr>
    <td>Cartório</td>
    <td>OK</td>
    <td></td>
  </tr>
</table>
<p><strong>Evidencias:</strong></p>
<p>Cartório Sertãozinho: Backup VMs GOLD / Hyper-V Replication</p>
<p>[Comprovante contém imagem colada com print do grid Veeam - imagem não parseável]</p>
</div>`,
      )
    }
  }

  const handleProcessarNovaEvidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conteudo.trim() && !pdfTextoSimulado.trim()) return
    setSubmitting(true)
    try {
      const res = await processarEvidenciaBackup({
        organizationId: orgId,
        conteudo: conteudo.trim(),
        remetente: remetente.trim(),
        assunto: assunto.trim(),
        rotinaId: rotinaId || undefined,
        tipo: 'upload_manual',
        nome_arquivo: nomeArquivoAnexo || undefined,
        pdf_texto: pdfTextoSimulado || undefined,
        pdf_nome: nomeArquivoAnexo || undefined,
      })

      if (res.success) {
        toast({
          title: 'Comprovante processado com sucesso',
          description: `Adaptador: ${res.adaptador || 'Automático'} • Status: ${res.status?.toUpperCase()} • Veredito: ${res.conformidade ? res.conformidade.toUpperCase() : 'CONFORME'}.`,
        })
        setModalOpen(false)
        onReload()
        reloadMonitoramentos()
      } else {
        toast({
          title: 'Erro ao processar comprovante',
          description: res.message || 'Falha ao processar evidência de backup.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      toast({
        title: 'Erro ao processar comprovante',
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
    setSelectedAvaliacao(null)
    setDetailModalOpen(true)
    setProcLoading(true)
    try {
      const [procs, aval] = await Promise.all([
        listBackupProcessamentos(orgId),
        getBackupAvaliacaoByEvidencia(item.id, orgId),
      ])
      setProcessamentos(procs.filter((p) => p.evidencia === item.id))
      setSelectedAvaliacao(aval)
    } catch (err) {
      console.error(err)
    } finally {
      setProcLoading(false)
    }
  }

  const handleExcluirMonitoramento = async (mon: BackupMonitoramentoExternoItem) => {
    if (!window.confirm(`Deseja remover o registro de monitoramento de "${mon.origem_remetente}"?`))
      return
    try {
      await deleteBackupMonitoramento(mon.id, orgId)
      toast({
        title: 'Registro removido',
        description: 'Monitoramento externo excluído com sucesso.',
      })
      reloadMonitoramentos()
    } catch (err) {
      toast({
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : 'Falha na exclusão.',
        variant: 'destructive',
      })
    }
  }

  // Abertura do modal de exclusão individual
  const handleAbrirExclusaoIndividual = (evidencia: BackupEvidenciaItem) => {
    setEvidenciaParaExcluir(evidencia)
    setMotivoExclusao('')
    setConfirmacaoExclusao(false)
    setPerguntaSeguranca(false)
    setDeleteModalOpen(true)
  }

  // Execução da exclusão individual via endpoint com auditoria
  const handleConfirmarExclusaoIndividual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evidenciaParaExcluir) return

    if (!motivoExclusao || motivoExclusao.trim().length < 10) {
      toast({
        title: 'Observação obrigatória',
        description:
          'Informe uma justificativa de pelo menos 10 caracteres para fins de auditoria.',
        variant: 'destructive',
      })
      return
    }

    if (!confirmacaoExclusao || !perguntaSeguranca) {
      toast({
        title: 'Confirmações pendentes',
        description: 'É necessário confirmar os dois termos de segurança antes de prosseguir.',
        variant: 'destructive',
      })
      return
    }

    setExcluindoEvidencia(true)
    try {
      const res = await excluirBackupEvidencia({
        evidenciaId: evidenciaParaExcluir.id,
        motivo: motivoExclusao.trim(),
        confirmacao: true,
      })

      toast({
        title: 'Evidência excluída com sucesso',
        description: `${res.message} Registrado na auditoria permanente. Removidas ${res.removidos.execucoes} execução(ões) e ${res.removidos.avaliacoes} avaliação(ões) vinculadas.`,
      })

      setDeleteModalOpen(false)
      setEvidenciaParaExcluir(null)
      // Se estava com o modal de detalhes aberto para essa evidência, fechar
      if (selectedEvidencia?.id === evidenciaParaExcluir.id) {
        setDetailModalOpen(false)
        setSelectedEvidencia(null)
      }
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Falha ao excluir evidência',
        description: err instanceof Error ? err.message : 'Erro na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setExcluindoEvidencia(false)
    }
  }

  // Abertura do modal de limpeza total (começar do zero)
  const handleAbrirLimparTodas = () => {
    setFraseLimpeza('')
    setMotivoLimpeza('')
    setConfirmacaoCheckboxLimpeza(false)
    setLimparTodasModalOpen(true)
  }

  // Execução da limpeza total via endpoint com auditoria
  const handleConfirmarLimparTodas = async (e: React.FormEvent) => {
    e.preventDefault()

    if (fraseLimpeza.trim() !== 'LIMPAR EVIDENCIAS') {
      toast({
        title: 'Frase de segurança incorreta',
        description: 'Digite exatamente "LIMPAR EVIDENCIAS" em letras maiúsculas para confirmar.',
        variant: 'destructive',
      })
      return
    }

    if (!motivoLimpeza || motivoLimpeza.trim().length < 10) {
      toast({
        title: 'Justificativa obrigatória',
        description:
          'Informe a justificativa da limpeza (mínimo de 10 caracteres) para a trilha de auditoria.',
        variant: 'destructive',
      })
      return
    }

    if (!confirmacaoCheckboxLimpeza) {
      toast({
        title: 'Confirmação necessária',
        description: 'Marque a caixa de ciência da ação permanente.',
        variant: 'destructive',
      })
      return
    }

    setLimpandoTodas(true)
    try {
      const res = await limparTodasEvidencias({
        organizationId: orgId,
        motivo: motivoLimpeza.trim(),
        confirmacaoFrase: fraseLimpeza.trim(),
        confirmacaoCheckbox: true,
      })

      toast({
        title: 'Histórico reiniciado com sucesso',
        description: `${res.removidos.evidencias} evidência(s), ${res.removidos.execucoes} execução(ões) e ${res.removidos.avaliacoes} avaliação(ões) foram removidas. Trilha gravada na auditoria.`,
      })

      setLimparTodasModalOpen(false)
      setDetailModalOpen(false)
      setSelectedEvidencia(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Falha ao reiniciar histórico',
        description: err instanceof Error ? err.message : 'Erro ao processar limpeza no servidor.',
        variant: 'destructive',
      })
    } finally {
      setLimpandoTodas(false)
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
      {/* Painel Colapsável: Como o sistema valida um comprovante */}
      <Card className="border border-slate-200 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 shadow-2xs overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setGuiaValidacaoOpen(!guiaValidacaoOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setGuiaValidacaoOpen(!guiaValidacaoOpen)
            }
          }}
          className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-slate-100/50 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#0B2545] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                Como o sistema valida um comprovante
                <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">
                  • 7 etapas automáticas de ingestão, integridade e emissão de laudo técnico
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <span className="text-[11px] hidden md:inline">
              {guiaValidacaoOpen ? 'Recolher guia' : 'Expandir guia'}
            </span>
            {guiaValidacaoOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </div>
        </div>

        {guiaValidacaoOpen && (
          <CardContent className="pt-0 pb-3 px-3.5 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 pt-2.5 text-xs">
              {/* Etapa 1 */}
              <div className="p-2.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    1
                  </span>
                  <Inbox className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="truncate">Chegada</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  E-mail automático a cada 15 min via IMAP ou colado manualmente na interface.
                </p>
              </div>

              {/* Etapa 2 */}
              <div className="p-2.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    2
                  </span>
                  <Sliders className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                  <span className="truncate">Identificação</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Casamento pelas regras ativas (remetente, assunto e padrões declarados).
                </p>
              </div>

              {/* Etapa 3 */}
              <div className="p-2.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    3
                  </span>
                  <Cpu className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span className="truncate">Extração</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Adaptador (VEEAM, ACRONIS ou HTML): lê status, horários, VMs e tamanho.
                </p>
              </div>

              {/* Etapa 4 */}
              <div className="p-2.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    4
                  </span>
                  <Fingerprint className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span className="truncate">Integridade</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Cálculo de HASH SHA-256 com garantia estrita de idempotência (sem duplicidade).
                </p>
              </div>

              {/* Etapa 5 */}
              <div className="p-2.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    5
                  </span>
                  <Activity className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">Execução</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Registro da execução histórica com vínculo direto à rotina cadastrada.
                </p>
              </div>

              {/* Etapa 6 */}
              <div className="p-2.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    6
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0B2545] shrink-0" />
                  <span className="truncate">Laudo Técnico</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Avaliação contra o plano (periodicidade, fontes, destino, RPO) gerando o laudo.
                </p>
              </div>

              {/* Etapa 7 */}
              <div className="p-2.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                    7
                  </span>
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">Ocorrência</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Abertura imediata de ocorrência técnica automática em caso de falha ou lapso.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

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

        <div className="flex items-center gap-2 flex-wrap">
          {canOperate && evidencias.length > 0 && (
            <Button
              onClick={handleAbrirLimparTodas}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 bg-red-50/50 hover:bg-red-100 hover:text-red-900 text-xs font-semibold gap-1.5 shadow-2xs"
              title="Exclusão controlada de todas as evidências para reiniciar o monitoramento do zero"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              Limpar todas as evidências
            </Button>
          )}

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
              {fetchingImap ? 'Consultando Conector...' : 'Buscar evidências agora'}
            </Button>
          )}

          {canOperate && (
            <Button
              onClick={handleOpenRegistrar}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Registrar Evidência / Anexo PDF
            </Button>
          )}
        </div>
      </div>

      {/* Sub-abas de Navegação: Execuções / Evidências vs Monitoramento Externo NOC */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('evidencias')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeSubTab === 'evidencias'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Evidências de Jobs ({evidencias.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('monitoramento_externo')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            activeSubTab === 'monitoramento_externo'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Monitoramento Externo (NOC) ({monitoramentos.length})
        </button>
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
                  Conector de E-mail IMAP (Agente Local VM Ubuntu)
                </span>
                {emailConnector && emailConnector.enabled ? (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">
                    <Info className="w-3 h-3 mr-1" /> Agente Local Pendente
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
                    Servidor:{' '}
                    <span className="font-mono text-slate-700">
                      {emailConnector.email_host}:{emailConnector.email_port || 993} /{' '}
                      {emailConnector.email_folder || 'INBOX'}
                    </span>{' '}
                    &bull; Conta mascarada:{' '}
                    <span className="font-mono text-slate-700">
                      {(() => {
                        const u = emailConnector.email_user || ''
                        const at = u.indexOf('@')
                        if (at > 2) {
                          return `${u[0]}${'•'.repeat(Math.max(3, at - 2))}${u[at - 1]}${u.slice(at)}`
                        }
                        return u.length > 2 ? `${u[0]}•••${u[u.length - 1]}` : '••••••••'
                      })()}
                    </span>
                  </>
                ) : (
                  'Cadastre os parâmetros da caixa em Configurações > Integrações para leitura pelo agente local.'
                )}
              </p>
              <div className="p-2 rounded bg-slate-100/80 border border-slate-200/80 text-[11px] text-slate-700 mt-1">
                <strong>Ingestão em produção:</strong> A leitura automatizada da caixa postal será
                executada pelo agente local instalado na VM Ubuntu 24.04 do cliente. Nesta versão
                hosted, utilize o botão{' '}
                <strong>&ldquo;Registrar Evidência / Anexo PDF&rdquo;</strong> para ingestão real
                imediata.
              </div>
              {/* Resumo da última verificação */}
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Status do conector:{' '}
                  <strong className="text-slate-800">
                    {lastFetchResult?.last_check
                      ? new Date(lastFetchResult.last_check).toLocaleString('pt-BR')
                      : emailConnector?.last_sync
                        ? new Date(emailConnector.last_sync).toLocaleString('pt-BR')
                        : 'Aguardando agente local'}
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
                title="Informações sobre a ingestão de e-mail"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                {fetchingImap ? 'Consultando...' : 'Status do Conector'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {activeSubTab === 'evidencias' ? (
        /* Lista de Evidências */
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Origem / Formato</th>
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
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        Nenhuma evidência registrada. Clique em &ldquo;Registrar Evidência&rdquo;
                        para inserir o primeiro comprovante.
                      </td>
                    </tr>
                  ) : (
                    evidencias.map((item) => {
                      const isAcronis =
                        item.remetente?.includes('acronis') ||
                        item.assunto?.toLowerCase().includes('relatório diário') ||
                        item.conteudo?.includes('SocNoc')

                      const isNoc =
                        item.assunto?.includes('ANALISE PREVENTIVA') ||
                        item.conteudo?.includes('Informações do Ambiente')

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3">
                            {getStatusBadge(item.status_processamento)}
                          </td>
                          <td className="py-2.5 px-3">
                            {isAcronis ? (
                              <Badge className="bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-bold">
                                <Paperclip className="w-3 h-3 mr-1 text-sky-600" /> Acronis (PDF)
                              </Badge>
                            ) : isNoc ? (
                              <Badge className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-bold">
                                <UserCheck className="w-3 h-3 mr-1 text-purple-600" /> NOC Diário
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                <FileText className="w-3 h-3 mr-1 text-emerald-600" /> Veeam (HTML)
                              </Badge>
                            )}
                          </td>
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
                                title="Ver detalhes e extração"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> Ver Extração
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
                              {canOperate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAbrirExclusaoIndividual(item)}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Excluir evidência com auditoria"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Sub-aba: Monitoramento Externo NOC */
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-700" />
                  Relatórios de Avaliação do NOC (Monitoramento Externo)
                </CardTitle>
                <CardDescription className="text-xs">
                  E-mails diários enviados por colaboradores da empresa terceirizada com avaliação
                  humana da integridade dos backups.
                </CardDescription>
              </div>
              <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-xs">
                {monitoramentos.length} registro(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Origem / Remetente</th>
                    <th className="py-2.5 px-3">Status do Ambiente</th>
                    <th className="py-2.5 px-3">Clientes Avaliados</th>
                    <th className="py-2.5 px-3">Ações do NOC</th>
                    <th className="py-2.5 px-3">Comprovante</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monitoramentos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        Nenhum relatório de monitoramento externo do NOC registrado ainda.
                      </td>
                    </tr>
                  ) : (
                    monitoramentos.map((mon) => (
                      <tr key={mon.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {mon.data_monitoramento
                            ? new Date(mon.data_monitoramento).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block truncate max-w-xs">
                            {mon.assunto || 'Análise Preventiva Diária'}
                          </span>
                          <span className="text-[11px] text-slate-500">{mon.origem_remetente}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {mon.status_geral === 'ok' ? (
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> OK / Conforme
                            </Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Contém Falhas
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            {mon.clientes_status?.map((c, cIdx) => (
                              <div key={cIdx} className="text-[11px] flex items-center gap-1.5">
                                <strong className="text-slate-800">{c.cliente}:</strong>
                                <span
                                  className={`px-1 rounded text-[10px] font-bold ${
                                    c.status.toUpperCase() === 'OK'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {mon.acoes_realizadas || (
                            <span className="text-slate-400 italic">Nenhuma ação necessária</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {mon.comprovante_tem_imagem && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-slate-600 border-slate-300"
                            >
                              Contém print de jobs
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMonit(mon)
                                setMonitModalOpen(true)
                              }}
                              className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50 px-2 font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver Detalhes
                            </Button>
                            {canOperate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExcluirMonitoramento(mon)}
                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                title="Excluir"
                              >
                                <XCircle className="w-3.5 h-3.5" />
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
      )}

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
              {/* Painel de Importação Direta de Arquivo (Solução de e-mail intacto) */}
              <div className="p-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <FileUp className="w-4 h-4 text-blue-600" />
                      Importar comprovante por arquivo (HTML, PDF, TXT, EML, XLSX)
                    </span>
                    <p className="text-[11px] text-blue-800 mt-0.5">
                      Salve o e-mail em <strong>.html</strong> no Gmail/Outlook e importe aqui. A
                      tabela completa de VMs e status é preservada integralmente.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".html,.htm,.pdf,.txt,.log,.csv,.eml,.msg,.xlsx,.xls"
                      onChange={handleArquivoSelecionado}
                      className="hidden"
                      id="upload-comprovante-input"
                      disabled={importingFile || submitting}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importingFile || submitting}
                      className="bg-blue-700 hover:bg-blue-800 text-white text-xs shadow-sm font-semibold h-8"
                    >
                      {importingFile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Extraindo dados...
                        </>
                      ) : (
                        <>
                          <FileUp className="w-3.5 h-3.5 mr-1.5" />
                          Importar Arquivo
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Feedback discreto após extração bem-sucedida */}
                {importedFileInfo && (
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Arquivo importado:{' '}
                        <strong className="text-emerald-950 font-mono">
                          {importedFileInfo.nome}
                        </strong>{' '}
                        ({importedFileInfo.tamanhoKb} KB · {importedFileInfo.tipo})
                        {importedFileInfo.vmsCount !== undefined &&
                          importedFileInfo.vmsCount > 0 && (
                            <span className="ml-1 text-emerald-700">
                              — <strong>{importedFileInfo.vmsCount}</strong> VM(s) na tabela
                              detectada(s).
                            </span>
                          )}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium ml-2">
                      Verifique o conteúdo abaixo antes de processar
                    </span>
                  </div>
                )}
              </div>

              {/* Seleção rápida de Formato Real do Cliente */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Ou selecione um modelo de demonstração rápida:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelecionarModelo('veeam')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                      formTipo === 'veeam'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    1. Veeam (HTML)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelecionarModelo('acronis_pdf')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                      formTipo === 'acronis_pdf'
                        ? 'bg-sky-600 text-white border-sky-700'
                        : 'bg-white text-sky-800 border-sky-300 hover:bg-sky-50'
                    }`}
                  >
                    2. Acronis (Anexo PDF SocNoc)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelecionarModelo('noc_diario')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                      formTipo === 'noc_diario'
                        ? 'bg-purple-600 text-white border-purple-700'
                        : 'bg-white text-purple-800 border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    3. NOC Diário (Humano)
                  </button>
                </div>
              </div>

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

              {formTipo === 'acronis_pdf' && (
                <div className="p-2.5 rounded border border-sky-200 bg-sky-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-sky-700" />
                      Anexo PDF Detectado:
                    </span>
                    <span className="text-[10px] text-sky-700 font-mono">
                      {nomeArquivoAnexo || 'Atividades diárias - SocNoc.pdf'}
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-sky-800 block mb-1">
                      Texto Extraído do PDF (Camada OCR / Texto):
                    </label>
                    <Textarea
                      rows={5}
                      value={pdfTextoSimulado}
                      onChange={(e) => setPdfTextoSimulado(e.target.value)}
                      className="text-xs font-mono bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Corpo do E-mail (Texto ou HTML) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Adaptador: Auto (VEEAM / ACRONIS_PDF / NOC_DIARIO)
                  </span>
                </div>
                <Textarea
                  required
                  rows={6}
                  placeholder="Cole aqui o corpo do e-mail..."
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

      {/* Modal Detalhes do Processamento e Laudo Técnico */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#0B2545]" />
              Detalhes da Evidência, Extração e Laudo de Conformidade
            </DialogTitle>
            <DialogDescription className="text-xs">
              Prova digital auditável, extração estruturada do adaptador e laudo automatizado de
              conformidade.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 text-xs">
            {selectedEvidencia && (
              <>
                {/* Seção 1: Laudo de Avaliação de Conformidade */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#0B2545]" />
                      Laudo de Avaliação de Conformidade
                    </span>
                    {(() => {
                      // Regra de Negócio C: Veredito único derivado da pior verificação
                      const checks = selectedAvaliacao?.laudo_tecnico?.verificacoes || []
                      const temNaoConforme = checks.some(
                        (chk: any) => chk.status === 'nao_conforme' || chk.passou === false,
                      )
                      const temAtencao = checks.some((chk: any) => chk.status === 'atencao')
                      const vereditoUnico = temNaoConforme
                        ? 'nao_conforme'
                        : temAtencao
                          ? 'atencao'
                          : selectedAvaliacao?.laudo_tecnico?.resultado ||
                            selectedAvaliacao?.resultado_conformidade ||
                            'conforme'

                      return (
                        <Badge
                          className={`text-[10px] font-bold uppercase ${
                            vereditoUnico === 'conforme'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : vereditoUnico === 'atencao'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-red-100 text-red-800 border-red-300'
                          }`}
                        >
                          {vereditoUnico === 'conforme'
                            ? 'Conforme'
                            : vereditoUnico === 'atencao'
                              ? 'Atenção'
                              : 'Não Conforme'}
                        </Badge>
                      )
                    })()}
                  </div>
                  {procLoading ? (
                    <p className="text-slate-400 italic p-3 border rounded bg-slate-50">
                      Carregando laudo de avaliação...
                    </p>
                  ) : selectedAvaliacao?.laudo_tecnico || selectedAvaliacao?.confronto_escopo ? (
                    <BackupLaudoCard
                      laudo={selectedAvaliacao?.laudo_tecnico || null}
                      confrontoEscopo={selectedAvaliacao?.confronto_escopo || null}
                      titulo="Laudo Técnico Emitido pelo Sistema"
                      evidenciaId={selectedEvidencia.id}
                      rotinaId={selectedEvidencia.rotina || undefined}
                      onFontesCadastradas={(novoLaudo) => {
                        if (novoLaudo && selectedAvaliacao) {
                          setSelectedAvaliacao({
                            ...selectedAvaliacao,
                            resultado_conformidade: (novoLaudo.resultado as any) || 'conforme',
                            detalhe: novoLaudo.veredito || selectedAvaliacao.detalhe,
                            laudo_tecnico: novoLaudo,
                          })
                        }
                        onReload()
                      }}
                    />
                  ) : (
                    <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-600 text-xs">
                      <div className="font-semibold text-slate-800">
                        Nenhum laudo emitido ainda para esta evidência.
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Clique em &ldquo;Processar&rdquo; na linha correspondente para que os
                        adaptadores avaliem o comprovante contra as rotinas e planos de
                        continuidade.
                      </p>
                    </div>
                  )}
                </div>

                {/* Seção 2: Prova Digital e Integridade */}
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

                {/* Seção 3: Extração do Adaptador */}
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
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 block text-xs">
                                    {res.job_name || 'Job de Backup'}
                                  </span>
                                  {proc.adaptador_usado === 'ACRONIS_PDF' && (
                                    <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] font-bold">
                                      <Paperclip className="w-3 h-3 mr-1 text-sky-600" /> Acronis
                                      (PDF)
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  Adaptador:{' '}
                                  <strong className="text-slate-700">{proc.adaptador_usado}</strong>{' '}
                                  (v{proc.versao_adaptador || '1.0'})
                                  {res.veeam_version ? ` • ${res.veeam_version}` : ''}
                                  {res.acronis_version ? ` • ${res.acronis_version}` : ''}
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

                            {/* Metadados específicos do Acronis se houver */}
                            {res.acronis_info && (
                              <div className="p-2 rounded bg-sky-50 border border-sky-200 text-[11px] space-y-1">
                                <div className="flex items-center justify-between text-sky-900 font-semibold">
                                  <span>
                                    Relatório PDF:{' '}
                                    {res.acronis_info.nome_arquivo ||
                                      'Atividades diárias - SocNoc.pdf'}
                                  </span>
                                  <span>
                                    Intervalo:{' '}
                                    {res.acronis_info.intervalo || '05/10/2026 - 06/10/2026'}
                                  </span>
                                </div>
                                <div className="text-sky-700 text-[10px]">
                                  Origem da extração: anexo PDF processado e validado via adaptador
                                  ACRONIS_PDF.
                                </div>
                              </div>
                            )}

                            {/* Resumo formatado de métricas (Veeam e Acronis) */}
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
                                  {res.duracao || '5 a 6 minutos'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                  Planos / VMs
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {(() => {
                                    const total = res.contadores?.total_vms || vms.length || 0
                                    const foraCount = vms.filter(
                                      (vm: any) =>
                                        vm.fora_escopo ||
                                        vm.status_escopo === 'fora_escopo' ||
                                        vm.nome === 'Backup_SRV-FILESERVER',
                                    ).length
                                    const noEscopoCount = total - foraCount
                                    if (proc.adaptador_usado === 'ACRONIS_PDF' && foraCount > 0) {
                                      return `${noEscopoCount} de ${noEscopoCount} do escopo (${foraCount} fora do escopo)`
                                    }
                                    return `${res.contadores?.processadas || vms.length || 0}${
                                      res.contadores?.total_vms
                                        ? ` de ${res.contadores.total_vms}`
                                        : ''
                                    }`
                                  })()}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                                  Destino
                                </span>
                                <span
                                  className="font-semibold text-slate-800 truncate block"
                                  title={res.destino}
                                >
                                  {res.destino || 'Nuvem'}
                                </span>
                              </div>
                            </div>

                            {/* Tabela de Detalhes por VM / Planos Acronis */}
                            {vms.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                                  {proc.adaptador_usado === 'ACRONIS_PDF'
                                    ? `Planos de Proteção Extraídos do PDF (${vms.length})`
                                    : `Detalhamento de Objetos / VMs (${vms.length})`}
                                </span>
                                <div className="border border-slate-200 rounded overflow-hidden">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                        <th className="py-1.5 px-2">Nome</th>
                                        <th className="py-1.5 px-2">Status</th>
                                        <th className="py-1.5 px-2">Início/Fim</th>
                                        <th className="py-1.5 px-2">Processado</th>
                                        <th className="py-1.5 px-2">Salvo/Transf.</th>
                                        <th className="py-1.5 px-2">Duração</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {vms.map((vm, vIdx) => {
                                        const isForaEscopo = Boolean(
                                          (vm as any).fora_escopo ||
                                          (vm as any).status_escopo === 'fora_escopo' ||
                                          vm.nome === 'Backup_SRV-FILESERVER',
                                        )
                                        return (
                                          <tr
                                            key={vIdx}
                                            className={`transition-colors ${
                                              isForaEscopo
                                                ? 'bg-amber-50/80 border-y border-amber-200/80 hover:bg-amber-100/60'
                                                : 'hover:bg-slate-50/70'
                                            }`}
                                          >
                                            <td className="py-1.5 px-2 font-mono font-bold text-slate-800">
                                              <div className="flex flex-col gap-0.5">
                                                <span>{vm.nome}</span>
                                                {isForaEscopo && (
                                                  <Badge
                                                    variant="outline"
                                                    className="bg-amber-100 text-amber-900 border-amber-300 font-sans text-[9px] font-semibold px-1.5 py-0 w-fit"
                                                  >
                                                    Não cadastrado — fora do escopo ou alias
                                                    pendente
                                                  </Badge>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-1.5 px-2">
                                              <span
                                                className={`font-bold ${
                                                  vm.status?.toLowerCase().includes('success') ||
                                                  vm.status?.toUpperCase() === 'OK'
                                                    ? 'text-emerald-700'
                                                    : vm.status?.toLowerCase().includes('warning')
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
                                              {vm.size || vm.read || '—'}
                                            </td>
                                            <td className="py-1.5 px-2 font-mono text-slate-600">
                                              {vm.transferred || '—'}
                                            </td>
                                            <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">
                                              {vm.duration || '—'}
                                            </td>
                                          </tr>
                                        )
                                      })}
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

      {/* Modal Detalhes do Monitoramento Externo NOC */}
      <Dialog open={monitModalOpen} onOpenChange={setMonitModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-700" />
              Relatório de Análise Preventiva Diária do NOC
            </DialogTitle>
            <DialogDescription className="text-xs">
              Avaliação de integridade realizada pelo time de monitoramento externo do ambiente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 text-xs">
            {selectedMonit && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Assunto / Título:
                      </span>
                      <strong className="text-slate-900 text-sm">{selectedMonit.assunto}</strong>
                    </div>
                    <Badge
                      className={`text-xs font-bold ${
                        selectedMonit.status_geral === 'ok'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {selectedMonit.status_geral === 'ok' ? 'STATUS OK' : 'FALHA DETECTADA'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Remetente NOC:
                      </span>
                      <span>{selectedMonit.origem_remetente}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Data de Monitoramento:
                      </span>
                      <span>
                        {selectedMonit.data_monitoramento
                          ? new Date(selectedMonit.data_monitoramento).toLocaleDateString('pt-BR')
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Hash SHA-256 (Auditável):
                    </span>
                    <span className="font-mono text-[10px] text-purple-900 break-all select-all">
                      {selectedMonit.hash_conteudo}
                    </span>
                  </div>
                </div>

                {/* Tabela de Clientes e Status */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Avaliação por Cliente / Unidade
                  </span>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          <th className="py-2 px-3">Cliente / Cartório</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Ações Realizadas pelo NOC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedMonit.clientes_status?.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">{c.cliente}</td>
                            <td className="py-2 px-3">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  c.status.toUpperCase() === 'OK'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {c.status}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {c.acoes || 'Nenhuma intervenção necessária.'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Informações sobre evidências e imagens */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    Evidências Mencionadas pelo Colaborador
                  </span>
                  <p className="text-xs text-slate-700">
                    {selectedMonit.evidencias_mencionadas ||
                      'Grid de jobs verificado no console Veeam.'}
                  </p>
                  {selectedMonit.comprovante_tem_imagem && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Comprovante contém imagem anexada/colada (print de tela). As imagens são
                        arquivadas como prova documental bruta e não são convertidas em texto.
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo Bruto */}
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1">
                    Conteúdo Original do E-mail
                  </span>
                  <pre className="p-2.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedMonit.conteudo_bruto || 'Sem conteúdo bruto armazenado.'}
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
              onClick={() => setMonitModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 1: Exclusão Controlada de Evidência Individual */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleConfirmarExclusaoIndividual} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-950 flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-red-100 text-red-700 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                Excluir Evidência de Backup
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Esta ação é irreversível e será registrada na trilha de auditoria do sistema CSCTI
                com seu perfil de operador, timestamp e justificativa.
              </DialogDescription>
            </DialogHeader>

            {/* Dados-chave da evidência para conferência */}
            {evidenciaParaExcluir && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Dados da Evidência Selecionada
                </div>
                <div className="space-y-1">
                  <p className="text-slate-800">
                    <strong className="text-slate-900">Assunto:</strong>{' '}
                    <span className="font-medium">
                      {evidenciaParaExcluir.assunto || 'Sem assunto'}
                    </span>
                  </p>
                  <p className="text-slate-700">
                    <strong>Remetente / Origem:</strong> {evidenciaParaExcluir.remetente}
                  </p>
                  <p className="text-slate-700">
                    <strong>Data Recebida:</strong>{' '}
                    {evidenciaParaExcluir.data_recebida
                      ? new Date(evidenciaParaExcluir.data_recebida).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                  <p className="text-slate-700 flex items-center gap-1 font-mono text-[11px]">
                    <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                    <strong>SHA-256:</strong>{' '}
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {evidenciaParaExcluir.hash_conteudo
                        ? `${evidenciaParaExcluir.hash_conteudo.slice(0, 16)}...${evidenciaParaExcluir.hash_conteudo.slice(-8)}`
                        : '—'}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Pergunta de segurança 1: Motivo obrigatório */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Motivo / Observação da Exclusão <span className="text-red-500">*</span>
              </label>
              <Textarea
                required
                rows={3}
                value={motivoExclusao}
                onChange={(e) => setMotivoExclusao(e.target.value)}
                placeholder="Explique o motivo técnico ou operacional para remover esta evidência (mínimo 10 caracteres)..."
                className="text-xs resize-none"
              />
              <span className="text-[11px] text-slate-500 block">
                {motivoExclusao.trim().length} / 10 caracteres mínimos • Ficará gravado no log de
                auditoria.
              </span>
            </div>

            {/* Pergunta de segurança 2: Confirmação do histórico comprobatório */}
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="chk-pergunta-seguranca"
                  checked={perguntaSeguranca}
                  onCheckedChange={(c) => setPerguntaSeguranca(Boolean(c))}
                  className="mt-0.5"
                />
                <label
                  htmlFor="chk-pergunta-seguranca"
                  className="text-xs text-amber-950 font-medium cursor-pointer leading-tight select-none"
                >
                  Esta evidência faz parte do histórico comprobatório. Desejo realmente removê-la e
                  estou ciente do impacto nas métricas de conformidade.
                </label>
              </div>

              <div className="flex items-start gap-2 pt-1 border-t border-amber-200/60">
                <Checkbox
                  id="chk-confirmacao-permanente"
                  checked={confirmacaoExclusao}
                  onCheckedChange={(c) => setConfirmacaoExclusao(Boolean(c))}
                  className="mt-0.5"
                />
                <label
                  htmlFor="chk-confirmacao-permanente"
                  className="text-xs text-amber-950 font-medium cursor-pointer leading-tight select-none"
                >
                  Entendo que esta ação é permanente, removerá as execuções/laudos derivados desta
                  evidência e será auditada pelo sistema CSCTI.
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={excluindoEvidencia}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  excluindoEvidencia ||
                  motivoExclusao.trim().length < 10 ||
                  !confirmacaoExclusao ||
                  !perguntaSeguranca
                }
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {excluindoEvidencia ? 'Excluindo...' : 'Confirmar Exclusão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Limpeza Total de Evidências (Começar do Zero) */}
      <Dialog open={limparTodasModalOpen} onOpenChange={setLimparTodasModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleConfirmarLimparTodas} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-950 flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-red-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                Reiniciar Histórico de Evidências (Zerar)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Esta ação apaga <strong>TODAS as {evidencias.length} evidências</strong> de backup
                desta serventia para permitir que o monitoramento seja iniciado novamente do zero.
              </DialogDescription>
            </DialogHeader>

            {/* Quadro de Impacto */}
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-red-900">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                Impacto da Limpeza na Serventia Atual:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-900/90 pl-1">
                <li>
                  <strong>{evidencias.length}</strong> evidência(s) registrada(s) serão removidas
                  permanentemente.
                </li>
                <li>
                  Todas as execuções de backup e laudos técnicos derivados dessas evidências serão
                  excluídos.
                </li>
                <li>
                  O dashboard de Proteção e Continuidade será recalculado imediatamente do zero.
                </li>
                <li>
                  Ocorrências vinculadas serão desvinculadas para manter histórico de não
                  conformidade.
                </li>
                <li>
                  Isolamento estrito: <strong>nenhum dado de outra serventia</strong> será afetado.
                </li>
              </ul>
            </div>

            {/* Frase de segurança digitada */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Digite a frase de confirmação:{' '}
                <strong className="text-red-700 font-mono">LIMPAR EVIDENCIAS</strong>
              </label>
              <Input
                required
                value={fraseLimpeza}
                onChange={(e) => setFraseLimpeza(e.target.value)}
                placeholder="Digite LIMPAR EVIDENCIAS..."
                className="text-xs font-mono"
              />
              <span className="text-[11px] text-slate-500 block">
                A frase deve ser digitada exatamente em letras maiúsculas.
              </span>
            </div>

            {/* Justificativa obrigatória */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Justificativa / Motivo da Limpeza <span className="text-red-500">*</span>
              </label>
              <Textarea
                required
                rows={3}
                value={motivoLimpeza}
                onChange={(e) => setMotivoLimpeza(e.target.value)}
                placeholder="Descreva o motivo de reiniciar o monitoramento do zero (mínimo 10 caracteres)..."
                className="text-xs resize-none"
              />
              <span className="text-[11px] text-slate-500 block">
                {motivoLimpeza.trim().length} / 10 caracteres mínimos • Ficará gravado na trilha de
                auditoria.
              </span>
            </div>

            {/* Checkbox de ciência */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="chk-confirmacao-limpeza-total"
                  checked={confirmacaoCheckboxLimpeza}
                  onCheckedChange={(c) => setConfirmacaoCheckboxLimpeza(Boolean(c))}
                  className="mt-0.5"
                />
                <label
                  htmlFor="chk-confirmacao-limpeza-total"
                  className="text-xs text-slate-800 font-medium cursor-pointer leading-tight select-none"
                >
                  Estou ciente de que esta ação é definitiva, reiniciará o monitoramento desta
                  serventia e registrará o evento com meu usuário na auditoria permanente do sistema
                  CSCTI.
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLimparTodasModalOpen(false)}
                disabled={limpandoTodas}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  limpandoTodas ||
                  fraseLimpeza.trim() !== 'LIMPAR EVIDENCIAS' ||
                  motivoLimpeza.trim().length < 10 ||
                  !confirmacaoCheckboxLimpeza
                }
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {limpandoTodas ? 'Limpando...' : 'Zerar Todas as Evidências'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BackupEvidenciasTab
