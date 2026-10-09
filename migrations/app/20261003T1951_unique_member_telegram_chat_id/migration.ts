#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d77f9dcb5c3cb7413e398081bfd1fa30e02a3df14e2d95582b44e5308dc138b6/contract';
import endContract from '../../snapshots/d77f9dcb5c3cb7413e398081bfd1fa30e02a3df14e2d95582b44e5308dc138b6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fc02c4d73933378209a38092c50f4674cd0bdb3a19e95b568c61fb5f114137dd/contract';
import startContract from '../../snapshots/fc02c4d73933378209a38092c50f4674cd0bdb3a19e95b568c61fb5f114137dd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addUnique({
        schema: 'public',
        table: 'members',
        constraint: 'members_chat_id_key',
        columns: ['chat_id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
