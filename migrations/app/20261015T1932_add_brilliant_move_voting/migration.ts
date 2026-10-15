#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/aa7efb013e57f422c972013eb145cb4934ecb241c5a57b9b448ce941ab43541e/contract';
import startContract from '../../snapshots/aa7efb013e57f422c972013eb145cb4934ecb241c5a57b9b448ce941ab43541e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d26f96d052b41b1e4ff69283e910a44164b7cb367e23ccb595ff9c737c9436e0/contract';
import endContract from '../../snapshots/d26f96d052b41b1e4ff69283e910a44164b7cb367e23ccb595ff9c737c9436e0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'brilliant_move_weekly_winner',
        columns: [
          col('admin_votes', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('submission_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('total_votes', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('week_start', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'vote',
        column: col('admin_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'brilliant_move_weekly_winner',
        constraint: 'brilliant_move_weekly_winner_week_start_unique',
        columns: ['week_start'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'vote',
        constraint: 'vote_submission_admin_unique',
        columns: ['submission_id', 'admin_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'vote',
        constraint: 'vote_submission_member_unique',
        columns: ['submission_id', 'user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'brilliant_move_submission',
        index: 'brilliant_move_submission_created_at_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'brilliant_move_weekly_winner',
        index: 'brilliant_move_weekly_winner_submission_id_idx',
        columns: ['submission_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'vote',
        index: 'vote_admin_id_idx_78cc3551',
        columns: ['admin_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'brilliant_move_weekly_winner',
        foreignKey: {
          name: 'brilliant_move_weekly_winner_submission_id_fkey',
          columns: ['submission_id'],
          references: { schema: 'public', table: 'brilliant_move_submission', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'vote',
        foreignKey: {
          name: 'vote_admin_id_fkey',
          columns: ['admin_id'],
          references: { schema: 'public', table: 'admin', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
