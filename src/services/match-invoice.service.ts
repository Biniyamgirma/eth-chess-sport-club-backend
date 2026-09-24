import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const memberName = (member: any) =>
  [member.f_name, member.l_name].filter(Boolean).join(' ') || member.phone || member.id;

const findMember = async (memberId?: string, phone?: string) => {
  const member = memberId
    ? await orm.public.Member.where({ id: memberId }).first()
    : await orm.public.Member.where({ phone }).first();

  if (!member || member.is_deleted === 1) {
    throw new AppError('Member not found or deleted', 404);
  }

  return member;
};

const getInvoice = async (invoiceId: number) => {
  const invoice = await orm.public.Invoice.where({ id: invoiceId }).first();
  if (!invoice || invoice.payment_type !== 'match') {
    throw new AppError('Match invoice not found', 404);
  }

  return invoice;
};

const ensureVendorOwnsMatches = async (vendorId: number, matches: any[]) => {
  for (const match of matches) {
    const venue = await orm.public.Venue.where({ id: Number(match.venue_id) }).first();
    if (!venue || Number(venue.vendor_id) !== vendorId) {
      throw new AppError('Forbidden: invoice includes a venue you do not own', 403);
    }
  }
};

const formatInvoice = (invoice: any, matches: any[], member: any) => ({
  ...invoice,
  member: { id: member.id, phone: member.phone, name: memberName(member) },
  match_count: matches.length,
  total_cents: Number(invoice.total_min ?? 0),
  paid_cents: Number(invoice.paid_in_amount ?? 0),
  total_amount: Number(invoice.total_min ?? 0) / 100,
  paid_amount: Number(invoice.paid_in_amount ?? 0) / 100,
});

export const matchInvoiceService = {
  async createInvoice(
    input: { member_id?: string; phone?: string; venue_id?: number },
    actor: { role: string; id: number | string },
  ) {
    if (actor.role === 'vendor' && typeof input.venue_id === 'undefined') {
      throw new AppError('Venue is required when a vendor generates an invoice', 400);
    }

    const member = await findMember(input.member_id, input.phone);
    const allMatches = await orm.public.MatchHistory.all();
    const matches = allMatches.filter((match: any) => (
      (match.white_player_id === member.id || match.black_player_id === member.id) &&
      Boolean(match.game_end_at) &&
      !match.invoice_id &&
      (typeof input.venue_id === 'undefined' || Number(match.venue_id) === input.venue_id)
    ));

    if (matches.length === 0) {
      throw new AppError('No unbilled completed matches found for this member', 400);
    }
    if (actor.role === 'vendor') {
      await ensureVendorOwnsMatches(Number(actor.id), matches);
    }

    const totalCents = matches.reduce((sum: number, match: any) => sum + Number(match.venue_fee ?? 0), 0);
    const now = new Date();
    const invoice = await orm.public.Invoice.create({
      payment_type: 'match',
      paid_in_date: null,
      total_min: totalCents,
      paid_in_amount: 0,
      payment_status: 'pending',
      payment_method: null,
      payment_proof_url: null,
      member_id: member.id,
      venue_id: input.venue_id ?? (matches.length === 1 ? matches[0].venue_id : null),
      approved_by: actor.role === 'admin' ? Number(actor.id) : null,
      createdAt: now,
      updatedAt: now,
    });

    for (const match of matches) {
      await orm.public.MatchHistory.where({ id: match.id }).update({ invoice_id: invoice.id, updatedAt: now });
    }

    return formatInvoice(invoice, matches, member);
  },

  async updateStatus(invoiceId: number, status: 'paid' | 'canceled', actor: { role: string; id: number | string }) {
    const invoice = await getInvoice(invoiceId);
    const matches = await orm.public.MatchHistory.where({ invoice_id: invoice.id }).all();
    if (actor.role === 'vendor') {
      await ensureVendorOwnsInvoiceVenue(Number(actor.id), invoice);
      if (matches.length > 0) {
        await ensureVendorOwnsMatches(Number(actor.id), matches);
      }
    }

    const now = new Date();
    const updatedInvoice = await orm.public.Invoice.where({ id: invoice.id }).update({
      payment_status: status,
      paid_in_date: status === 'paid' ? now : null,
      approved_by: actor.role === 'admin' ? Number(actor.id) : invoice.approved_by ?? null,
      updatedAt: now,
    });

    if (status === 'canceled') {
      for (const match of matches) {
        await orm.public.MatchHistory.where({ id: match.id }).update({ invoice_id: null, updatedAt: now });
      }
    }

    const memberId = invoice.member_id ?? matches[0]?.white_player_id ?? matches[0]?.black_player_id;
    const member = memberId ? await findMember(String(memberId)) : { id: null, phone: null };
    return formatInvoice(updatedInvoice, status === 'canceled' ? [] : matches, member);
  },
};

const ensureVendorOwnsInvoiceVenue = async (vendorId: number, invoice: any) => {
  if (!invoice.venue_id) {
    throw new AppError('Vendor invoice must belong to a venue', 403);
  }

  const venue = await orm.public.Venue.where({ id: Number(invoice.venue_id) }).first();
  if (!venue || Number(venue.vendor_id) !== vendorId) {
    throw new AppError('Forbidden: you do not own this venue', 403);
  }
};