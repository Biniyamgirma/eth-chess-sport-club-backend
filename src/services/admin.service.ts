import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { signToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';

const orm = prisma.orm as any;



export const adminService = {
  async login(fName: string, password: string) {
    const admins = await orm.public.Admin.where({ f_name: fName }).all();
    const matches = [];

    for (const admin of admins) {
      if (admin.password && await comparePassword(password, admin.password)) {
        matches.push(admin);
      }
    }

    if (matches.length !== 1) {
      throw new AppError('Invalid credentials', 401);
    }

    const admin = matches[0];
    const token = signToken({
      sub: `admin:${admin.id}`,
      role: 'admin',
      userId: admin.id,
    });

    return {
      token,
      user: {
        id: admin.id,
        role: 'admin' as const,
        f_name: admin.f_name,
        l_name: admin.l_name,
      },
    };
  },

  async getRoles() {
    // Using the Prisma 8 chaining syntax
const users = await  orm.public.AdminRole.where({ status: '1' })
  .all();

  return users.map((user: any) => ({
    id: user.id,
    name: user.name,
    status: user.status,
  }));
  },


  async register(input: { f_name: string; l_name?: string; password: string; role: number }) {
    const existingAdmins = await orm.public.Admin.where({ f_name: input.f_name }).all();
    if (existingAdmins.length > 0) {
      throw new AppError('An admin with this first name already exists', 409);
    }

    const adminRole = await orm.public.AdminRole.where({ id: input.role }).first();
    if (!adminRole) {
      throw new AppError('Admin role not found', 404);
    }
    const now = Temporal.Now.instant();
    
    const admin = await orm.public.Admin.create({
      f_name: input.f_name,
      l_name: input.l_name ?? null,
      password: await hashPassword(input.password),
      role: input.role,
      created_at: now,
      updatedAt: now,
    });

    return {
      id: admin.id,
      f_name: admin.f_name,
      l_name: admin.l_name,
      role: admin.role,
      status: admin.status,
    };
  },

  async updateAdmin(id: number, input: {
    f_name?: string;
    l_name?: string | null;
    password?: string;
    status?: number | null;
    role?: number;
  }) {
    const admin = await orm.public.Admin.where({ id }).first();
    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    if (input.f_name && input.f_name !== admin.f_name) {
      const duplicate = (await orm.public.Admin.where({ f_name: input.f_name }).all())
        .some((existing: any) => existing.id !== id);
      if (duplicate) {
        throw new AppError('An admin with this first name already exists', 409);
      }
    }

    if (input.role !== undefined) {
      const role = await orm.public.AdminRole.where({ id: input.role }).first();
      if (!role) {
        throw new AppError('Admin role not found', 404);
      }
    }

    const payload: Record<string, unknown> = {
      f_name: input.f_name,
      l_name: input.l_name,
      status: input.status,
      role: input.role,
      updatedAt: Temporal.Now.instant(),
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    if (input.password !== undefined) {
      payload.password = await hashPassword(input.password);
    }

    const updatedAdmin = await orm.public.Admin.where({ id }).update(payload);
    return {
      id: updatedAdmin.id,
      f_name: updatedAdmin.f_name,
      l_name: updatedAdmin.l_name,
      status: updatedAdmin.status,
      role: updatedAdmin.role,
    };
  },

  async createRole(input: { name: string; status?: string }) {
    const duplicate = await orm.public.AdminRole.where({ name: input.name }).first();
    if (duplicate) {
      throw new AppError('An admin role with this name already exists', 409);
    }

    return orm.public.AdminRole.create({
      name: input.name,
      status: input.status ?? null,
    });
  },

  async updateRole(id: number, input: { name?: string; status?: string }) {
    const role = await orm.public.AdminRole.where({ id }).first();
    if (!role) {
      throw new AppError('Admin role not found', 404);
    }

    if (input.name && input.name !== role.name) {
      const duplicate = await orm.public.AdminRole.where({ name: input.name }).first();
      if (duplicate) {
        throw new AppError('An admin role with this name already exists', 409);
      }
    }

    return orm.public.AdminRole.where({ id }).update(input);
  },

  async deleteRole(id: number) {
    const role = await orm.public.AdminRole.where({ id }).first();
    if (!role) {
      throw new AppError('Admin role not found', 404);
    }

    const [admins, vendors] = await Promise.all([
      orm.public.Admin.where({ role: id }).all(),
      orm.public.Vendor.where({ role: id }).all(),
    ]);
    if (admins.length > 0 || vendors.length > 0) {
      throw new AppError('Cannot delete a role that is assigned to admins or vendors', 409);
    }

    await orm.public.AdminRole.where({ id }).delete();
  },
};