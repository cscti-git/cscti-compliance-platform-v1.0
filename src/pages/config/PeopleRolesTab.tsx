import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Shield,
  FileCheck2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  UploadCloud,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  Building2,
  UserCheck,
  ChevronRight,
  Info,
  Hash,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime, formatDate } from '@/lib/dateTime'
import {
  savePapelDesignado,
  deletePapelDesignado,
  saveDesignacao,
  anexarDocumentoAssinado,
  revogarDesignacao,
  deleteDesignacao,
  getDesignacaoAnexoUrl,
} from '@/services/designacaoService'
import { savePerson, deletePerson } from '@/services/csctiService'
import type {
  PersonItem,
  RoleItem,
  AssignmentItem,
  PapelDesignadoItem,
  DesignacaoItem,
  DesignacaoStatus,
  OrganizationItem,
} from '@/types/cscti'

interface PeopleRolesTabProps {
  organizationId: string
  organization?: OrganizationItem
  people: PersonItem[]
  roles: RoleItem[]
  assignments: AssignmentItem[]
  papeisDesignados: PapelDesignadoItem[]
  designacoes: DesignacaoItem[]
  onRefresh: () => Promise<void>
  readOnly?: boolean
  currentUserName?: string
}

export const PeopleRolesTab: React.FC<PeopleRolesTabProps> = ({
  organizationId,
  organization,
  people,
  roles,
  assignments,
  papeisDesignados,
  designacoes,
  onRefresh,
  readOnly = false,
  currentUserName = 'Administrador',
}) => {
  const { toast } = useToast()

  // Filtros da visualização
  const [activeSubTab, setActiveSubTab] = useState<'cards' | 'colaboradores' | 'catalogo'>('cards')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterObrigatorios, setFilterObrigatorios] = useState<
    'todos' | 'obrigatorios' | 'assinados' | 'pendentes'
  >('todos')

  // Modais
  const [designarModalOpen, setDesignarModalOpen] = useState(false)
  const [anexarModalOpen, setAnexarModalOpen] = useState(false)
  const [revogarModalOpen, setRevogarModalOpen] = useState(false)
  const [papelModalOpen, setPapelModalOpen] = useState(false)
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [detalhesPapelModalOpen, setDetalhesPapelModalOpen] = useState(false)

  // Estados de manipulação
  const [selectedPapel, setSelectedPapel] = useState<PapelDesignadoItem | null>(null)
  const [selectedDesignacao, setSelectedDesignacao] = useState<DesignacaoItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulário de Designação (Inline: pessoa existente ou novo cadastro)
  const [modoPessoa, setModoPessoa] = useState<'selecionar' | 'novo'>('selecionar')
  const [selectedColabId, setSelectedColabId] = useState('')
  const [formNome, setFormNome] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formCargo, setFormCargo] = useState('')
  const [formDataDesignacao, setFormDataDesignacao] = useState(
    new Date().toISOString().substring(0, 10),
  )
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formAtribuicoesCustom, setFormAtribuicoesCustom] = useState('')

  // Formulário de Anexo do Comprovante Assinado
  const [tipoAssinatura, setTipoAssinatura] = useState<'fisica' | 'digital'>('fisica')
  const [dataAssinaturaInput, setDataAssinaturaInput] = useState(
    new Date().toISOString().substring(0, 10),
  )
  const [plataformaInput, setPlataformaInput] = useState('')
  const [metodoDetalhesInput, setMetodoDetalhesInput] = useState('')
  const [anexoFile, setAnexoFile] = useState<File | null>(null)

  // Formulário de Revogação
  const [motivoRevogacaoInput, setMotivoRevogacaoInput] = useState('')

  // Formulário de Edição do Papel
  const [editingPapel, setEditingPapel] = useState<PapelDesignadoItem | null>(null)
  const [papelNomeInput, setPapelNomeInput] = useState('')
  const [papelCodigoInput, setPapelCodigoInput] = useState('')
  const [papelDescCurtaInput, setPapelDescCurtaInput] = useState('')
  const [papelAtribuicoesInput, setPapelAtribuicoesInput] = useState('')
  const [papelObrigatorioInput, setPapelObrigatorioInput] = useState(true)
  const [papelModuloInput, setPapelModuloInput] = useState('')

  // Formulário de Colaborador (cadastro simples)
  const [editingPerson, setEditingPerson] = useState<PersonItem | null>(null)
  const [personNomeInput, setPersonNomeInput] = useState('')
  const [personCargoInput, setPersonCargoInput] = useState('')
  const [personEmailInput, setPersonEmailInput] = useState('')
  const [personTelefoneInput, setPersonTelefoneInput] = useState('')

  // Mapa do papel com a designação ATIVA mais recente
  const mapaDesignacaoPorPapel = useMemo(() => {
    const map = new Map<string, DesignacaoItem>()
    // Ordena para que a designação ativa mais recente fique em destaque
    const sorted = [...designacoes].sort((a, b) => {
      // Prioridade: assinada_fisica/assinada_digital > pendente_assinatura > rascunho > revogada
      const peso = (st: DesignacaoStatus) => {
        if (st === 'assinada_fisica' || st === 'assinada_digital') return 4
        if (st === 'pendente_assinatura') return 3
        if (st === 'rascunho') return 2
        return 1
      }
      return peso(b.status) - peso(a.status)
    })
    for (const d of sorted) {
      if (!map.has(d.papel_designado)) {
        map.set(d.papel_designado, d)
      }
    }
    return map
  }, [designacoes])

  // Estatísticas de Completude Real do Domínio
  const stats = useMemo(() => {
    const totalPapeis = papeisDesignados.length
    const obrigatorios = papeisDesignados.filter((p) => p.e_obrigatorio)
    const totalObrigatorios = obrigatorios.length

    let assinadasObrigatorias = 0
    let pendentesObrigatorias = 0
    let vaziasObrigatorias = 0

    let totalAssinadasGeral = 0

    for (const p of obrigatorios) {
      const d = mapaDesignacaoPorPapel.get(p.id)
      if (!d || d.status === 'revogada') {
        vaziasObrigatorias++
      } else if (d.status === 'assinada_fisica' || d.status === 'assinada_digital') {
        assinadasObrigatorias++
        totalAssinadasGeral++
      } else {
        pendentesObrigatorias++
      }
    }

    // Não-obrigatórios assinados
    for (const p of papeisDesignados) {
      if (!p.e_obrigatorio) {
        const d = mapaDesignacaoPorPapel.get(p.id)
        if (d && (d.status === 'assinada_fisica' || d.status === 'assinada_digital')) {
          totalAssinadasGeral++
        }
      }
    }

    const percentualObrigatorio =
      totalObrigatorios > 0 ? Math.round((assinadasObrigatorias / totalObrigatorios) * 100) : 0

    return {
      totalPapeis,
      totalObrigatorios,
      assinadasObrigatorias,
      pendentesObrigatorias,
      vaziasObrigatorias,
      totalAssinadasGeral,
      percentualObrigatorio,
    }
  }, [papeisDesignados, mapaDesignacaoPorPapel])

  // Lista de papéis filtrados
  const papeisFiltrados = useMemo(() => {
    return papeisDesignados
      .filter((p) => {
        if (filterObrigatorios === 'obrigatorios' && !p.e_obrigatorio) return false
        const d = mapaDesignacaoPorPapel.get(p.id)
        const isAssinada = d && (d.status === 'assinada_fisica' || d.status === 'assinada_digital')
        if (filterObrigatorios === 'assinados' && !isAssinada) return false
        if (filterObrigatorios === 'pendentes' && isAssinada) return false

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase()
          const matchPapel = p.papel.toLowerCase().includes(q)
          const matchDesc = (p.descricao_curta || '').toLowerCase().includes(q)
          const matchNome = d?.nome_designado.toLowerCase().includes(q)
          if (!matchPapel && !matchDesc && !matchNome) return false
        }
        return true
      })
      .sort((a, b) => {
        // Obrigatórios primeiro, depois pela ordem configurada
        if (a.e_obrigatorio && !b.e_obrigatorio) return -1
        if (!a.e_obrigatorio && b.e_obrigatorio) return 1
        return (a.ordem || 99) - (b.ordem || 99)
      })
  }, [papeisDesignados, filterObrigatorios, searchTerm, mapaDesignacaoPorPapel])

  // ==========================================
  // Handlers de Fluxo de Designação
  // ==========================================

  const handleAbrirDesignar = (papel: PapelDesignadoItem) => {
    setSelectedPapel(papel)
    const dExistente = mapaDesignacaoPorPapel.get(papel.id)

    if (dExistente && dExistente.status !== 'revogada') {
      // Pré-carrega dados da designação existente
      setSelectedColabId(dExistente.colaborador || '')
      setFormNome(dExistente.nome_designado)
      setFormCpf(dExistente.cpf_designado || '')
      setFormEmail(dExistente.email_designado || '')
      setFormTelefone(dExistente.telefone_designado || '')
      setFormCargo(dExistente.cargo_designado || '')
      setFormDataDesignacao(dExistente.data_designacao.substring(0, 10))
      setFormObservacoes(dExistente.observacoes || '')
      setFormAtribuicoesCustom(dExistente.atribuicoes_customizadas || papel.atribuicoes_detalhadas)
      setModoPessoa(dExistente.colaborador ? 'selecionar' : 'novo')
    } else {
      // Nova designação
      if (people.length > 0) {
        setSelectedColabId(people[0].id)
        setFormNome(people[0].name)
        setFormEmail(people[0].email)
        setFormTelefone(people[0].phone || '')
        setFormCargo(people[0].role_title || '')
        setFormCpf('')
        setModoPessoa('selecionar')
      } else {
        setSelectedColabId('')
        setFormNome('')
        setFormEmail('')
        setFormTelefone('')
        setFormCargo('')
        setFormCpf('')
        setModoPessoa('novo')
      }
      setFormDataDesignacao(new Date().toISOString().substring(0, 10))
      setFormObservacoes('')
      setFormAtribuicoesCustom(papel.atribuicoes_detalhadas)
    }

    setDesignarModalOpen(true)
  }

  const handleSalvarDesignacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPapel) return

    if (!formNome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome completo da pessoa designada.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const dExistente = mapaDesignacaoPorPapel.get(selectedPapel.id)

      await saveDesignacao(organizationId, {
        id: dExistente && dExistente.status !== 'revogada' ? dExistente.id : undefined,
        papel_designado: selectedPapel.id,
        colaborador: modoPessoa === 'selecionar' && selectedColabId ? selectedColabId : undefined,
        nome_designado: formNome.trim(),
        cpf_designado: formCpf.trim(),
        email_designado: formEmail.trim(),
        telefone_designado: formTelefone.trim(),
        cargo_designado: formCargo.trim(),
        status:
          dExistente?.status === 'assinada_fisica' || dExistente?.status === 'assinada_digital'
            ? dExistente.status
            : 'pendente_assinatura',
        data_designacao: formDataDesignacao,
        observacoes: formObservacoes.trim(),
        atribuicoes_customizadas: formAtribuicoesCustom.trim(),
      })

      // Se for pessoa nova cadastrada inline, cria também na lista de colaboradores se solicitado
      if (modoPessoa === 'novo' && formNome.trim() && formEmail.trim()) {
        try {
          await savePerson(organizationId, {
            name: formNome.trim(),
            email: formEmail.trim(),
            role_title: formCargo.trim(),
            phone: formTelefone.trim(),
            status: 'ativo',
          })
        } catch {
          /* intentionally ignored */
        }
      }

      await onRefresh()
      setDesignarModalOpen(false)
      toast({
        title: 'Designação Registrada',
        description: `Designação de "${formNome}" para o papel "${selectedPapel.papel}" registrada com status Pendente de Assinatura.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao designar',
        description: err.message || 'Falha ao salvar a designação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================
  // Handlers de Anexo de Comprovante Assinado
  // ==========================================

  const handleAbrirAnexar = (desig: DesignacaoItem) => {
    setSelectedDesignacao(desig)
    setTipoAssinatura('fisica')
    setDataAssinaturaInput(new Date().toISOString().substring(0, 10))
    setPlataformaInput('')
    setMetodoDetalhesInput('')
    setAnexoFile(null)
    setAnexarModalOpen(true)
  }

  const handleSalvarAnexo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDesignacao || !anexoFile) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Selecione o documento comprobatório assinado (PDF, JPG ou PNG até 30MB).',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await anexarDocumentoAssinado(
        organizationId,
        selectedDesignacao.id,
        anexoFile,
        tipoAssinatura,
        dataAssinaturaInput,
        {
          plataforma: tipoAssinatura === 'digital' ? plataformaInput : 'Documento Físico Assinado',
          metodoDetalhes: metodoDetalhesInput,
        },
      )

      await onRefresh()
      setAnexarModalOpen(false)
      toast({
        title: 'Comprovante Registrado com Sucesso',
        description: `O documento assinado foi vinculado e o hash SHA-256 foi gravado na trilha de auditoria.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao anexar',
        description: err.message || 'Falha ao processar e salvar o anexo comprobatório.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================
  // Handlers de Revogação
  // ==========================================

  const handleAbrirRevogar = (desig: DesignacaoItem) => {
    setSelectedDesignacao(desig)
    setMotivoRevogacaoInput('')
    setRevogarModalOpen(true)
  }

  const handleConfirmarRevogacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDesignacao || !motivoRevogacaoInput.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe a justificativa formal para a revogação da designação.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await revogarDesignacao(
        organizationId,
        selectedDesignacao.id,
        motivoRevogacaoInput.trim(),
        currentUserName,
      )
      await onRefresh()
      setRevogarModalOpen(false)
      toast({
        title: 'Designação Revogada',
        description: `A designação de "${selectedDesignacao.nome_designado}" foi revogada e auditada com sucesso.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao revogar',
        description: 'Falha ao registrar a revogação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================
  // Handlers de Papel e Atribuições Detalhadas
  // ==========================================

  const handleAbrirPapelModal = (p?: PapelDesignadoItem) => {
    if (p) {
      setEditingPapel(p)
      setPapelNomeInput(p.papel)
      setPapelCodigoInput(p.codigo || '')
      setPapelDescCurtaInput(p.descricao_curta || '')
      setPapelAtribuicoesInput(p.atribuicoes_detalhadas)
      setPapelObrigatorioInput(p.e_obrigatorio)
      setPapelModuloInput(p.modulo_vinculado || '')
    } else {
      setEditingPapel(null)
      setPapelNomeInput('')
      setPapelCodigoInput('')
      setPapelDescCurtaInput('')
      setPapelAtribuicoesInput('')
      setPapelObrigatorioInput(true)
      setPapelModuloInput('')
    }
    setPapelModalOpen(true)
  }

  const handleSalvarPapel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!papelNomeInput.trim() || !papelAtribuicoesInput.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'O nome do papel e as atribuições detalhadas são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await savePapelDesignado(organizationId, {
        id: editingPapel?.id,
        papel: papelNomeInput.trim(),
        codigo: papelCodigoInput.trim(),
        descricao_curta: papelDescCurtaInput.trim(),
        atribuicoes_detalhadas: papelAtribuicoesInput.trim(),
        e_obrigatorio: papelObrigatorioInput,
        modulo_vinculado: papelModuloInput.trim(),
      })
      await onRefresh()
      setPapelModalOpen(false)
      toast({
        title: 'Papel Salvo',
        description: 'Catálogo de atribuições atualizado com sucesso.',
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar papel',
        description: err.message || 'Falha ao salvar papel de responsabilidade.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePapel = async (id: string, papel: string) => {
    if (!confirm(`Deseja realmente remover o papel "${papel}"?`)) return
    try {
      await deletePapelDesignado(id, organizationId, papel)
      await onRefresh()
      toast({ title: 'Papel removido', description: 'Papel excluído com sucesso.' })
    } catch (err: any) {
      toast({
        title: 'Erro ao remover',
        description: err.message || 'Não foi possível remover o papel.',
        variant: 'destructive',
      })
    }
  }

  // ==========================================
  // Handlers de Colaborador Simples
  // ==========================================

  const handleAbrirPersonModal = (p?: PersonItem) => {
    if (p) {
      setEditingPerson(p)
      setPersonNomeInput(p.name)
      setPersonCargoInput(p.role_title || '')
      setPersonEmailInput(p.email)
      setPersonTelefoneInput(p.phone || '')
    } else {
      setEditingPerson(null)
      setPersonNomeInput('')
      setPersonCargoInput('')
      setPersonEmailInput('')
      setPersonTelefoneInput('')
    }
    setPersonModalOpen(true)
  }

  const handleSalvarPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personNomeInput.trim() || !personEmailInput.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e E-mail são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await savePerson(organizationId, {
        id: editingPerson?.id,
        name: personNomeInput.trim(),
        role_title: personCargoInput.trim(),
        email: personEmailInput.trim(),
        phone: personTelefoneInput.trim(),
        status: 'ativo',
      })
      await onRefresh()
      setPersonModalOpen(false)
      toast({ title: 'Sucesso', description: 'Colaborador salvo com sucesso.' })
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Erro ao salvar pessoa', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePerson = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover "${name}"?`)) return
    try {
      await deletePerson(id, organizationId)
      await onRefresh()
      toast({ title: 'Removido', description: 'Colaborador excluído.' })
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. RAIO-X DE COMPLETUDE DAS DESIGNAÇÕES (DADOS REAIS DO BANCO) */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#124E78] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Quadro Oficial de Designações & Termos Jurídicos
                </h2>
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-300 font-mono text-[10px]"
                >
                  AUDITADO
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Cada papel exigido possui atribuições pré-definidas discriminadas e termo
                institucional com validade jurídica (duas vias: designado e titular), comprovado por
                documento físico assinado digitalizado ou com registro eletrônico com hash SHA-256.
              </p>
            </div>
          </div>

          {/* Indicador de progresso real */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 bg-white/90 p-3.5 rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Completude Obrigatória
              </span>
              <span className="text-xl font-extrabold text-[#0B2545]">
                {stats.assinadasObrigatorias} de {stats.totalObrigatorios} assinadas
              </span>
            </div>

            <div className="w-24 sm:w-28 space-y-1">
              <Progress value={stats.percentualObrigatorio} className="h-2.5 bg-slate-200" />
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>{stats.percentualObrigatorio}%</span>
                <span>
                  {stats.vaziasObrigatorias > 0
                    ? `${stats.vaziasObrigatorias} sem pessoa`
                    : 'Conforme'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-BARRA DE NAVEGAÇÃO E AÇÕES */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeSubTab === 'cards' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('cards')}
            className={`text-xs h-9 cursor-pointer gap-1.5 ${
              activeSubTab === 'cards'
                ? 'bg-[#0B2545] hover:bg-[#124E78] text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Papéis & Designações ({papeisDesignados.length})</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeSubTab === 'colaboradores' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('colaboradores')}
            className={`text-xs h-9 cursor-pointer gap-1.5 ${
              activeSubTab === 'colaboradores'
                ? 'bg-[#0B2545] hover:bg-[#124E78] text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Colaboradores Cadastrados ({people.length})</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeSubTab === 'catalogo' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('catalogo')}
            className={`text-xs h-9 cursor-pointer gap-1.5 ${
              activeSubTab === 'catalogo'
                ? 'bg-[#0B2545] hover:bg-[#124E78] text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Catálogo de Atribuições</span>
          </Button>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 shrink-0">
            {activeSubTab === 'colaboradores' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => handleAbrirPersonModal()}
                className="bg-[#1A56DB] hover:bg-[#1546AF] text-white text-xs h-9 gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Colaborador
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleAbrirPapelModal()}
                variant="outline"
                className="text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Papel
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 3. CONTEÚDO PRINCIPAL: SUB-ABA 1 (CARDS DE PAPÉIS & DESIGNAÇÕES) */}
      {activeSubTab === 'cards' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por papel, descrição ou pessoa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs h-9 pl-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-medium">Filtrar:</span>
              <button
                type="button"
                onClick={() => setFilterObrigatorios('todos')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterObrigatorios === 'todos'
                    ? 'bg-[#0B2545] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({papeisDesignados.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterObrigatorios('obrigatorios')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterObrigatorios === 'obrigatorios'
                    ? 'bg-[#0B2545] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Obrigatórios ({stats.totalObrigatorios})
              </button>
              <button
                type="button"
                onClick={() => setFilterObrigatorios('assinados')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterObrigatorios === 'assinados'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                ✓ Assinados ({stats.totalAssinadasGeral})
              </button>
              <button
                type="button"
                onClick={() => setFilterObrigatorios('pendentes')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  filterObrigatorios === 'pendentes'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                ⚠ Pendentes / Sem Pessoa ({papeisDesignados.length - stats.totalAssinadasGeral})
              </button>
            </div>
          </div>

          {/* GRID DE CARDS POR PAPEL (Obrigatórios primeiro) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papeisFiltrados.map((papel) => {
              const desig = mapaDesignacaoPorPapel.get(papel.id)
              const temDesignacao = Boolean(desig && desig.status !== 'revogada')
              const isAssinada =
                desig?.status === 'assinada_fisica' || desig?.status === 'assinada_digital'
              const isPendente =
                desig?.status === 'pendente_assinatura' || desig?.status === 'rascunho'

              return (
                <Card
                  key={papel.id}
                  className={`relative flex flex-col justify-between rounded-xl border transition-all duration-150 ${
                    isAssinada
                      ? 'border-emerald-200 bg-white shadow-2xs hover:border-emerald-300'
                      : isPendente
                        ? 'border-amber-200 bg-amber-50/20 shadow-2xs hover:border-amber-300'
                        : papel.e_obrigatorio
                          ? 'border-rose-200 bg-rose-50/15 shadow-2xs hover:border-rose-300'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <CardHeader className="p-4 pb-3 space-y-2 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {papel.e_obrigatorio ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold bg-rose-50 text-rose-700 border-rose-300"
                            >
                              OBRIGATÓRIO
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-slate-50 text-slate-600 border-slate-300"
                            >
                              FACULTATIVO
                            </Badge>
                          )}
                          {papel.da_ferramenta && (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-purple-50 text-purple-700 border-purple-300"
                            >
                              DA FERRAMENTA
                            </Badge>
                          )}
                          {papel.modulo_vinculado && (
                            <span className="text-[9px] font-mono uppercase text-slate-400">
                              {papel.modulo_vinculado}
                            </span>
                          )}
                        </div>

                        <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                          {papel.papel}
                        </CardTitle>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isAssinada ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {desig?.status === 'assinada_digital'
                              ? 'Assinada (Digital)'
                              : 'Assinada (Física)'}
                          </span>
                        ) : isPendente ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pendente Assinatura
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            <AlertTriangle className="w-3 h-3 text-slate-400" />
                            Sem designação
                          </span>
                        )}
                      </div>
                    </div>

                    <CardDescription className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {papel.descricao_curta || 'Atribuições detalhadas disponíveis no termo.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-3 flex-1 flex flex-col justify-between space-y-3">
                    {/* Bloco da pessoa designada ou aviso vazio */}
                    {temDesignacao && desig ? (
                      <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Pessoa Designada
                            </span>
                            <p className="font-bold text-slate-900 truncate">
                              {desig.nome_designado}
                            </p>
                          </div>
                          {desig.cargo_designado && (
                            <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px]">
                              {desig.cargo_designado}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                          {desig.email_designado && (
                            <p className="truncate">{desig.email_designado}</p>
                          )}
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60">
                            <span>Desde: {formatDate(desig.data_designacao)}</span>
                            {desig.hash_sha256 && (
                              <span
                                className="text-emerald-700 font-bold"
                                title={`SHA-256: ${desig.hash_sha256}`}
                              >
                                SHA-256 ✓
                              </span>
                            )}
                          </div>
                        </div>

                        {desig.anexos_comprovante && desig.anexos_comprovante.length > 0 && (
                          <div className="pt-1 text-[11px]">
                            <a
                              href={getDesignacaoAnexoUrl(desig, desig.anexos_comprovante[0])}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                            >
                              <FileCheck2 className="w-3 h-3" /> Ver anexo assinado
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50/60 rounded-lg border border-dashed border-slate-200 text-center py-4 text-xs text-slate-400 space-y-1">
                        <Users className="w-5 h-5 mx-auto text-slate-300" />
                        <p className="font-medium text-slate-600">Nenhuma pessoa designada</p>
                        <p className="text-[11px] text-slate-400">
                          {papel.e_obrigatorio
                            ? 'Obrigatório para conformidade institucional.'
                            : 'Atribua um colaborador quando aplicável.'}
                        </p>
                      </div>
                    )}

                    {/* Botões de Ação do Card */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        {!readOnly && (
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => handleAbrirDesignar(papel)}
                            className="h-8 text-xs bg-[#0B2545] hover:bg-[#124E78] text-white px-2.5 cursor-pointer font-semibold"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            {temDesignacao ? 'Alterar' : 'Designar'}
                          </Button>
                        )}

                        {temDesignacao && desig && (
                          <Link to={`/configuracoes/designacoes/${desig.id}/termo`}>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-slate-700 hover:text-blue-700 hover:bg-blue-50 px-2.5 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1" />
                              Ver Termo
                            </Button>
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {temDesignacao && desig && !readOnly && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAbrirAnexar(desig)}
                              className={`h-8 text-xs px-2 cursor-pointer ${
                                isAssinada
                                  ? 'text-slate-600 hover:text-emerald-700'
                                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 font-semibold'
                              }`}
                              title="Anexar documento assinado (físico ou digital)"
                            >
                              <UploadCloud className="w-3.5 h-3.5 mr-1" />
                              {isAssinada ? 'Reanexar' : 'Anexar'}
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleAbrirRevogar(desig)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Revogar designação com justificativa formal"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPapel(papel)
                            setDetalhesPapelModalOpen(true)
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Ver detalhes das atribuições deste papel"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO PRINCIPAL: SUB-ABA 2 (COLABORADORES CADASTRADOS) */}
      {activeSubTab === 'colaboradores' && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Colaboradores e Equipe da Serventia ({people.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pessoas físicas habilitadas para designação de papéis e responsabilidades
                  institucionais.
                </CardDescription>
              </div>
            </div>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleAbrirPersonModal()}
                className="bg-[#1A56DB] hover:bg-[#1546AF] text-white text-xs h-9 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Colaborador
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-xs">
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo / Função</TableHead>
                  <TableHead>E-mail Institucional</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Papéis Designados Ativos</TableHead>
                  {!readOnly && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                      Nenhum colaborador cadastrado. Clique em "Novo Colaborador" para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  people.map((p) => {
                    // Papéis que essa pessoa ocupa atualmente
                    const papeisOcupados = designacoes
                      .filter(
                        (d) =>
                          d.colaborador === p.id &&
                          (d.status === 'assinada_fisica' ||
                            d.status === 'assinada_digital' ||
                            d.status === 'pendente_assinatura'),
                      )
                      .map((d) => d.expand?.papel_designado?.papel)
                      .filter(Boolean)

                    return (
                      <TableRow key={p.id} className="text-xs">
                        <TableCell className="font-bold text-slate-900">{p.name}</TableCell>
                        <TableCell className="text-slate-600">
                          {p.role_title || 'Colaborador'}
                        </TableCell>
                        <TableCell className="font-mono text-slate-600">{p.email}</TableCell>
                        <TableCell className="text-slate-500">{p.phone || '-'}</TableCell>
                        <TableCell>
                          {papeisOcupados.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {papeisOcupados.map((nome, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {nome}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Nenhum</span>
                          )}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAbrirPersonModal(p)}
                              className="h-7 w-7 text-slate-500 hover:text-blue-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePerson(p.id, p.name)}
                              className="h-7 w-7 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 5. CONTEÚDO PRINCIPAL: SUB-ABA 3 (CATÁLOGO DE ATRIBUIÇÕES E PAPÉIS) */}
      {activeSubTab === 'catalogo' && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-indigo-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Catálogo Institucional de Papéis & Atribuições ({papeisDesignados.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Discriminação detalhada das competências e responsabilidades técnicas por encargo.
                </CardDescription>
              </div>
            </div>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleAbrirPapelModal()}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs h-9 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Papel
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100">
            {papeisDesignados.map((papel) => (
              <div key={papel.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{papel.papel}</span>
                      {papel.codigo && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {papel.codigo}
                        </span>
                      )}
                      {papel.e_obrigatorio && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-rose-50 text-rose-700 border-rose-300"
                        >
                          OBRIGATÓRIO
                        </Badge>
                      )}
                      {papel.da_ferramenta && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-purple-50 text-purple-700 border-purple-300"
                        >
                          DA FERRAMENTA
                        </Badge>
                      )}
                    </div>
                    {papel.descricao_curta && (
                      <p className="text-xs text-slate-600">{papel.descricao_curta}</p>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAbrirPapelModal(papel)}
                        className="h-8 w-8 text-slate-500 hover:text-blue-600"
                        title="Editar atribuições"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {!papel.da_ferramenta && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePapel(papel.id, papel.papel)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                          title="Remover papel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 block mb-1">
                    Atribuições Pré-configuradas:
                  </span>
                  <div className="whitespace-pre-line leading-relaxed">
                    {papel.atribuicoes_detalhadas}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DESIGNAR PESSOA PARA O PAPEL (Com atribuições editáveis e termo)  */}
      {/* ========================================================================= */}
      <Dialog open={designarModalOpen} onOpenChange={setDesignarModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Designar Responsável: {selectedPapel?.papel}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Vincule um colaborador da serventia e revise as atribuições que constarão no Termo
              Institucional com validade jurídica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarDesignacao} className="space-y-4 pt-2">
            {/* Escolha: Selecionar existente ou cadastrar inline */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Modo de Indicação</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={modoPessoa === 'selecionar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModoPessoa('selecionar')}
                  className={`text-xs h-9 ${
                    modoPessoa === 'selecionar'
                      ? 'bg-[#0B2545] text-white'
                      : 'text-slate-700 border-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Selecionar Colaborador
                </Button>
                <Button
                  type="button"
                  variant={modoPessoa === 'novo' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModoPessoa('novo')}
                  className={`text-xs h-9 ${
                    modoPessoa === 'novo'
                      ? 'bg-[#0B2545] text-white'
                      : 'text-slate-700 border-slate-300'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Cadastrar Novo Inline
                </Button>
              </div>
            </div>

            {modoPessoa === 'selecionar' ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Colaborador Cadastrado *
                </Label>
                <select
                  value={selectedColabId}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedColabId(id)
                    const p = people.find((x) => x.id === id)
                    if (p) {
                      setFormNome(p.name)
                      setFormEmail(p.email)
                      setFormTelefone(p.phone || '')
                      setFormCargo(p.role_title || '')
                    }
                  }}
                  className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
                  required
                >
                  <option value="">Selecione um colaborador...</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.role_title ? `(${p.role_title})` : ''} - {p.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Campos de identificação do designado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
                <Input
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome do responsável"
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  CPF (Para o Termo Jurídico)
                </Label>
                <Input
                  value={formCpf}
                  onChange={(e) => setFormCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Função / Cargo</Label>
                <Input
                  value={formCargo}
                  onChange={(e) => setFormCargo(e.target.value)}
                  placeholder="Ex: Gestor de TI, Tabelião Substituto..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">E-mail Institucional</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@serventia.com.br"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Telefone / Ramal</Label>
                <Input
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Data da Designação *</Label>
                <Input
                  type="date"
                  value={formDataDesignacao}
                  onChange={(e) => setFormDataDesignacao(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            {/* Atribuições detalhadas (pré-preenchidas e editáveis) */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Atribuições Detalhadas no Termo (Editável)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    selectedPapel && setFormAtribuicoesCustom(selectedPapel.atribuicoes_detalhadas)
                  }
                  className="h-6 text-[11px] text-blue-600 hover:text-blue-800 p-0"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Restaurar Padrão
                </Button>
              </div>
              <Textarea
                rows={5}
                value={formAtribuicoesCustom}
                onChange={(e) => setFormAtribuicoesCustom(e.target.value)}
                className="text-xs font-mono leading-relaxed"
                placeholder="Discrimine o que esta pessoa faz e suas obrigações formais..."
              />
              <p className="text-[11px] text-slate-400">
                Este texto sairá integralmente na minuta impressa do Termo de Designação para
                assinatura formal.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Observações Internas</Label>
              <Input
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                placeholder="Ex: Portaria de Nomeação nº 12/2026, Contrato de TI..."
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDesignarModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Designação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: ANEXAR DOCUMENTO ASSINADO (Físico ou Eletrônico com SHA-256)     */}
      {/* ========================================================================= */}
      <Dialog open={anexarModalOpen} onOpenChange={setAnexarModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Registrar Documento Assinado
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Anexe o comprovante assinado para dar validade jurídica e marcar a designação como
              concluída com cálculo automático de integridade (SHA-256).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarAnexo} className="space-y-4 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">
                {selectedDesignacao?.nome_designado} —{' '}
                {selectedDesignacao?.expand?.papel_designado?.papel}
              </p>
              <p className="text-slate-500 text-[11px]">
                Designado em: {formatDate(selectedDesignacao?.data_designacao || '')}
              </p>
            </div>

            {/* Tipo de Assinatura */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Modalidade da Assinatura *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={tipoAssinatura === 'fisica' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoAssinatura('fisica')}
                  className={`text-xs h-9 ${
                    tipoAssinatura === 'fisica'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 border-slate-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> Assinatura Física (Digitalizada)
                </Button>
                <Button
                  type="button"
                  variant={tipoAssinatura === 'digital' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoAssinatura('digital')}
                  className={`text-xs h-9 ${
                    tipoAssinatura === 'digital'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 border-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Assinatura Eletrônica Externa
                </Button>
              </div>
            </div>

            {tipoAssinatura === 'digital' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Plataforma Externa *
                  </Label>
                  <Input
                    placeholder="Ex: DocuSign, Gov.br, Clicksign..."
                    value={plataformaInput}
                    onChange={(e) => setPlataformaInput(e.target.value)}
                    className="text-xs h-9"
                    required={tipoAssinatura === 'digital'}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Identificador / Protocolo
                  </Label>
                  <Input
                    placeholder="Ex: Hash, Protocolo, Cód. Verificação"
                    value={metodoDetalhesInput}
                    onChange={(e) => setMetodoDetalhesInput(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Data da Assinatura *</Label>
              <Input
                type="date"
                value={dataAssinaturaInput}
                onChange={(e) => setDataAssinaturaInput(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            {/* Upload do Arquivo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Arquivo do Documento Assinado (PDF, JPG ou PNG até 30MB) *
              </Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="arquivo-termo"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setAnexoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  required
                />
                <label
                  htmlFor="arquivo-termo"
                  className="cursor-pointer flex flex-col items-center gap-1.5"
                >
                  <UploadCloud className="w-8 h-8 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">
                    {anexoFile ? anexoFile.name : 'Clique para selecionar o arquivo assinado'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {anexoFile
                      ? `${(anexoFile.size / (1024 * 1024)).toFixed(2)} MB · SHA-256 será computado no salvamento`
                      : 'PDF ou imagem escaneada de alta resolução'}
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAnexarModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !anexoFile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {isSubmitting ? 'Processando e Gravando...' : 'Confirmar & Registrar Assinatura'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: REVOGAÇÃO FORMAL DE DESIGNAÇÃO                                   */}
      {/* ========================================================================= */}
      <Dialog open={revogarModalOpen} onOpenChange={setRevogarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Revogar Designação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A revogação encerra a vigência formal da responsabilidade e mantém o registro
              inalterável na trilha de auditoria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmarRevogacao} className="space-y-4 pt-2">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-900">
              <p className="font-bold">Pessoa: {selectedDesignacao?.nome_designado}</p>
              <p className="text-[11px]">
                Papel: {selectedDesignacao?.expand?.papel_designado?.papel}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Motivo / Justificativa da Revogação *
              </Label>
              <Textarea
                rows={3}
                value={motivoRevogacaoInput}
                onChange={(e) => setMotivoRevogacaoInput(e.target.value)}
                placeholder="Ex: Desligamento do colaborador, redesignação de funções internas..."
                className="text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevogarModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                {isSubmitting ? 'Revogando...' : 'Confirmar Revogação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: DETALHES DE ATRIBUIÇÕES DO PAPEL (VISUALIZAÇÃO RÁPIDA)            */}
      {/* ========================================================================= */}
      <Dialog open={detalhesPapelModalOpen} onOpenChange={setDetalhesPapelModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {selectedPapel?.papel}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Atribuições detalhadas configuradas no catálogo institucional da serventia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            {selectedPapel?.descricao_curta && (
              <p className="text-slate-600 italic bg-blue-50/60 p-2.5 rounded border border-blue-200">
                {selectedPapel.descricao_curta}
              </p>
            )}

            <div className="space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Lista de Atribuições Formais:
              </span>
              <div className="space-y-2 text-slate-700 leading-relaxed">
                {selectedPapel?.atribuicoes_detalhadas
                  .split('\n')
                  .filter(Boolean)
                  .map((linha, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#0B2545] font-bold">•</span>
                      <span>{linha.replace(/^[0-9]+\.\s*/, '')}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetalhesPapelModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: CRIAR / EDITAR PAPEL NO CATÁLOGO                                  */}
      {/* ========================================================================= */}
      <Dialog open={papelModalOpen} onOpenChange={setPapelModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingPapel ? 'Editar Papel de Responsabilidade' : 'Novo Papel de Responsabilidade'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina o nome, a obrigatoriedade e as atribuições pré-preenchidas para o termo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarPapel} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do Papel *</Label>
              <Input
                value={papelNomeInput}
                onChange={(e) => setPapelNomeInput(e.target.value)}
                placeholder="Ex: Responsável pela Segurança da Informação"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Código Técnico</Label>
                <Input
                  value={papelCodigoInput}
                  onChange={(e) => setPapelCodigoInput(e.target.value)}
                  placeholder="RESP_EXEMPLO"
                  className="text-xs h-9 font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Módulo Vinculado</Label>
                <Input
                  value={papelModuloInput}
                  onChange={(e) => setPapelModuloInput(e.target.value)}
                  placeholder="Ex: backup, seguranca, lgpd"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Descrição Curta</Label>
              <Input
                value={papelDescCurtaInput}
                onChange={(e) => setPapelDescCurtaInput(e.target.value)}
                placeholder="Resumo em uma linha para os cards"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Atribuições Detalhadas (Item por linha) *
              </Label>
              <Textarea
                rows={6}
                value={papelAtribuicoesInput}
                onChange={(e) => setPapelAtribuicoesInput(e.target.value)}
                placeholder="1. Atribuição um...&#10;2. Atribuição dois..."
                className="text-xs font-mono leading-relaxed"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="check-obrigatorio"
                checked={papelObrigatorioInput}
                onChange={(e) => setPapelObrigatorioInput(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <Label
                htmlFor="check-obrigatorio"
                className="text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Papel obrigatório para conformidade institucional
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPapelModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Papel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 6: CRIAR / EDITAR COLABORADOR                                       */}
      {/* ========================================================================= */}
      <Dialog open={personModalOpen} onOpenChange={setPersonModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingPerson ? 'Editar Colaborador' : 'Novo Colaborador'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre a pessoa física para vinculação com papéis da serventia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarPerson} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
              <Input
                value={personNomeInput}
                onChange={(e) => setPersonNomeInput(e.target.value)}
                placeholder="Nome da pessoa"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Cargo / Função</Label>
              <Input
                value={personCargoInput}
                onChange={(e) => setPersonCargoInput(e.target.value)}
                placeholder="Ex: Tabelião Substituto, Gestor de TI..."
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">E-mail Institucional *</Label>
              <Input
                type="email"
                value={personEmailInput}
                onChange={(e) => setPersonEmailInput(e.target.value)}
                placeholder="email@serventia.com.br"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Telefone / Ramal</Label>
              <Input
                value={personTelefoneInput}
                onChange={(e) => setPersonTelefoneInput(e.target.value)}
                placeholder="(00) 00000-0000"
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPersonModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#1A56DB] hover:bg-[#1546AF] text-white text-xs"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Colaborador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PeopleRolesTab
