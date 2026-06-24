#!/usr/bin/env node
/**
 * Stage the full written Ovok docs tree for publish-ovok-docs.yml.
 * Source: docs/ovok-docs/{env}/ → staging/docs/{env}/
 *         docs/ovok-docs/sidebars/ → staging/sidebars/
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const ENV_KEY = process.env.ENV_KEY ?? 'dev'

const sourceEnvDir = join(REPO_ROOT, 'docs', 'ovok-docs', ENV_KEY)
const stagingRoot = join(REPO_ROOT, 'staging')
const stagingEnvDir = join(stagingRoot, 'docs', ENV_KEY)
const stagingSidebars = join(stagingRoot, 'sidebars')

if (!existsSync(sourceEnvDir)) {
  console.error(`Missing source docs folder: ${sourceEnvDir}`)
  process.exit(1)
}

rmSync(stagingRoot, { recursive: true, force: true })
mkdirSync(stagingEnvDir, { recursive: true })

cpSync(sourceEnvDir, stagingEnvDir, { recursive: true })

const sidebarSource = join(REPO_ROOT, 'docs', 'ovok-docs', 'sidebars', '_factory.ts')
if (existsSync(sidebarSource)) {
  mkdirSync(stagingSidebars, { recursive: true })
  cpSync(sidebarSource, join(stagingSidebars, '_factory.ts'))
}

const sections = readdirSync(stagingEnvDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

console.log(`Staged Ovok docs for env "${ENV_KEY}": ${sections.join(', ')}`)

