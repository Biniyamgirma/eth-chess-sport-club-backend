#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8a273e2b5149054785234109722f852375e2b6caf1600ec4d55893d0305070ff/contract';
import endContract from '../../snapshots/8a273e2b5149054785234109722f852375e2b6caf1600ec4d55893d0305070ff/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/be2f2aee5e2dfe3158ba99672d0b6377905cfc1176cc630db4531dde8966d08b/contract';
import startContract from '../../snapshots/be2f2aee5e2dfe3158ba99672d0b6377905cfc1176cc630db4531dde8966d08b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'brilliant_move_submission',
        column: col('is_deleted', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'invoice',
        column: col('payment_proof_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'match_history',
        column: col('price_per_min', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'venue',
        column: col('price_per_min', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
