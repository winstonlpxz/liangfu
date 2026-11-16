import * as migration_20261116_153030_initial from './20261116_153030_initial';
import * as migration_20261116_160522_hero_title from './20261116_160522_hero_title';
import * as migration_20261116_163007_cos_media from './20261116_163007_cos_media';

export const migrations = [
  {
    up: migration_20261116_153030_initial.up,
    down: migration_20261116_153030_initial.down,
    name: '20261116_153030_initial',
  },
  {
    up: migration_20261116_160522_hero_title.up,
    down: migration_20261116_160522_hero_title.down,
    name: '20261116_160522_hero_title',
  },
  {
    up: migration_20261116_163007_cos_media.up,
    down: migration_20261116_163007_cos_media.down,
    name: '20261116_163007_cos_media'
  },
];
