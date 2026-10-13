import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/csctiService'
import type { EvidenciaItem, EvidenciaCategoriaItem, CentralEvidenciaStatus } from '@/types/cscti'

/**
 * 1. Categorias de Evidências
 */

export async function listEvidenciaCategorias(
  orgId: string,
  apenasAtivas = false,
): Promise<EvidenciaCategoriaItem[]> {
  try {
    const filters: string[] = [`organization = '${orgId}'`]
    if (apenasAtivas) {
      filters.push("status = 'ativo'")
    }

    const records = await pb
      .collection('evidencia_categorias')
      .getFullList<EvidenciaCategoriaItem>({
        filter: filters.join(' && '),
        sort: 'ordem,name',
      })
    return records
  } catch (err) {
    console.error('Erro ao listar evidencia_categorias:', err)
    return []
  }
}

export async function saveEvidenciaCategoria(
  orgId: string,
  data: Partial<EvidenciaCategoriaItem> & { name: string },
): Promise<EvidenciaCategoriaItem> {
  const payload = {
    organization: orgId,
    name: data.name.trim(),
    code:
      data.code?.trim() ||
      data.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_'),
    description: data.description?.trim() || '',
    icone: data.icone || 'Folder',
    ordem: typeof data.ordem === 'number' ? data.ordem : 100,
    status: data.status || 'ativo',
  }

  let res: EvidenciaCategoriaItem
  if (data.id) {
    res = await pb
      .collection('evidencia_categorias')
      .update<EvidenciaCategoriaItem>(data.id, payload)
    await logAudit({
      action: 'EVIDENCIA_CATEGORIA_UPDATE',
      entity: 'Central de Evidências',
      detail: `Categoria de evidência atualizada: ${res.name}`,
      organizationId: orgId,
      metadata: { categoria_id: res.id, name: res.name },
    })
  } else {
    res = await pb.collection('evidencia_categorias').create<EvidenciaCategoriaItem>(payload)
    await logAudit({
      action: 'EVIDENCIA_CATEGORIA_CREATE',
      entity: 'Central de Evidências',
      detail: `Nova categoria de evidência criada: ${res.name}`,
      organizationId: orgId,
      metadata: { categoria_id: res.id, name: res.name },
    })
  }
  return res
}

export async function deleteEvidenciaCategoria(
  id: string,
  orgId: string,
  categoriaNome?: string,
): Promise<void> {
  await pb.collection('evidencia_categorias').delete(id)
  await logAudit({
    action: 'EVIDENCIA_CATEGORIA_DELETE',
    entity: 'Central de Evidências',
    detail: `Categoria de evidência excluída: ${categoriaNome || id}`,
    organizationId: orgId,
    metadata: { categoria_id: id },
  })
}

/**
 * 2. Evidências (CRUD + Upload Múltiplo + RLS + Auditoria)
 */

export interface ListEvidenciasParams {
  categoria?: string
  status?: string
  search?: string
  ativoId?: string
}

