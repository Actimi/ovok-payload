import fs from 'node:fs'
import path from 'node:path'
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Build the sidebar for a given env tier. Each tier owns its own folder
 * under docs/<envKey>/ and gets the same structure: Intro, Platform,
 * Surfaces, Content (CMS), High Level API, FHIR API.
 */
export function buildSidebar(envKey: string): SidebarsConfig {
  const envDir = path.join(__dirname, '..', 'docs', envKey)

  const items: NonNullable<SidebarsConfig['docs']> = ['intro']

  if (existsAny(path.join(envDir, 'platform'))) {
    items.push({
      type: 'category',
      label: 'Platform',
      collapsed: false,
      items: [
        'platform/overview',
        'platform/public-api',
        'platform/environments',
        'platform/payload-stack',
        'platform/deployment',
      ],
    })
  }

  if (existsAny(path.join(envDir, 'surfaces'))) {
    items.push({
      type: 'category',
      label: 'Surfaces',
      collapsed: false,
      items: ['surfaces/console', 'surfaces/data-dashboard'],
    })
  }

  if (existsAny(path.join(envDir, 'cms'))) {
    items.push({
      type: 'category',
      label: 'Content (CMS)',
      collapsed: false,
      items: [
        'cms/index',
        'cms/enable',
        'cms/environments',
        'cms/authoring',
        'cms/public-delivery',
        'cms/api-keys',
      ],
    })
  }

  const stabilityPath = path.join(envDir, 'api', 'stability.mdx')
  if (fs.existsSync(stabilityPath)) {
    items.push({ type: 'doc', id: 'api/stability', label: 'API stability' })
  }

  const highLevelJson = path.join(envDir, 'api', 'high-level', 'sidebar.json')
  if (fs.existsSync(highLevelJson)) {
    items.push({
      type: 'category',
      label: 'High Level API',
      collapsed: true,
      items: JSON.parse(fs.readFileSync(highLevelJson, 'utf8')),
    })
  }

  const fhirJson = path.join(envDir, 'api', 'fhir', 'sidebar.json')
  if (fs.existsSync(fhirJson)) {
    items.push({
      type: 'category',
      label: 'FHIR API',
      collapsed: true,
      items: JSON.parse(fs.readFileSync(fhirJson, 'utf8')),
    })
  }

  return { docs: items }
}

function existsAny(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory()
  } catch {
    return false
  }
}
