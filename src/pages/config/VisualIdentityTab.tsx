import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOrganization } from '@/services/csctiService'
import type { OrganizationItem } from '@/types/cscti'
import { useToast } from '@/hooks/use-toast'
import { Palette, Eye, Save, Loader2, Sparkles } from 'lucide-react'

interface VisualIdentityTabProps {
  organization: OrganizationItem
  onUpdated: () => Promise<void>
  readOnly?: boolean
}

export const VisualIdentityTab: React.FC<VisualIdentityTabProps> = ({
  organization,
  onUpdated,
  readOnly = false,
}) => {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const [productName, setProductName] = useState(
    organization.app_product_name || 'CSCTI — Compliance Platform V2',
  )
  const [headerTitle, setHeaderTitle] = useState(
    organization.app_header_title || 'Governança, conformidade e gestão institucional',
  )
  const [institutionalText, setInstitutionalText] = useState(
    organization.app_institutional_text ||
      'Serventia Extrajudicial em Conformidade com o Provimento 243/2026 CNJ',
  )

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
                Texto Institucional / Referência Normativa
              </Label>
              <Input
                value={institutionalText}
                onChange={(e) => setInstitutionalText(e.target.value)}
                disabled={readOnly}
                placeholder="Serventia Extrajudicial em Conformidade com o Provimento 243/2026 CNJ"
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
                <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                  C
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {productName || 'CSCTI'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {headerTitle || 'Governança, conformidade e gestão institucional'}
                  </p>
                </div>
              </div>
            </div>

            {!readOnly && (
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs h-10 px-6 font-semibold"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Atualizando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar Identidade Visual
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