export async function listEvidencias(
  orgId: string,
  params?: ListEvidenciasParams,
): Promise<EvidenciaItem[]> {
  try {
    const filters: string[] = [`organization = '${orgId}'`]

    if (params?.categoria && params.categoria !== 'todas') {
      const catSafe = params.categoria.replace(/['"\\]/g, '')
      filters.push(`(categoria = '${catSafe}' || categoria_nome = '${catSafe}')`)
    }

    if (params?.status && params.status !== 'todos') {
      filters.push(`status = '${params.status}'`)
    }

    if (params?.ativoId && params.ativoId !== 'todos') {
      filters.push(`ativo_vinculado = '${params.ativoId}'`)
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().replace(/['"\\]/g, '')
      filters.push(
        `(titulo ~ '${q}' || descricao ~ '${q}' || responsavel_registro ~ '${q}' || categoria_nome ~ '${q}')`,
      )
    }

    const records = await pb.collection('evidencias').getFullList<EvidenciaItem>({
      filter: filters.join(' && '),
      sort: '-data_evidencia,-created',
      expand: 'categoria,ativo_vinculado',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar evidencias:', err)
    return []
  }
}

export async function getEvidenciaById(id: string): Promise<EvidenciaItem | null> {
  try {
    return await pb.collection('evidencias').getOne<EvidenciaItem>(id, {
      expand: 'categoria,ativo_vinculado',
    })
  } catch (err) {
    console.error('Erro ao buscar evidencia:', err)
    return null
  }
}

export interface SaveEvidenciaPayload {
  id?: string
  categoria?: string
  categoria_nome: string
  titulo: string
  descricao?: string
  data_evidencia: string
  responsavel_registro: string
  tags?: string[]
  ativo_vinculado?: string | null
  status: CentralEvidenciaStatus
  observacoes_revisao?: string
  arquivosNovos?: File[]
  arquivosExistentes?: string[]
}

export async function saveEvidencia(
  orgId: string,
  data: SaveEvidenciaPayload,
): Promise<EvidenciaItem> {
  const formData = new FormData()

  formData.append('organization', orgId)
  if (data.categoria) {
    formData.append('categoria', data.categoria)
  }
  formData.append('categoria_nome', data.categoria_nome)
  formData.append('titulo', data.titulo.trim())
  formData.append('descricao', (data.descricao || '').trim())
  formData.append('data_evidencia', data.data_evidencia)
  formData.append('responsavel_registro', data.responsavel_registro.trim())
  formData.append('tags', JSON.stringify(data.tags || []))
  formData.append('status', data.status || 'conforme')
  formData.append('observacoes_revisao', (data.observacoes_revisao || '').trim())

  if (data.ativo_vinculado) {
    formData.append('ativo_vinculado', data.ativo_vinculado)
  } else {
    formData.append('ativo_vinculado', '')
  }

  // Upload dos novos arquivos
  if (data.arquivosNovos && data.arquivosNovos.length > 0) {
    for (const file of data.arquivosNovos) {
      formData.append('arquivos', file)
    }
  }

  let res: EvidenciaItem
  if (data.id) {
    // Ao atualizar, PocketBase requer tratar os arquivos já existentes
    if (data.arquivosExistentes) {
      for (const f of data.arquivosExistentes) {
        formData.append('arquivos', f)
      }
    }

    res = await pb.collection('evidencias').update<EvidenciaItem>(data.id, formData, {
      expand: 'categoria,ativo_vinculado',
    })

    await logAudit({
      action: 'EVIDENCIA_UPDATE',
      entity: 'Central de Evidências',
      detail: `Evidência atualizada: "${res.titulo}" (${res.categoria_nome}) - Status: ${res.status}`,
      organizationId: orgId,
      metadata: {
        evidencia_id: res.id,
        titulo: res.titulo,
        categoria: res.categoria_nome,
        total_arquivos: res.arquivos?.length || 0,
      },
    })
  } else {
    res = await pb.collection('evidencias').create<EvidenciaItem>(formData, {
      expand: 'categoria,ativo_vinculado',
    })

    await logAudit({
      action: 'EVIDENCIA_CREATE',
      entity: 'Central de Evidências',
      detail: `Nova evidência registrada: "${res.titulo}" (${res.categoria_nome}) por ${res.responsavel_registro}`,
      organizationId: orgId,
      metadata: {
        evidencia_id: res.id,
        titulo: res.titulo,
        categoria: res.categoria_nome,
        total_arquivos: res.arquivos?.length || 0,
      },
    })
  }

  return res
}

export async function deleteEvidencia(id: string, orgId: string, titulo?: string): Promise<void> {
  await pb.collection('evidencias').delete(id)
  await logAudit({
    action: 'EVIDENCIA_DELETE',
    entity: 'Central de Evidências',
    detail: `Evidência excluída: "${titulo || id}"`,
    organizationId: orgId,
    metadata: { evidencia_id: id },
  })
}

/**
 * Retorna a URL absoluta de um arquivo anexado à evidência
 */
export function getEvidenciaFileUrl(
  record: EvidenciaItem,
  filename: string,
  thumb?: string,
): string {
  if (!filename) {
    // Se não tiver arquivo direto, verificar se é uma evidência ilustrativa semeada
    if (record?.titulo?.startsWith('Ilustração —') || record?.tags?.includes('ilustracao')) {
      const tit = (record.titulo || '').toLowerCase()
      if (tit.includes('rack')) return '/illustrations/ilustracao-rack.svg'
      if (tit.includes('nobreak')) return '/illustrations/ilustracao-nobreak.svg'
      if (tit.includes('gerador')) return '/illustrations/ilustracao-gerador.svg'
      if (tit.includes('ar-condicionado') || tit.includes('climatiz'))
        return '/illustrations/ilustracao-ar-condicionado.svg'
      if (tit.includes('extintor')) return '/illustrations/ilustracao-extintor.svg'
      if (tit.includes('servidor')) return '/illustrations/ilustracao-servidores.svg'
      if (tit.includes('switch') || tit.includes('rede'))
        return '/illustrations/ilustracao-switches.svg'
      if (tit.includes('sala de ti') || tit.includes('sala_ti'))
        return '/illustrations/ilustracao-sala-ti.svg'
    }
    return ''
  }
  if (filename.startsWith('ilustracao-') && filename.endsWith('.svg')) {
    return `/illustrations/${filename}`
  }
  return pb.files.getURL(record as any, filename, thumb ? { thumb } : undefined)
}
