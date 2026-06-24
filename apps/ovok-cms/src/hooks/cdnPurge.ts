/**
 * Purge CDN cache for a media file path. Stub when CDN_PURGE_API_TOKEN is unset.
 */
export const purgeCdnPath = async (filePath: string): Promise<void> => {
  const cdnUrl = process.env.CDN_URL
  const purgeToken = process.env.CDN_PURGE_API_TOKEN
  const zoneId = process.env.CDN_ZONE_ID

  if (!cdnUrl || !purgeToken || !zoneId) {
    return
  }

  const url = new URL(filePath, cdnUrl).toString()

  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      body: JSON.stringify({ files: [url] }),
      headers: {
        Authorization: `Bearer ${purgeToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  } catch {
    // CDN purge is best-effort.
  }
}

export const mediaPathFromDoc = (doc: Record<string, unknown>): null | string => {
  if (typeof doc.filename === 'string') {
    const prefix = typeof doc.prefix === 'string' ? doc.prefix : 'media'
    return `${prefix}/${doc.filename}`
  }
  if (typeof doc.url === 'string') {
    return doc.url
  }
  return null
}
