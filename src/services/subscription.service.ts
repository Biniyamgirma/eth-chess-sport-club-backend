import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const getTier = async (tierId: number, includeDeleted = false) => {
  const tier = await orm.public.MembershipTier.where({ id: tierId }).first();
  if (!tier || (!includeDeleted && tier.is_deleted === 1)) {
    throw new AppError('Membership tier not found', 404);
  }

  return tier;
};

const getInvoice = async (invoiceId: number) => {
  const invoice = await orm.public.Invoice.where({ id: invoiceId }).first();
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  return invoice;
};

export const subscriptionService = {
  async listTiers(includeDeleted = false) {
    const tiers = await orm.public.MembershipTier.all();
    return includeDeleted ? tiers : tiers.filter((tier: any) => tier.is_deleted !== 1);
  },

  async createTier(input: { name: string; price: number; duration_days?: number }) {
    return orm.public.MembershipTier.create({
      name: input.name,
      price: input.price,
      duration_days: input.duration_days ?? null,
      is_deleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async updateTier(tierId: number, input: Record<string, any>) {
    await getTier(tierId, true);
    return orm.public.MembershipTier.where({ id: tierId }).update({
      ...(typeof input.name !== 'undefined' ? { name: input.name } : {}),
      ...(typeof input.price !== 'undefined' ? { price: input.price } : {}),
      ...(typeof input.duration_days !== 'undefined' ? { duration_days: input.duration_days } : {}),
      updatedAt: new Date(),
    });
  },

  async softDeleteTier(tierId: number) {
    await getTier(tierId);
    return orm.public.MembershipTier.where({ id: tierId }).update({
      is_deleted: 1,
      updatedAt: new Date(),
    });
  },

  async createInvoice(memberId: string, tierId: number, paymentMethod?: string) {
    const tier = await getTier(tierId);
    const now = new Date();

    return orm.public.Invoice.create({
      payment_type: 'membership',
      paid_in_date: null,
      total_min: tier.price,
      paid_in_amount: 0,
      payment_status: 'pending',
      payment_method: paymentMethod ?? null,
      payment_proof_url: null,
      approved_by: null,
      createdAt: now,
      updatedAt: now,
      subscriptions: {
        create: {
          user_id: memberId,
          tier_id: tier.id,
          start_date: null,
          end_date: null,
          subscription_status: 'pending_payment',
          status: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
    });
  },

  async submitPaymentProof(memberId: string, invoiceId: number, input: Record<string, any>) {
    const invoice = await getInvoice(invoiceId);
    const subscription = await orm.public.MemberSubscription.where({ invoice_id: invoice.id }).first();

    if (!subscription || subscription.user_id !== memberId) {
      throw new AppError('Invoice not found for this member', 404);
    }
    if (invoice.payment_status === 'confirmed') {
      throw new AppError('Payment has already been confirmed', 409);
    }

    return orm.public.Invoice.where({ id: invoice.id }).update({
      payment_proof_url: input.payment_proof_url,
      paid_in_amount: input.paid_in_amount ?? invoice.total_min,
      payment_method: input.payment_method ?? invoice.payment_method ?? null,
      payment_status: 'proof_submitted',
      paid_in_date: new Date(),
      updatedAt: new Date(),
    });
  },

  async confirmPayment(adminId: number, invoiceId: number) {
    const invoice = await getInvoice(invoiceId);
    const subscription = await orm.public.MemberSubscription.where({ invoice_id: invoice.id }).first();

    if (!subscription) {
      throw new AppError('Subscription record not found for invoice', 404);
    }
    if (invoice.payment_status === 'confirmed') {
      throw new AppError('Payment has already been confirmed', 409);
    }
    if (!invoice.payment_proof_url) {
      throw new AppError('Payment proof has not been submitted', 400);
    }

    const tier = await getTier(subscription.tier_id);
    const now = new Date();
    const endDate = tier.duration_days
      ? new Date(now.getTime() + tier.duration_days * 24 * 60 * 60 * 1000)
      : null;

    const confirmedInvoice = await orm.public.Invoice.where({ id: invoice.id }).update({
      payment_status: 'confirmed',
      approved_by: adminId,
      updatedAt: now,
    });

    const confirmedSubscription = await orm.public.MemberSubscription.where({ id: subscription.id }).update({
      subscription_status: 'active',
      status: 1,
      start_date: now,
      end_date: endDate,
      updatedAt: now,
    });

    return { invoice: confirmedInvoice, subscription: confirmedSubscription };
  },
};