#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/aa7efb013e57f422c972013eb145cb4934ecb241c5a57b9b448ce941ab43541e/contract';
import endContract from '../../snapshots/aa7efb013e57f422c972013eb145cb4934ecb241c5a57b9b448ce941ab43541e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d21dd6c320091e3217e4862ab494ee1f8cf6b220a0394fd9f42b56e07b3b1027/contract';
import startContract from '../../snapshots/d21dd6c320091e3217e4862ab494ee1f8cf6b220a0394fd9f42b56e07b3b1027/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'match_history',
        column: col('ideal_player_color', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
