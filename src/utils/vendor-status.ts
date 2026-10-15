export const VENDOR_STATUS = {
  blocked: 0,
  active: 1,
} as const;

export const isVendorBlocked = (vendor: { status?: number | null }) =>
  vendor.status === VENDOR_STATUS.blocked;
