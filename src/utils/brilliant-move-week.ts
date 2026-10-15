import { Temporal } from '@js-temporal/polyfill';

export const BRILLIANT_MOVE_TIME_ZONE =
  process.env.BRILLIANT_MOVE_TIME_ZONE ?? 'Africa/Addis_Ababa';

export interface BrilliantMoveWeek {
  start: Temporal.Instant;
  end: Temporal.Instant;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  yearOfWeek: number;
}

export function getBrilliantMoveWeek(
  value: Temporal.Instant | Date = Temporal.Now.instant(),
  timeZone = BRILLIANT_MOVE_TIME_ZONE,
): BrilliantMoveWeek {
  const instant =
    value instanceof Date ? Temporal.Instant.from(value.toISOString()) : value;
  const localDate = instant.toZonedDateTimeISO(timeZone).toPlainDate();
  const monday = localDate.subtract({ days: localDate.dayOfWeek - 1 });
  const nextMonday = monday.add({ days: 7 });
  const start = monday
    .toZonedDateTime({ plainTime: '00:00', timeZone })
    .toInstant();
  const end = nextMonday
    .toZonedDateTime({ plainTime: '00:00', timeZone })
    .toInstant();

  return {
    start,
    end,
    weekStart: monday.toString(),
    weekEnd: nextMonday.subtract({ days: 1 }).toString(),
    weekNumber: monday.weekOfYear ?? 0,
    yearOfWeek: monday.yearOfWeek ?? monday.year,
  };
}

export function isWithinBrilliantMoveWeek(
  value: Temporal.Instant | Date | string,
  week: BrilliantMoveWeek,
): boolean {
  const instant =
    value instanceof Date
      ? Temporal.Instant.from(value.toISOString())
      : typeof value === 'string'
        ? Temporal.Instant.from(value)
        : value;

  return (
    Temporal.Instant.compare(instant, week.start) >= 0 &&
    Temporal.Instant.compare(instant, week.end) < 0
  );
}
