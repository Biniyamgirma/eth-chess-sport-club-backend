import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const memberName = (member: any) =>
  [member.f_name, member.l_name].filter(Boolean).join(' ') || member.phone || member.id;

const findMember = async (memberId?: string, phone?: string, database = orm) => {
  const member = memberId
    ? await database.public.Member.where({ id: memberId }).first()
    : await database.public.Member.where({ phone }).first();

  if (!member || member.is_deleted === 1) {
    throw new AppError('Member not found or deleted', 404);
  }

  return member;
};

const getInvoice = async (invoiceId: number, database = orm) => {
  const invoice = await database.public.Invoice.where({ id: invoiceId }).first();
  if (!invoice || invoice.payment_type !== 'match') {
    throw new AppError('Match invoice not found', 404);
  }

  return invoice;
};

const ensureVendorOwnsMatches = async (vendorId: number, matches: any[], database = orm) => {
  for (const match of matches) {
    const venue = await database.public.Venue.where({ id: Number(match.venue_id) }).first();
    if (!venue || Number(venue.vendor_id) !== vendorId) {
      throw new AppError('Forbidden: invoice includes a venue you do not own', 403);
    }
  }
};

const formatInvoice = (
  invoice: any,
  matches: any[],
  member: any,
  items: any[] = [],
) => ({
  ...invoice,
  member: { id: member.id, phone: member.phone, name: memberName(member) },
  match_count: matches.length,
  total_minutes: items.reduce((sum, item) => sum + item.minutes, 0),
  total_amount: items.reduce((sum, item) => sum + item.amount, 0),
  paid_amount: Number(invoice.paid_in_amount ?? 0),
  matches: items,
});

const formatMatchDate = (value: any) => {
  const instant = value instanceof Temporal.Instant
    ? value
    : Temporal.Instant.from(String(value));
  const date = instant.toZonedDateTimeISO('Africa/Addis_Ababa');
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.year}-${pad(date.month)}-${pad(date.day)} ${pad(date.hour)}:${pad(date.minute)}`;
};

const invoiceItems = async (matches: any[], database = orm) => Promise.all(
  matches.map(async (match) => {
    const [white, black] = await Promise.all([
      match.white_player_id
        ? database.public.Member.where({ id: String(match.white_player_id) }).first()
        : null,
      match.black_player_id
        ? database.public.Member.where({ id: String(match.black_player_id) }).first()
        : null,
    ]);
    const venue = await database.public.Venue.where({ id: Number(match.venue_id) }).first();
    const minutes = Number(match.time_in_min ?? 0);
    const pricePerMinute = Number(match.price_per_min ?? venue?.price_per_min ?? 0);
    return {
      id: match.id,
      white_player_name: white ? memberName(white) : 'Unknown player',
      black_player_name: black ? memberName(black) : 'Unknown player',
      minutes,
      played_at_addis_ababa: formatMatchDate(match.game_end_at ?? match.started_at),
      price_per_minute: pricePerMinute,
      amount: minutes * pricePerMinute,
    };
  }),
);

export const matchInvoiceService = {
  async createInvoice(
    input: { member_id?: string; phone?: string; venue_id?: number },
    actor: { role: string; id: number | string },
  ) {
    if (actor.role === 'vendor' && typeof input.venue_id === 'undefined') {
      throw new AppError('Venue is required when a vendor generates an invoice', 400);
    }

    return prisma.transaction(async (tx: any) => {
      const txOrm = tx.orm as any;
      const member = await findMember(input.member_id, input.phone, txOrm);
      const allMatches = await txOrm.public.MatchHistory.all();
      const memberMatches = allMatches.filter((match: any) => (
        match.white_player_id === member.id || match.black_player_id === member.id
      ));
      const hasOngoingMatch = memberMatches.some((match: any) => (
        !match.game_end_at &&
        !['cancelled', 'canceled'].includes(String(match.status ?? '').toLowerCase())
      ));

      if (hasOngoingMatch) {
        throw new AppError(
          'This member has an ongoing match. Complete or cancel it before generating an invoice.',
          409,
        );
      }

      const matches = allMatches.filter((match: any) => (
        (match.white_player_id === member.id || match.black_player_id === member.id) &&
        Boolean(match.game_end_at) &&
        match.cancellation_reason == null &&
        !['cancelled', 'canceled'].includes(String(match.status ?? '').toLowerCase()) &&
        !match.invoice_id &&
        (typeof input.venue_id === 'undefined' || Number(match.venue_id) === input.venue_id)
      ));

      if (matches.length === 0) {
        throw new AppError('No unbilled completed matches found for this member', 400);
      }
      if (actor.role === 'vendor') {
        await ensureVendorOwnsMatches(Number(actor.id), matches, txOrm);
      }

      const items = await invoiceItems(matches, txOrm);
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const now = Temporal.Now.instant();
      const invoice = await txOrm.public.Invoice.create({
        payment_type: 'match',
        paid_in_date: null,
        total_min: totalAmount,
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
        await txOrm.public.MatchHistory.where({ id: match.id }).update({
          invoice_id: invoice.id,
          updatedAt: now,
        });
      }

      return formatInvoice(invoice, matches, member, items);
    });
  },

  async updateStatus(invoiceId: number, status: 'paid' | 'canceled', actor: { role: string; id: number | string }) {
    return prisma.transaction(async (tx: any) => {
      const txOrm = tx.orm as any;
      const invoice = await getInvoice(invoiceId, txOrm);
      if (invoice.payment_status !== 'pending') {
        throw new AppError('Only pending invoices can be updated', 409);
      }

      const matches = await txOrm.public.MatchHistory.where({ invoice_id: invoice.id }).all();
      if (actor.role === 'vendor') {
        await ensureVendorOwnsInvoiceVenue(Number(actor.id), invoice, txOrm);
        if (matches.length > 0) {
          await ensureVendorOwnsMatches(Number(actor.id), matches, txOrm);
        }
      }

      const now = Temporal.Now.instant();
      const updatedInvoice = await txOrm.public.Invoice.where({ id: invoice.id }).update({
        payment_status: status,
        paid_in_date: status === 'paid' ? now : null,
        paid_in_amount: status === 'paid' ? invoice.total_min : 0,
        approved_by: actor.role === 'admin' ? Number(actor.id) : invoice.approved_by ?? null,
        updatedAt: now,
      });

      for (const match of matches) {
        await txOrm.public.MatchHistory.where({ id: match.id }).update({
          invoice_id: status === 'paid' ? invoice.id : null,
          updatedAt: now,
        });
      }

      const memberId = invoice.member_id ?? matches[0]?.white_player_id ?? matches[0]?.black_player_id;
      const member = memberId
        ? await findMember(String(memberId), undefined, txOrm)
        : { id: null, phone: null };
      const items = status === 'paid' ? await invoiceItems(matches, txOrm) : [];
      return formatInvoice(updatedInvoice, status === 'paid' ? matches : [], member, items);
    });
  },
};

const ensureVendorOwnsInvoiceVenue = async (vendorId: number, invoice: any, database = orm) => {
  if (!invoice.venue_id) {
    throw new AppError('Vendor invoice must belong to a venue', 403);
  }

  const venue = await database.public.Venue.where({ id: Number(invoice.venue_id) }).first();
  if (!venue || Number(venue.vendor_id) !== vendorId) {
    throw new AppError('Forbidden: you do not own this venue', 403);
  }
};