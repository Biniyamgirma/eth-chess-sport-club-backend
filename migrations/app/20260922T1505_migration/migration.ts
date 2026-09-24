#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/be2f2aee5e2dfe3158ba99672d0b6377905cfc1176cc630db4531dde8966d08b/contract';
import endContract from '../../snapshots/be2f2aee5e2dfe3158ba99672d0b6377905cfc1176cc630db4531dde8966d08b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f4e1954fd8bed87828d13c3f1a02164dc9796ef1af76ed6f98184c01263169c5/contract';
import startContract from '../../snapshots/f4e1954fd8bed87828d13c3f1a02164dc9796ef1af76ed6f98184c01263169c5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);
