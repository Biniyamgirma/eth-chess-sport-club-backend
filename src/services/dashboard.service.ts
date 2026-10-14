import { or } from '@prisma/orm-postgres/orm-client';
import { prisma } from '../config/prisma.js';

const orm = prisma.orm as any;
const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const nonDeletedMembers = () =>
  orm.public.Member.where((member: any) =>
    or(member.is_deleted.eq(0), member.is_deleted.isNull()),
  );

const countMembers = async (start?: Temporal.Instant, end?: Temporal.Instant) => {
  let query = nonDeletedMembers();

  if (start) {
    query = query.where((member: any) => member.createdAt.gte(start));
  }
  if (end) {
    query = query.where((member: any) => member.createdAt.lt(end));
  }

  const result = await query.aggregate((aggregate: any) => ({
    total: aggregate.count(),
  }));
  return result.total as number;
};

export const dashboardService = {
  async getSummary() {
    const now = Temporal.Now.instant();
    const today = now.toZonedDateTimeISO('UTC').startOfDay();
    const [members, activeMembers, venueOwners, venues, currentPeriodMembers, previousPeriodMembers, recentMembers, activity] =
      await Promise.all([
        countMembers(),
        nonDeletedMembers()
          .where({ status: 1 })
          .aggregate((aggregate: any) => ({
            total: aggregate.count(),
          })),
        orm.public.Vendor.aggregate((aggregate: any) => ({
          total: aggregate.count(),
        })),
        orm.public.Venue.where({ status: 1, is_deleted: 0 }).aggregate((aggregate: any) => ({
          total: aggregate.count(),
        })),
        countMembers(now.subtract({ hours: 168 }), now),
        countMembers(now.subtract({ hours: 336 }), now.subtract({ hours: 168 })),
        nonDeletedMembers()
          .select('id', 'f_name', 'l_name', 'createdAt')
          .orderBy((member: any) => member.createdAt.desc())
          .limit(4)
          .all(),
        Promise.all(
          Array.from({ length: 7 }, async (_, index) => {
            const day = today.subtract({ days: 6 - index });
            const count = await countMembers(
              day.toInstant(),
              day.add({ days: 1 }).toInstant(),
            );
            return {
              label: weekdays[day.dayOfWeek - 1],
              value: count,
            };
          }),
        ),
      ]);

    const currentCount = currentPeriodMembers;
    const previousCount = previousPeriodMembers;
    const memberChange =
      previousCount === 0
        ? currentCount === 0
          ? 0
          : 100
        : Number((((currentCount - previousCount) / previousCount) * 100).toFixed(1));

    return {
      members,
      venueOwners: venueOwners.total as number,
      venues: venues.total as number,
      upcomingEvents: 0,
      activeMembers: activeMembers.total as number,
      memberChange,
      recentMembers: recentMembers.map((member: any) => ({
        id: member.id,
        f_name: member.f_name,
        l_name: member.l_name,
        createdAt: Temporal.Instant.from(String(member.createdAt)).toString(),
      })),
      activity,
    };
  },
};
