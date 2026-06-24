import { CACHE_PURGE_PATH, type CachePurgePayload, type Environment } from '@ovok/contracts'

import { ENVIRONMENT_FIELD_NAME } from '../plugins/ovokEnvironment'

const getOvokCoreBaseUrl = (): null | string =>
  process.env.OVOK_CORE_INTERNAL_URL ?? process.env.OVOK_CORE_CACHE_PURGE_URL ?? null

export const purgeOvokCoreCache = async (payload: CachePurgePayload): Promise<void> => {
  const baseUrl = getOvokCoreBaseUrl()
  if (!baseUrl) {
    return
  }

  const internalKey = process.env.PAYLOAD_INTERNAL_API_KEY
  if (!internalKey) {
    return
  }

  try {
    await fetch(new URL(CACHE_PURGE_PATH, baseUrl), {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'x-ovok-internal-key': internalKey,
      },
      method: 'POST',
    })
  } catch {
    // Cache purge is best-effort; ovok-core may not be deployed yet.
  }
}

const tenantIdFromDoc = (
  doc: Record<string, unknown>,
  req: { headers: Headers },
): null | string => {
  if (typeof doc.tenant === 'object' && doc.tenant && 'id' in doc.tenant) {
    return String((doc.tenant as { id: unknown }).id)
  }
  if (typeof doc.tenant === 'string' || typeof doc.tenant === 'number') {
    return String(doc.tenant)
  }
  return req.headers.get('x-ovok-tenant-id')
}

export const cacheBustAfterContentTypeChange = async ({
  doc,
  req,
}: {
  doc: Record<string, unknown>
  req: { headers: Headers }
}): Promise<void> => {
  const tenantId = tenantIdFromDoc(doc, req)
  const environment = doc[ENVIRONMENT_FIELD_NAME] as Environment | undefined

  if (!tenantId || !environment) {
    return
  }

  await purgeOvokCoreCache({
    environment,
    purgeSchema: true,
    tenantId,
  })
}

export const cacheBustAfterContentItemChange = async ({
  doc,
  req,
}: {
  doc: Record<string, unknown>
  req: {
    headers: Headers
    payload?: {
      findByID: (args: {
        collection: string
        depth: number
        id: number | string
        overrideAccess: boolean
      }) => Promise<{ slug?: string } | null>
    }
  }
}): Promise<void> => {
  const tenantId = tenantIdFromDoc(doc, req)
  const environment = doc[ENVIRONMENT_FIELD_NAME] as Environment | undefined

  if (!tenantId || !environment) {
    return
  }

  let contentTypeSlug: string | undefined
  const contentType = doc.contentType

  if (typeof contentType === 'object' && contentType && 'slug' in contentType) {
    contentTypeSlug = String((contentType as { slug: unknown }).slug)
  } else if (contentType && req.payload) {
    const resolved = await req.payload.findByID({
      id: contentType as number | string,
      collection: 'content-types',
      depth: 0,
      overrideAccess: true,
    })
    contentTypeSlug = resolved?.slug
  }

  await purgeOvokCoreCache({
    contentTypeSlug,
    environment,
    tenantId,
  })
}
