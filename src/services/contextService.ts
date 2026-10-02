import pb from '@/lib/pocketbase/client'

export type ContextSource = 'chatgpt' | 'claude' | 'gemini' | 'manual' | 'vm'

export interface ContextItem {
  id: string
  title: string
  summary: string
  content: string
  source: ContextSource
  tags: string[]
  owner_id: string
  images?: string[]
  created: string
  updated: string
}

export interface ActivityItem {
  id: string
  user_id: string
  context_id?: string
  action: 'created' | 'updated' | 'exported' | 'deleted'
  description: string
  created: string
  updated: string
}

export interface UserItem {
  id: string
  email: string
  name: string
  avatar?: string
  verified?: boolean
}

export async function getCurrentUser(): Promise<UserItem | null> {
  const model = pb.authStore.record
  if (!model || !pb.authStore.isValid) return null
  return {
    id: model.id,
    email: model.email,
    name: model.name || model.email.split('@')[0],
    avatar: model.avatar,
    verified: model.verified,
  }
}

export async function logActivity(
  action: ActivityItem['action'],
  description: string,
  contextId?: string,
) {
  const user = pb.authStore.record
  if (!user) return
  try {
    await pb.collection('activities').create({
      user_id: user.id,
      context_id: contextId || null,
      action,
      description,
    })
  } catch (err) {
    console.error('Falha ao registrar atividade:', err)
  }
}

export async function listContexts(options?: {
  search?: string
  source?: string
  sort?: string
}): Promise<ContextItem[]> {
  const filters: string[] = []

  if (options?.source && options.source !== 'all') {
    filters.push(`source = '${options.source}'`)
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.trim().replace(/['"\\]/g, '')
    filters.push(`(title ~ '${q}' || summary ~ '${q}' || content ~ '${q}')`)
  }

  const sort = options?.sort || '-created'

  const records = await pb.collection('contexts').getFullList({
    filter: filters.length > 0 ? filters.join(' && ') : undefined,
    sort,
  })

  return records.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary || '',
    content: r.content,
    source: r.source as ContextSource,
    tags: Array.isArray(r.tags) ? r.tags : [],
    owner_id: r.owner_id,
    images: Array.isArray(r.images) ? r.images : r.images ? [r.images] : [],
    created: r.created,
    updated: r.updated,
  }))
}

export async function getContextById(id: string): Promise<ContextItem> {
  const r = await pb.collection('contexts').getOne(id)
  return {
    id: r.id,
    title: r.title,
    summary: r.summary || '',
    content: r.content,
    source: r.source as ContextSource,
    tags: Array.isArray(r.tags) ? r.tags : [],
    owner_id: r.owner_id,
    images: Array.isArray(r.images) ? r.images : r.images ? [r.images] : [],
    created: r.created,
    updated: r.updated,
  }
}

export async function createContext(data: {
  title: string
  summary: string
  content: string
  source: ContextSource
  tags: string[]
  files?: File[]
}): Promise<ContextItem> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')

  let recordData: FormData | Record<string, unknown>

  if (data.files && data.files.length > 0) {
    const form = new FormData()
    form.append('title', data.title)
    form.append('summary', data.summary)
    form.append('content', data.content)
    form.append('source', data.source)
    form.append('tags', JSON.stringify(data.tags))
    form.append('owner_id', user.id)
    for (const f of data.files) {
      form.append('images', f)
    }
    recordData = form
  } else {
    recordData = {
      title: data.title,
      summary: data.summary,
      content: data.content,
      source: data.source,
      tags: data.tags,
      owner_id: user.id,
    }
  }

  const created = await pb.collection('contexts').create(recordData)
  await logActivity('created', `Criou o contexto "${data.title}"`, created.id)

  return {
    id: created.id,
    title: created.title,
    summary: created.summary || '',
    content: created.content,
    source: created.source as ContextSource,
    tags: Array.isArray(created.tags) ? created.tags : [],
    owner_id: created.owner_id,
    images: Array.isArray(created.images) ? created.images : created.images ? [created.images] : [],
    created: created.created,
    updated: created.updated,
  }
}

export async function updateContext(
  id: string,
  data: {
    title: string
    summary: string
    tags: string[]
  },
): Promise<ContextItem> {
  const updated = await pb.collection('contexts').update(id, {
    title: data.title,
    summary: data.summary,
    tags: data.tags,
  })

  await logActivity('updated', `Atualizou o contexto "${data.title}"`, id)

  return {
    id: updated.id,
    title: updated.title,
    summary: updated.summary || '',
    content: updated.content,
    source: updated.source as ContextSource,
    tags: Array.isArray(updated.tags) ? updated.tags : [],
    owner_id: updated.owner_id,
    images: Array.isArray(updated.images) ? updated.images : updated.images ? [updated.images] : [],
    created: updated.created,
    updated: updated.updated,
  }
}

export async function deleteContext(id: string, title?: string): Promise<void> {
  await pb.collection('contexts').delete(id)
  await logActivity('deleted', `Excluiu o contexto "${title || id}"`)
}

export async function listActivities(
  page: number = 1,
  perPage: number = 20,
): Promise<{
  items: ActivityItem[]
  totalItems: number
  totalPages: number
}> {
  const res = await pb.collection('activities').getList(page, perPage, {
    sort: '-created',
  })

  return {
    items: res.items.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      context_id: r.context_id,
      action: r.action as ActivityItem['action'],
      description: r.description,
      created: r.created,
      updated: r.updated,
    })),
    totalItems: res.totalItems,
    totalPages: res.totalPages,
  }
}

export function exportContextAsJson(context: ContextItem) {
  const exportPayload = {
    titulo: context.title,
    resumo: context.summary,
    origem: context.source,
    tags: context.tags,
    conteudo: context.content,
    criado_em: context.created,
    atualizado_em: context.updated,
  }

  const jsonStr = JSON.stringify(exportPayload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const slug =
    context.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'contexto'

  const a = document.createElement('a')
  a.href = url
  a.download = `contexto-${slug}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  logActivity('exported', `Exportou o contexto "${context.title}"`, context.id)
}

// AI Client Helpers
export async function generateAiSummary(
  content: string,
  source: ContextSource,
): Promise<{
  title: string
  summary: string
  tags: string[]
}> {
  const res = await pb.send('/backend/v1/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ content, source }),
  })
  return res as { title: string; summary: string; tags: string[] }
}

export async function analyzeContextWithAi(params: {
  title: string
  summary: string
  content: string
  action?: 'bullets' | 'tasks' | 'simple' | 'next_steps'
  customQuestion?: string
}): Promise<string> {
  const res = await pb.send('/backend/v1/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  return (res as { result: string }).result || ''
}
