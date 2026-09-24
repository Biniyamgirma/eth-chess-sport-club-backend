import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const models = {
  district: orm.public.District,
  cancellationReason: orm.public.CancellationReason,
} as const;

type LookupType = keyof typeof models;

const getModel = (type: LookupType) => models[type];

const getRecord = async (type: LookupType, id: number) => {
  const record = await getModel(type).where({ id }).first();
  if (!record) {
    throw new AppError(`${type === 'district' ? 'District' : 'Cancellation reason'} not found`, 404);
  }

  return record;
};

export const lookupService = {
  async listActive(type: LookupType) {
    return getModel(type).where({ status: type === 'district' ? 1 : 'active' }).all();
  },

  async create(type: LookupType, name?: string) {
    return getModel(type).create({
      name: name ?? null,
      status: type === 'district' ? 1 : 'active',
    });
  },

  async update(type: LookupType, id: number, name?: string) {
    await getRecord(type, id);
    return getModel(type).where({ id }).update({
      ...(typeof name !== 'undefined' ? { name } : {}),
    });
  },

  async setActive(type: LookupType, id: number, active: boolean) {
    await getRecord(type, id);
    return getModel(type).where({ id }).update({
      status: type === 'district' ? (active ? 1 : 0) : (active ? 'active' : 'inactive'),
    });
  },
};