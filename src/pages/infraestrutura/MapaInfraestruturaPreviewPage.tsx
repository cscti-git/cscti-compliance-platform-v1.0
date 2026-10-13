import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Network,
  Zap,
  Server,
  Cable,
  Printer,
  Pencil,
  Info,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Monitor,
  Flame,
  Layers,
  Sparkles,
  ArrowRight,
  Building2,
  FileDown,
} from 'lucide-react'
import {
  EQUIPAMENTOS_SIMULADOS,
  CONEXOES_SIMULADAS,
  EquipamentoSimulado,
  TipoConexao,
} from '@/components/infraestrutura/mapa/topologiaData'
import { MapaTopologiaDiagram } from '@/components/infraestrutura/mapa/MapaTopologiaDiagram'
import { MapaNodeDetailsDrawer } from '@/components/infraestrutura/mapa/MapaNodeDetailsDrawer'
import { MapaConexoesLegenda } from '@/components/infraestrutura/mapa/MapaConexoesLegenda'
import { MapaProtecaoOverlay } from '@/components/infraestrutura/mapa/MapaProtecaoOverlay'

export const MapaInfraestruturaPreviewPage: React.FC = () => {
  const { user, organization } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Estado do equipamento selecionado no modal lateral
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoSimulado | null>(
    null,
  )

  // Filtro de conexões ativas na legenda
  const [filtroConexao, setFiltroConexao] = useState<'todos' | 'eletrica' | 'fibra' | 'rede'>(
    'todos',
  )

  // Nome da serventia para cabeçalho
  const serventiaNome =
    organization?.trade_name ||
    organization?.corporate_name ||
    organization?.name ||
    'Serventia Modelo'

  // Ações de simulação nos botões da barra superior (Requisito 5)
  const handleExportarPdf = () => {
    toast({
      title: 'Exportação em PDF A4 (Simulação)',
      description:
        'Recurso disponível na versão integrada ao produto real. O layout será formatado para impressão paisagem com selo de conformidade.',
    })
  }

  const handleEditarMapa = () => {
    toast({
      title: 'Modo de Edição de Topologia (Simulação)',
      description:
        'Na versão real, administradores e suporte poderão adicionar nós, vincular ativos do GLPI por drag-and-drop e desenhar novas ramificações.',
    })
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. BANNER CLARO NO TOPO (Requisito 1) */}
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                  SIMULAÇÃO VISUAL — Rota Isolada de Preview
                </span>
                <span className="text-[11px] font-semibold text-amber-800">
                  Topologia Técnica Proposta
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-amber-950 mt-1">
                Protótipo para análise prévia de Leandro antes da integração ao produto oficial.
              </h2>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Não são dados reais da serventia. Os nós, conexões e parâmetros são exemplos
                completamente estruturados conforme o ecossistema extrajudicial especificado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/infraestrutura')}
              className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs"
            >
              Voltar à Infraestrutura Oficial
            </Button>
          </div>
        </div>
      </div>

      {/* 2. CABEÇALHO PADRONIZADO CSCTI COM BOTÕES DE AÇÃO (Requisito 5) */}
      <ModuleHeader
        icon={Network}
        title="Mapa da Infraestrutura Técnica"
        subtitle="Diagrama topológico interativo das camadas de energia, sala de servidores, interligação por fibra óptica e setores operacionais da serventia."
        badgeText="Protótipo Visual · CSCTI"
        serventiaNome={serventiaNome}
        serventiaAtiva={true}
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Ambiente', href: '/infraestrutura' },
          { label: 'Simulação: Mapa da Infraestrutura' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarPdf}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:text-slate-900 gap-1.5 shadow-2xs bg-white"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Exportar PDF A4</span>
            </Button>

            <Button
              size="sm"
              onClick={handleEditarMapa}
              className="text-xs h-8 bg-gradient-to-r from-[#0B2545] to-[#124E78] text-white hover:opacity-95 gap-1.5 shadow-2xs"
            >
              <Pencil className="w-3.5 h-3.5 text-[#F3C969]" />
              <span>Editar mapa</span>
            </Button>
          </div>
        }
      />

      {/* 3. KPIS DA TOPOLOGIA SIMULADA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Nós Mapeados"
          value={EQUIPAMENTOS_SIMULADOS.length}
          secondaryValue="equipamentos"
          supportText="6 camadas físicas e lógicas interligadas"
          icon={Layers}
          iconColor="text-blue-700"
          iconBgColor="bg-blue-100"
        />

        <KpiCard
          label="Interligação Backbone"
          value="10 Gbps"
          secondaryValue="Fibra Óptica"
          supportText="Sala de Servidores aos Racks Setoriais"
          icon={Cable}
          iconColor="text-cyan-700"
          iconBgColor="bg-cyan-100"
        />

        <KpiCard
          label="Autonomia em Nobreak"
          value="90 min"
          secondaryValue="Core + Gerador"
          supportText="Stemac 60 kVA + Nobreaks Online"
          icon={Zap}
          iconColor="text-amber-700"
          iconBgColor="bg-amber-100"
        />

        <KpiCard
          label="Status Operacional"
          value="100%"
          secondaryValue="Conforme"
          supportText="Todos os nós em regime contínuo"
          icon={CheckCircle2}
          iconColor="text-emerald-700"
          iconBgColor="bg-emerald-100"
        />
      </div>

      {/* 4. LEGENDA DE CONEXÕES COM FILTROS INTERATIVOS (Requisito 4) */}
      <MapaConexoesLegenda filtroConexao={filtroConexao} onSelectFiltro={setFiltroConexao} />

      {/* 5. DIAGRAMA TOPOLÓGICO INTERATIVO PRINCIPAL (Requisito 2 e 4) */}
      <MapaTopologiaDiagram
        onSelectEquipamento={(eq) => setEquipamentoSelecionado(eq)}
        equipamentoSelecionadoId={equipamentoSelecionado?.id || null}
        filtroConexao={filtroConexao}
      />

      {/* 6. CAMADA DE PROTEÇÃO SOBREPOSTA (Requisito 2 item final) */}
      <MapaProtecaoOverlay />

      {/* 7. PAINEL LATERAL DE DETALHES COM VÍNCULOS SIMULADOS (Requisito 3) */}
      <MapaNodeDetailsDrawer
        equipamento={equipamentoSelecionado}
        onClose={() => setEquipamentoSelecionado(null)}
      />
    </div>
  )
}

export default MapaInfraestruturaPreviewPage
