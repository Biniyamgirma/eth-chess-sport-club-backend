import assert from 'node:assert/strict';
import test from 'node:test';

import { isVendorBlocked, VENDOR_STATUS } from '../src/utils/vendor-status.js';

test('vendor status identifies blocked and active records', () => {
  assert.equal(isVendorBlocked({ status: VENDOR_STATUS.blocked }), true);
  assert.equal(isVendorBlocked({ status: VENDOR_STATUS.active }), false);
  assert.equal(isVendorBlocked({ status: null }), false);
});
