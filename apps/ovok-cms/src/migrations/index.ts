import * as migration_20250624_000000_initial from './20250624_000000_initial'
import * as migration_20250624_120000_add_environment from './20250624_120000_add_environment'

export const migrations = [
  {
    name: '20250624_000000_initial',
    down: migration_20250624_000000_initial.down,
    up: migration_20250624_000000_initial.up,
  },
  {
    name: '20250624_120000_add_environment',
    down: migration_20250624_120000_add_environment.down,
    up: migration_20250624_120000_add_environment.up,
  },
]
