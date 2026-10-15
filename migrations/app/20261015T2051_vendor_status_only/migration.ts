#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c8c5710222a03650944964751dcebf0b26eba58a7795dfe1dedbe1ab4f1a3577/contract';
import endContract from '../../snapshots/c8c5710222a03650944964751dcebf0b26eba58a7795dfe1dedbe1ab4f1a3577/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d26f96d052b41b1e4ff69283e910a44164b7cb367e23ccb595ff9c737c9436e0/contract';
import startContract from '../../snapshots/d26f96d052b41b1e4ff69283e910a44164b7cb367e23ccb595ff9c737c9436e0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'vendor',
        column: col('status', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
