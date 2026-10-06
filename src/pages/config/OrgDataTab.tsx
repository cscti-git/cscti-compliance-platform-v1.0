import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { updateOrganization } from '@/services/csctiService'
import type {
  OrganizationItem,
  OrganizationTypeItem,
  InstitutionalServiceItem,
} from '@/types/cscti'
import { useToast } from '@/hooks/use-toast'
import { Building2, MapPin, Save, Loader2, Award, CheckCircle } from 'lucide-react'

interface OrgDataTabProps {
  organization: OrganizationItem
  types: OrganizationTypeItem[]
  services: InstitutionalServiceItem[]
  onUpdated: () => Promise<void>
  readOnly?: boolean
}

export const OrgDataTab: React.FC<OrgDataTabProps> = ({
  organization,
  types,
  services,
  onUpdated,
  readOnly = false,
}) => {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState(organization.name || '')
  const [corporateName, setCorporateName] = useState(organization.corporate_name || '')
  const [tradeName, setTradeName] = useState(organization.trade_name || '')
  const [cnpj, setCnpj] = useState(organization.cnpj || '')
  const [contactName, setContactName] = useState(organization.contact_name || '')
  const [email, setEmail] = useState(organization.email || '')
  const [website, setWebsite] = useState(organization.website || '')
  const [phone, setPhone] = useState(organization.phone || '')
  const [status, setStatus] = useState<'ativa' | 'inativa'>(organization.status || 'ativa')
  const [typeId, setTypeId] = useState(organization.type || '')
  const [selectedServices, setSelectedServices] = useState<string[]>(organization.services || [])

  // Enquadramento por Classe e Subclasse
  const [provClass, setProvClass] = useState<'C1' | 'C2' | 'C3'>(
    organization.provimento_class || 'C2',
  )
  const [provSubclass, setProvSubclass] = useState<string>(organization.provimento_subclass || 'D')
  const [revenueRange, setRevenueRange] = useState(organization.revenue_range || '')
  const [stage1Days, setStage1Days] = useState(organization.deadline_stage_1_days || 240)
  const [stage2Days, setStage2Days] = useState(organization.deadline_stage_2_days || 240)

  // Localização
  const [addressType, setAddressType] = useState(organization.address_type || 'Sede Principal')
  const [zipCode, setZipCode] = useState(organization.zip_code || '')
  const [street, setStreet] = useState(organization.street || '')
  const [number, setNumber] = useState(organization.number || '')
  const [complement, setComplement] = useState(organization.complement || '')
  const [neighborhood, setNeighborhood] = useState(organization.neighborhood || '')
  const [city, setCity] = useState(organization.city || '')
  const [state, setState] = useState(organization.state || 'SP')
  const [country, setCountry] = useState(organization.country || 'Brasil')

  // Automatically update deadline days when class changes
  const handleClassChange = (newClass: 'C1' | 'C2' | 'C3') => {
    setProvClass(newClass)
    if (newClass === 'C1') {
      setStage1Days(180)
      setStage2Days(180)
      setRevenueRange('Até R$ 300.000,00 semestrais')
    } else if (newClass === 'C2') {
      setStage1Days(240)
      setStage2Days(240)
      setRevenueRange('De R$ 300.000,01 até R$ 1.500.000,00 semestrais')
    } else {
      setStage1Days(300)
      setStage2Days(300)
      setRevenueRange('Acima de R$ 1.500.000,00 semestrais')
    }
  }

  const toggleService = (srvId: string) => {
    if (selectedServices.includes(srvId)) {
      setSelectedServices(selectedServices.filter((id) => id !== srvId))
    } else {
      setSelectedServices([...selectedServices, srvId])
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome da organização é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      await updateOrganization(organization.id, {
        name: name.trim(),
        corporate_name: corporateName.trim(),
        trade_name: tradeName.trim(),
        cnpj: cnpj.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        website: website.trim(),
        phone: phone.trim(),
        status,
        type: typeId || undefined,
        services: selectedServices,
        provimento_class: provClass,
        provimento_subclass: provSubclass as any,
        revenue_range: revenueRange,
        deadline_stage_1_days: Number(stage1Days),
        deadline_stage_2_days: Number(stage2Days),
        address_type: addressType,
        zip_code: zipCode.trim(),
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
      })
      await onUpdated()
      toast({
        title: 'Sucesso',
        description: 'Dados cadastrais da organização atualizados com sucesso.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar dados da organização.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Bloco 1: Dados Gerais da Organização */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Dados da Organização (Serventia Extrajudicial)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Informações cadastrais e institucionais da serventia e do cliente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Identificação / Nome no Sistema *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                required
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Razão Social Oficial</Label>
              <Input
                placeholder="Ex: 1º Tabelionato de Notas e Protesto..."
                value={corporateName}
                onChange={(e) => setCorporateName(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nome Fantasia</Label>
              <Input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">CNPJ da Serventia</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status Operacional</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ativa' | 'inativa')}
                disabled={readOnly}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Contato / Delegatário Titular
              </Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">E-mail Institucional</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Serventia</Label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                disabled={readOnly}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione o tipo...</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Website da Serventia</Label>
              <Input
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Seleção de Serviços Institucionais */}
          <div className="pt-2">
            <Label className="text-xs font-semibold text-slate-700 mb-2 block">
              Serviços Institucionais Prestados
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {services.map((srv) => {
                const isSelected = selectedServices.includes(srv.id)
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => !readOnly && toggleService(srv.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50/70 text-blue-900 font-medium'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center text-xs shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <div>
                      <p className="font-semibold">{srv.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{srv.code}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Enquadramento de Governança */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Enquadramento da Organização
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Critérios de classe semestral por receita e prazos regimentais de cumprimento.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Classe de Receita Semestral
              </Label>
              <select
                value={provClass}
                onChange={(e) => handleClassChange(e.target.value as 'C1' | 'C2' | 'C3')}
                disabled={readOnly}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="C1">Classe 1 (C1 — até R$ 300 mil semestrais)</option>
                <option value="C2">Classe 2 (C2 — R$ 300 mil a R$ 1,5 milhão)</option>
                <option value="C3">Classe 3 (C3 — acima de R$ 1,5 milhão)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Subclasse Regimental</Label>
              <select
                value={provSubclass}
                onChange={(e) => setProvSubclass(e.target.value)}
                disabled={readOnly}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((s) => (
                  <option key={s} value={s}>
                    Subclasse {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Faixa de Receita Declarada
              </Label>
              <Input
                value={revenueRange}
                onChange={(e) => setRevenueRange(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800">
                Prazo Etapa 1 (Requisitos Básicos)
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={stage1Days}
                  onChange={(e) => setStage1Days(Number(e.target.value))}
                  disabled={readOnly}
                  className="text-xs h-9 w-28 bg-white border-slate-300"
                />
                <span className="text-xs text-slate-500">dias contados da publicação</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800">
                Prazo Etapa 2 (Requisitos Complementares)
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={stage2Days}
                  onChange={(e) => setStage2Days(Number(e.target.value))}
                  disabled={readOnly}
                  className="text-xs h-9 w-28 bg-white border-slate-300"
                />
                <span className="text-xs text-slate-500">dias contados da publicação</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 3: Localização da Organização */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Localização e Endereço da Sede
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Endereço físico e comarca da serventia extrajudicial.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo da Unidade</Label>
              <Input
                value={addressType}
                onChange={(e) => setAddressType(e.target.value)}
                disabled={readOnly}
                placeholder="Ex: Sede Principal"
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">CEP</Label>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                disabled={readOnly}
                placeholder="00000-000"
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Logradouro</Label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                disabled={readOnly}
                placeholder="Rua, Avenida, Praça..."
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Número</Label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Complemento</Label>
              <Input
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                disabled={readOnly}
                placeholder="Sala, Andar..."
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Bairro</Label>
              <Input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                disabled={readOnly}
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Cidade / UF</Label>
              <div className="flex gap-2">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={readOnly}
                  placeholder="Cidade"
                  className="text-xs h-9 bg-slate-50 border-slate-200"
                />
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={readOnly}
                  placeholder="UF"
                  className="text-xs h-9 w-14 bg-slate-50 border-slate-200 text-center uppercase"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Envio */}
      {!readOnly && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs h-10 px-6 font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando dados...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1.5" /> Alterar dados da empresa
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}
export default OrgDataTab
