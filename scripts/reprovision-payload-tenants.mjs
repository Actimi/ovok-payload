#!/usr/bin/env node
/**
 * Re-provision Payload CMS tenants from the control plane registry.
 *
 * Usage:
 *   OVOK_INTERNAL_API_KEY=... \
 *   OVOK_CONTROL_PLANE_URL=http://localhost:4001 \
 *   OVOK_CMS_URL=http://localhost:3000 \
 *   node scripts/reprovision-payload-tenants.mjs
 *
 * Optional:
 *   ENVIRONMENTS=dev,staging,prod   (default: dev)
 *   PROJECT_SLUG=actimi             (only one project)
 *   DRY_RUN=1                         (list only, no writes)
 */
const INTERNAL_KEY = process.env.OVOK_INTERNAL_API_KEY ?? process.env.PAYLOAD_INTERNAL_API_KEY
const CONTROL_PLANE_URL = (
  process.env.OVOK_CONTROL_PLANE_URL ??
  (process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : 'http://localhost:4001')
).replace(/\/$/, '')
const CMS_URL = (process.env.OVOK_CMS_URL ?? process.env.PAYLOAD_CMS_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)
const ENVIRONMENTS = (process.env.ENVIRONMENTS ?? 'dev').split(',').map((v) => v.trim())
const PROJECT_SLUG = process.env.PROJECT_SLUG
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

if (!INTERNAL_KEY) {
  console.error('Missing OVOK_INTERNAL_API_KEY or PAYLOAD_INTERNAL_API_KEY')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'x-ovok-internal-key': INTERNAL_KEY,
}

const provisionTenant = async ({ slug, medplumProjectId }) => {
  const response = await fetch(`${CMS_URL}/api/_ovok/tenants/provision`, {
    body: JSON.stringify({ slug, active: true, medplumProjectId }),
    headers,
    method: 'POST',
  })

  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }

  if (!response.ok) {
    throw new Error(`CMS provision failed (${response.status}): ${text}`)
  }

  return json
}

const enableEnvironment = async ({ slug, environment }) => {
  const response = await fetch(`${CONTROL_PLANE_URL}/v1/projects/${slug}/environments`, {
    body: JSON.stringify({ environment }),
    headers,
    method: 'POST',
  })

  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }

  if (!response.ok) {
    throw new Error(`Enable environment failed (${response.status}): ${text}`)
  }

  return json
}

const listProjects = async () => {
  const response = await fetch(`${CONTROL_PLANE_URL}/v1/projects`, { headers })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`List projects failed (${response.status}): ${text}`)
  }

  const json = JSON.parse(text)
  return json.projects ?? []
}

const main = async () => {
  console.log(`Control plane: ${CONTROL_PLANE_URL}`)
  console.log(`CMS:           ${CMS_URL}`)
  console.log(`Environments:  ${ENVIRONMENTS.join(', ')}`)
  if (DRY_RUN) {
    console.log('DRY_RUN enabled — no writes')
  }

  const projects = await listProjects()
  const targets = PROJECT_SLUG ? projects.filter((p) => p.slug === PROJECT_SLUG) : projects

  if (PROJECT_SLUG && targets.length === 0) {
    throw new Error(`Project not found in control plane: ${PROJECT_SLUG}`)
  }

  console.log(`\nFound ${targets.length} project(s)\n`)

  let ok = 0
  let failed = 0

  for (const project of targets) {
    console.log(`→ ${project.slug} (${project.medplumProjectId})`)

    if (DRY_RUN) {
      continue
    }

    try {
      const provisioned = await provisionTenant({
        slug: project.slug,
        medplumProjectId: project.medplumProjectId,
      })
      console.log(
        `  CMS tenant: ${provisioned.created ? 'created' : 'updated'} (id=${provisioned.tenant?.id})`,
      )
    } catch (error) {
      failed++
      console.error(`  CMS tenant FAILED: ${error instanceof Error ? error.message : error}`)
      continue
    }

    for (const environment of ENVIRONMENTS) {
      try {
        const result = await enableEnvironment({ slug: project.slug, environment })
        console.log(
          `  env ${environment}: ${result.provisioned ? 'provisioned' : 'already active'} (${result.environment?.status})`,
        )
      } catch (error) {
        failed++
        console.error(
          `  env ${environment} FAILED: ${error instanceof Error ? error.message : error}`,
        )
      }
    }

    ok++
  }

  console.log(`\nDone. Projects processed: ${ok}, failures: ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
