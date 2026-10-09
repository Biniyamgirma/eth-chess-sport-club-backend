#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d21dd6c320091e3217e4862ab494ee1f8cf6b220a0394fd9f42b56e07b3b1027/contract';
import endContract from '../../snapshots/d21dd6c320091e3217e4862ab494ee1f8cf6b220a0394fd9f42b56e07b3b1027/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d77f9dcb5c3cb7413e398081bfd1fa30e02a3df14e2d95582b44e5308dc138b6/contract';
import startContract from '../../snapshots/d77f9dcb5c3cb7413e398081bfd1fa30e02a3df14e2d95582b44e5308dc138b6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'venue_table',
        column: col('ideal_player_color', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
