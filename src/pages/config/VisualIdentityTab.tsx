import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOrganization } from '@/services/csctiService'
import type { OrganizationItem } from '@/types/cscti'
import { useToast } from '@/hooks/use-toast'
import { Palette, Eye, Save, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { CsctiLogoMark } from '@/components/CsctiLogo'
import { CSCTI_BRAND } from '@/lib/brand'

interface VisualIdentityTabProps {
  organization: OrganizationItem
  onUpdated: () => Promise<void>
  readOnly?: boolean
}

const DEFAULT_PRODUCT_NAME = CSCTI_BRAND.name
const DEFAULT_HEADER_TITLE = CSCTI_BRAND.tagline
const DEFAULT_INSTITUTIONAL_TEXT = `${CSCTI_BRAND.normativeReference} — ${CSCTI_BRAND.shortTagline}`

export const VisualIdentityTab: React.FC<VisualIdentityTabProps> = ({
  organization,
  onUpdated,
  readOnly = false,
}) => {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const [productName, setProductName] = useState(
    organization.app_product_name || DEFAULT_PRODUCT_NAME,
  )
  const [headerTitle, setHeaderTitle] = useState(
    organization.app_header_title || DEFAULT_HEADER_TITLE,
  )
  const [institutionalText, setInstitutionalText] = useState(
    organization.app_institutional_text || DEFAULT_INSTITUTIONAL_TEXT,
  )

  const handleResetToDefault = () => {
    setProductName(DEFAULT_PRODUCT_NAME)
    setHeaderTitle(DEFAULT_HEADER_TITLE)
    setInstitutionalText(DEFAULT_INSTITUTIONAL_TEXT)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateOrganization(organization.id, {
        app_product_name: productName.trim(),
        app_header_title: headerTitle.trim(),
        app_institutional_text: institutionalText.trim(),
      })
      await onUpdated()
      toast({
        title: 'Identidade Atualizada',
        description:
          'Os títulos e textos institucionais foram atualizados no cabeçalho e na barra de navegação.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar identidade visual.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Identidade Visual e Rótulos Institucionais
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Personalize os títulos do produto, textos de cabeçalho e referências do cartório
                exibidos na interface.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Nome do Produto (Exibido no Cabeçalho e Login)
              </Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={readOnly}
                placeholder="CSCTI — Compliance Platform V2"
                className="text-xs h-9 bg-slate-50 border-slate-200 font-medium"
              />
              <p className="text-[11px] text-slate-400">
                Identificador visível na barra superior e no painel esquerdo do login.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Título do Cabeçalho / Subtítulo Institucional
              </Label>
              <Input
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                disabled={readOnly}
                placeholder="Governança, conformidade e gestão institucional"
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
              <p className="text-[11px] text-slate-400">
                Subtítulo exibido logo abaixo do nome do produto no topo da aplicação.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Texto Institucional / Descrição do Cliente
              </Label>
              <Input
                value={institutionalText}
                onChange={(e) => setInstitutionalText(e.target.value)}
                disabled={readOnly}
                placeholder="Serventia Extrajudicial em Conformidade — CSCTI Compliance"
                className="text-xs h-9 bg-slate-50 border-slate-200"
              />
              <p className="text-[11px] text-slate-400">
                Destaque normativo exibido nos relatórios gerados e no painel institucional.
              </p>
            </div>

            {/* Pré-visualização ao vivo */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Pré-visualização do Topo do Sistema:</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-center gap-3">
                <CsctiLogoMark size={32} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {productName || DEFAULT_PRODUCT_NAME}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {headerTitle || DEFAULT_HEADER_TITLE}
                  </p>
                </div>
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToDefault}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                  Restaurar Padrão CSCTI
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#0B2545] hover:bg-[#07192F] text-white text-xs h-10 px-6 font-semibold shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#D4AF37]" />{' '}
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" /> Salvar Identidade
                      Visual
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
export default VisualIdentityTab
