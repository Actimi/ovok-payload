import * as migration_20260515_193618_initial from './20260515_193618_initial';

export const migrations = [
  {
    up: migration_20260515_193618_initial.up,
    down: migration_20260515_193618_initial.down,
    name: '20260515_193618_initial'
  },
];
