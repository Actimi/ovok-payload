import type { CollectionConfig, Config, Plugin, Where } from 'payload'

import { ENVIRONMENTS } from '@ovok/contracts'

import {
  combineWhere,
  environmentWhere,
  getEnvironmentFromRequest,
  requireEnvironmentFromRequest,
} from '../access/ovokInternal'

export const ENVIRONMENT_FIELD_NAME = 'environment'

const ENVIRONMENT_SCOPED_COLLECTIONS = [
  'content-types',
  'content-items',
  'media',
  'posts',
  'release-notes',
  'legal-pages',
] as const

type EnvironmentScopedSlug = (typeof ENVIRONMENT_SCOPED_COLLECTIONS)[number]

export interface OvokEnvironmentPluginConfig {
  collections?: EnvironmentScopedSlug[]
  enabled?: boolean
}

const addEnvironmentField = (collection: CollectionConfig): void => {
  const hasField = collection.fields.some(
    (field) => 'name' in field && field.name === ENVIRONMENT_FIELD_NAME,
  )
  if (hasField) {
    return
  }

  collection.fields.unshift({
    name: ENVIRONMENT_FIELD_NAME,
    type: 'select',
    access: {
      update: () => false,
    },
    admin: {
      description: 'Deployment environment. Set from x-ovok-environment header by the Ovok proxy.',
      position: 'sidebar',
    },
    defaultValue: 'dev',
    hooks: {
      beforeValidate: [
        ({ operation, req, value }) => {
          if (operation === 'create') {
            const fromHeader = requireEnvironmentFromRequest(req)
            if (fromHeader) {
              return fromHeader
            }
          }
          return value
        },
      ],
    },
    index: true,
    options: ENVIRONMENTS.map((value) => ({ label: value, value })),
    required: true,
  })
}

const addEnvironmentIndexes = (collection: CollectionConfig): void => {
  if (!collection.indexes) {
    collection.indexes = []
  }

  const slugIndexExists = collection.indexes.some(
    (idx) =>
      idx.unique &&
      idx.fields.includes('tenant') &&
      idx.fields.includes(ENVIRONMENT_FIELD_NAME) &&
      idx.fields.includes('slug'),
  )

  if (!slugIndexExists && collection.slug !== 'media') {
    collection.indexes.push({
      fields: ['tenant', ENVIRONMENT_FIELD_NAME, 'slug'],
      unique: true,
    })
  }

  if (['content-items', 'legal-pages', 'release-notes'].includes(collection.slug)) {
    const statusIndexExists = collection.indexes.some(
      (idx) =>
        idx.fields.includes('tenant') &&
        idx.fields.includes(ENVIRONMENT_FIELD_NAME) &&
        idx.fields.includes('status'),
    )
    if (!statusIndexExists) {
      collection.indexes.push({
        fields: ['tenant', ENVIRONMENT_FIELD_NAME, 'status'],
      })
    }
  }
}

const addEnvironmentHooks = (collection: CollectionConfig): void => {
  const existingBeforeOperation = collection.hooks?.beforeOperation ?? []

  collection.hooks = {
    ...collection.hooks,
    beforeChange: [
      ...(collection.hooks?.beforeChange ?? []),
      ({ data, operation, req }) => {
        if (operation === 'create') {
          const environment = requireEnvironmentFromRequest(req)
          if (environment) {
            return { ...data, [ENVIRONMENT_FIELD_NAME]: environment }
          }
        }
        return data
      },
    ],
    beforeOperation: [
      ...existingBeforeOperation,
      ({ args, operation, req }) => {
        if (operation !== 'read') {
          return args
        }

        const environment = getEnvironmentFromRequest(req)
        const where = environmentWhere(environment)

        if ('where' in args && args.where) {
          args.where = combineWhere(args.where, where)
        } else if ('where' in args) {
          args.where = where
        }

        return args
      },
    ],
  }
}

export const ovokEnvironmentPlugin =
  (pluginConfig: OvokEnvironmentPluginConfig = {}): Plugin =>
  (incomingConfig: Config): Config => {
    if (pluginConfig.enabled === false) {
      return incomingConfig
    }

    const targetSlugs = new Set<EnvironmentScopedSlug>(
      pluginConfig.collections ?? ENVIRONMENT_SCOPED_COLLECTIONS,
    )

    return {
      ...incomingConfig,
      collections: (incomingConfig.collections ?? []).map((collection) => {
        if (!targetSlugs.has(collection.slug as EnvironmentScopedSlug)) {
          return collection
        }

        const updated = { ...collection }
        addEnvironmentField(updated)
        addEnvironmentIndexes(updated)
        addEnvironmentHooks(updated)
        return updated
      }),
    }
  }
