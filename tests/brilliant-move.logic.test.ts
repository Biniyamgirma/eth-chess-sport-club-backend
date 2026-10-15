import assert from 'node:assert/strict';
import test from 'node:test';
import { Temporal } from '@js-temporal/polyfill';
import {
  calculateWeeklyWinner,
  canVoteOnSubmission,
} from '../src/utils/brilliant-move-rules.js';
import {
  getBrilliantMoveWeek,
  isWithinBrilliantMoveWeek,
} from '../src/utils/brilliant-move-week.js';

test('week boundaries are Monday midnight through the next Monday midnight in Addis Ababa', () => {
  const week = getBrilliantMoveWeek(
    Temporal.Instant.from('2026-10-15T12:00:00Z'),
    'Africa/Addis_Ababa',
  );

  assert.equal(week.weekStart, '2026-10-12');
  assert.equal(week.weekEnd, '2026-10-18');
  assert.equal(week.start.toString(), '2026-10-11T21:00:00Z');
  assert.equal(week.end.toString(), '2026-10-18T21:00:00Z');
  assert.equal(
    isWithinBrilliantMoveWeek('2026-10-11T20:59:59Z', week),
    false,
  );
  assert.equal(isWithinBrilliantMoveWeek(week.start, week), true);
  assert.equal(isWithinBrilliantMoveWeek(week.end, week), false);
});

test('week calculation uses ISO week years at the year boundary', () => {
  const week = getBrilliantMoveWeek(
    Temporal.Instant.from('2021-01-01T10:00:00Z'),
    'Africa/Addis_Ababa',
  );

  assert.equal(week.weekStart, '2020-12-28');
  assert.equal(week.weekNumber, 53);
  assert.equal(week.yearOfWeek, 2020);
});

test('members cannot vote on their own moves but can vote on other moves', () => {
  const member = { id: 'member-1', role: 'member' as const };
  const admin = { id: '17', role: 'admin' as const };

  assert.equal(canVoteOnSubmission(member, 'member-1'), false);
  assert.equal(canVoteOnSubmission(member, 'member-2'), true);
  assert.equal(canVoteOnSubmission(member, null), true);
  assert.equal(canVoteOnSubmission(admin, '17'), false);
});

test('weekly winner ties break by admin votes and then earliest submission', () => {
  const submissions = [
    {
      id: 3,
      user_id: 'member-3',
      createdAt: '2026-10-14T00:00:00Z',
      total_votes: 4,
      admin_votes: 2,
    },
    {
      id: 2,
      user_id: 'member-2',
      createdAt: '2026-10-12T00:00:00Z',
      total_votes: 4,
      admin_votes: 2,
    },
    {
      id: 1,
      user_id: 'member-1',
      createdAt: '2026-10-11T00:00:00Z',
      total_votes: 4,
      admin_votes: 1,
    },
  ];

  assert.equal(calculateWeeklyWinner(submissions)?.id, 2);
  assert.equal(
    calculateWeeklyWinner([
      ...submissions,
      {
        id: 4,
        user_id: 'member-4',
        createdAt: '2026-10-15T00:00:00Z',
        total_votes: 5,
        admin_votes: 0,
      },
    ])?.id,
    4,
  );
  assert.equal(calculateWeeklyWinner([]), null);
  assert.equal(
    calculateWeeklyWinner([
      {
        id: 5,
        user_id: 'member-5',
        createdAt: Temporal.Instant.from('2026-10-15T01:00:00Z'),
        total_votes: 1,
        admin_votes: 0,
      },
      {
        id: 6,
        user_id: 'member-6',
        createdAt: Temporal.Instant.from('2026-10-15T00:00:00Z'),
        total_votes: 1,
        admin_votes: 0,
      },
    ])?.id,
    6,
  );
});
