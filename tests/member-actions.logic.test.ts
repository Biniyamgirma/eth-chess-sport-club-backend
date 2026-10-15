import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSufficientAdminLevel } from '../src/utils/admin-level.js';
import { isMemberBlocked, MEMBER_STATUS } from '../src/utils/member-status.js';

test('member management requires an admin level greater than five', () => {
  assert.equal(hasSufficientAdminLevel(5, 5), false);
  assert.equal(hasSufficientAdminLevel(6, 5), true);
});

test('only the explicit blocked status disables a member account', () => {
  assert.equal(isMemberBlocked({ status: MEMBER_STATUS.blocked }), true);
  assert.equal(isMemberBlocked({ status: MEMBER_STATUS.active }), false);
  assert.equal(isMemberBlocked({ status: MEMBER_STATUS.pending }), false);
});
