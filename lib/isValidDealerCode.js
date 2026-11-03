// Dealer codes are matched exactly and case-sensitively, so the format is deliberately strict.
// This starts with the same shape as customer IDs; adjust once BYD confirms its real format.
const DEALER_CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function isValidDealerCode(value) {
  return typeof value === "string" && DEALER_CODE_PATTERN.test(value);
}

module.exports = { isValidDealerCode };
