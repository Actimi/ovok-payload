const normalizeBase = (value: string) => value.replace(/\/$/, '')

export const buildCdnMediaUrl = (filename: string, prefix = 'media'): string => {
  const cdnBase = process.env.CDN_URL ? normalizeBase(process.env.CDN_URL) : null
  if (cdnBase) {
    return `${cdnBase}/${prefix}/${filename}`
  }

  const serverUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL
    ? normalizeBase(process.env.PAYLOAD_PUBLIC_SERVER_URL)
    : ''
  return `${serverUrl}/api/media/file/${filename}`
}
