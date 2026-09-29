#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8bc9ddb0021c08ac410fa1184d6f04cfd1d65f8ca6632649b1fa730b97d84557/contract';
import startContract from '../../snapshots/8bc9ddb0021c08ac410fa1184d6f04cfd1d65f8ca6632649b1fa730b97d84557/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fc02c4d73933378209a38092c50f4674cd0bdb3a19e95b568c61fb5f114137dd/contract';
import endContract from '../../snapshots/fc02c4d73933378209a38092c50f4674cd0bdb3a19e95b568c61fb5f114137dd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'club_message',
        columns: [
          col('content', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'vendor',
        column: col('chat_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
