import * as migration_20250624_000000_initial from './20250624_000000_initial'
import * as migration_20250624_120000_add_environment from './20250624_120000_add_environment'
import * as migration_20250624_130000_legacy_upgrade from './20250624_130000_legacy_upgrade'
import * as migration_20250624_140000_locked_documents_rels from './20250624_140000_locked_documents_rels'
import * as migration_20260806_000000_release_notes_legal_pages from './20260806_000000_release_notes_legal_pages'

export const migrations = [
  {
    name: '20250624_000000_initial',
    down: migration_20250624_000000_initial.down,
    up: migration_20250624_000000_initial.up,
  },
  {
    name: '20250624_130000_legacy_upgrade',
    down: migration_20250624_130000_legacy_upgrade.down,
    up: migration_20250624_130000_legacy_upgrade.up,
  },
  {
    name: '20250624_120000_add_environment',
    down: migration_20250624_120000_add_environment.down,
    up: migration_20250624_120000_add_environment.up,
  },
  {
    name: '20250624_140000_locked_documents_rels',
    down: migration_20250624_140000_locked_documents_rels.down,
    up: migration_20250624_140000_locked_documents_rels.up,
  },
  {
    name: '20260806_000000_release_notes_legal_pages',
    down: migration_20260806_000000_release_notes_legal_pages.down,
    up: migration_20260806_000000_release_notes_legal_pages.up,
  },
]
