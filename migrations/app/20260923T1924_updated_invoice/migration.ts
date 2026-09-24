#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8a273e2b5149054785234109722f852375e2b6caf1600ec4d55893d0305070ff/contract';
import startContract from '../../snapshots/8a273e2b5149054785234109722f852375e2b6caf1600ec4d55893d0305070ff/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8bc9ddb0021c08ac410fa1184d6f04cfd1d65f8ca6632649b1fa730b97d84557/contract';
import endContract from '../../snapshots/8bc9ddb0021c08ac410fa1184d6f04cfd1d65f8ca6632649b1fa730b97d84557/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'invoice',
        column: col('member_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'invoice',
        column: col('venue_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'match_history',
        column: col('invoice_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'match_history',
        index: 'match_history_invoice_id_idx_a3b7555d',
        columns: ['invoice_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'match_history',
        foreignKey: {
          name: 'match_history_invoice_id_fkey',
          columns: ['invoice_id'],
          references: { schema: 'public', table: 'invoice', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
