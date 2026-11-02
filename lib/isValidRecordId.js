// The ID only ever reaches the agent as data, never a command line, so this check
// rejects junk early rather than guarding against shell injection.
// Widen the pattern if real aliases contain other characters.
const RECORD_ID_PATTERN = /^[A-Za-z0-9 ._\-/]{1,64}$/;

function isValidRecordId(value) {
  return typeof value === "string" && RECORD_ID_PATTERN.test(value);
}

module.exports = { isValidRecordId };
