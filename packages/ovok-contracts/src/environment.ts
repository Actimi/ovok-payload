import { z } from 'zod'

export const OVOK_ENVIRONMENT_FIELD = 'environment'

export const ENVIRONMENTS = ['dev', 'staging', 'prod'] as const

export type Environment = (typeof ENVIRONMENTS)[number]

export const EnvironmentSchema = z.enum(ENVIRONMENTS)

export const isEnvironment = (value: null | string | undefined): value is Environment =>
  EnvironmentSchema.safeParse(value).success

export const parseEnvironment = (value: null | string | undefined): Environment | null => {
  const result = EnvironmentSchema.safeParse(value)
  return result.success ? result.data : null
}

export const DEFAULT_ENVIRONMENT: Environment = 'dev'
