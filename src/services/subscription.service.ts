import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { generateMemberId } from '../utils/member-id.js';

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
    const filteredTiers = includeDeleted ? {...tiers,updatedAt: tiers.updatedAt.toZonedDateTimeISO('Africa/Addis_Ababa')} : tiers.filter((tier: any) => tier.is_deleted !== 1);
    return filteredTiers;
  },

  async createTier(input: { name: string; price: number; duration_days?: number }) {
    const existingTier = await orm.public.MembershipTier.where({ name: input.name }).first();
    if (existingTier) {
      throw new AppError('Membership tier with this name already exists', 409);
    }
    const now = Temporal.Now.instant();
    return orm.public.MembershipTier.create({
      name: input.name,
      price: input.price,
      duration_days: input.duration_days ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateTier(tierId: number, input: Record<string, any>) {
    await getTier(tierId, true);
    const now = Temporal.Now.instant();
    return orm.public.MembershipTier.where({ id: tierId }).update({
      ...(typeof input.name !== 'undefined' ? { name: input.name } : {}),
      ...(typeof input.price !== 'undefined' ? { price: input.price } : {}),
      ...(typeof input.duration_days !== 'undefined' ? { duration_days: input.duration_days } : {}),
      updatedAt: now,
    });
  },

  async softDeleteTier(tierId: number) {
    await getTier(tierId);
    const now = Temporal.Now.instant();
    return orm.public.MembershipTier.where({ id: tierId }).update({
      // is_deleted: 1,
      updatedAt: now,
    });
  },

  async createInvoice(memberId: string, tierId: number, paymentMethod?: string) {
    const tier = await getTier(tierId);
    const now = Temporal.Now.instant();

    return prisma.transaction(async (tx: any) => {
      const txOrm = tx.orm as any;
      const invoice = await txOrm.public.Invoice.create({
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
      });

      const subscription = await txOrm.public.MemberSubscription.create({
        user_id: memberId,
        tier_id: tier.id,
        invoice_id: invoice.id,
        start_date: null,
        end_date: null,
        subscription_status: 'pending_payment',
        status: 0,
        createdAt: now,
        updatedAt: now,
      });

      return { ...invoice, subscriptions: [subscription] };
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
      paid_in_date: Temporal.Now.instant(),
      updatedAt: Temporal.Now.instant(),
    });
  },

  async confirmPayment(adminId: number, invoiceId: number) {
    
    return prisma.transaction(async (tx: any) => {
      const txOrm = tx.orm as any;
      const invoice = await txOrm.public.Invoice.where({ id: invoiceId }).first();
      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      const subscription = await txOrm.public.MemberSubscription.where({ invoice_id: invoice.id }).first();
      if (!subscription) {
        throw new AppError('Subscription record not found for invoice', 404);
      }
      if (invoice.payment_status === 'confirmed') {
        throw new AppError('Payment has already been confirmed', 409);
      }
      if (!invoice.payment_proof_url) {
        throw new AppError('Payment proof has not been submitted', 400);
      }

      const tier = await txOrm.public.MembershipTier.where({ id: subscription.tier_id }).first();
      // if (!tier || tier.is_deleted === 1) {
      //   throw new AppError('Membership tier not found', 404);
      // }

      const now = Temporal.Now.instant();
      const endDate= now.add({ 
  hours: (tier.duration_days * 24),
});

      const confirmedInvoice = await txOrm.public.Invoice.where({ id: invoice.id }).update({
        payment_status: 'confirmed',
        approved_by: adminId,
        updatedAt: now,
      });

      let member = null;
      let memberId = subscription.user_id;
      if (String(tier.name).trim().toLowerCase() === 'ethchess') {
        const existingMember = await txOrm.public.Member.where({ id: subscription.user_id }).first();
        if (!existingMember) {
          throw new AppError('Member not found for subscription', 404);
        }

        const newMemberId = /^ETH\d+$/.test(existingMember.id)
          ? existingMember.id
          : await generateMemberId('ETH', txOrm.public.Member);

        if (newMemberId !== existingMember.id) {
          member = await txOrm.public.Member.create({
            ...existingMember,
            id: newMemberId,
            updatedAt: now,
          });

          await txOrm.public.MemberDetails.where({ user_id: existingMember.id }).update({ user_id: newMemberId });
          await txOrm.public.MemberSubscription.where({ user_id: existingMember.id }).update({ user_id: newMemberId });
          await txOrm.public.BrilliantMoveSubmission.where({ user_id: existingMember.id }).update({ user_id: newMemberId });
          await txOrm.public.Vote.where({ user_id: existingMember.id }).update({ user_id: newMemberId });
          await txOrm.public.MatchHistory.where({ user_id: existingMember.id }).update({ user_id: newMemberId });
          await txOrm.public.MatchHistory.where({ white_player_id: existingMember.id }).update({ white_player_id: newMemberId });
          await txOrm.public.MatchHistory.where({ black_player_id: existingMember.id }).update({ black_player_id: newMemberId });
          await txOrm.public.MatchHistory.where({ winner_id: existingMember.id }).update({ winner_id: newMemberId });
          await txOrm.public.Invoice.where({ member_id: existingMember.id }).update({
            member_id: newMemberId,
            updatedAt: now,
          });
          await txOrm.public.VenueTable.where({ ideal_player: existingMember.id }).update({
            ideal_player: newMemberId,
            updatedAt: now,
          });
          await txOrm.public.Member.where({ id: existingMember.id }).delete();
          memberId = newMemberId;
        } else {
          member = existingMember;
        }
      }

      const confirmedSubscription = await txOrm.public.MemberSubscription.where({ id: subscription.id }).update({
        user_id: memberId,
        subscription_status: 'active',
        status: 1,
        start_date: now,
        end_date: endDate,
        updatedAt: now,
      });

      return { invoice: confirmedInvoice, subscription: confirmedSubscription, ...(member ? { member } : {}) };
    });
  },
};