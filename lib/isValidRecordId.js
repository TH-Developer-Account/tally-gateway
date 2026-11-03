// The agent puts this ID on a tally.exe command line where ":" separates parameters,
// so no colons, spaces or slashes. Widen the character set only if real IDs need it.
const RECORD_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function isValidRecordId(value) {
  return typeof value === "string" && RECORD_ID_PATTERN.test(value);
}

module.exports = { isValidRecordId };
