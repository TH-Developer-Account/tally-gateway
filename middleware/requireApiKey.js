const crypto = require("node:crypto");

function createRequireApiKey(expectedApiKey) {
  const expectedKeyBuffer = Buffer.from(expectedApiKey);

  return function requireApiKey(request, response, next) {
    const providedKeyBuffer = Buffer.from(request.get("x-api-key") ?? "");

    // timingSafeEqual throws on length mismatch, so compare lengths first.
    const isValid =
      providedKeyBuffer.length === expectedKeyBuffer.length &&
      crypto.timingSafeEqual(providedKeyBuffer, expectedKeyBuffer);

    if (!isValid) {
      return response
        .status(401)
        .json({ error: "Invalid or missing x-api-key" });
    }
    next();
  };
}

module.exports = { createRequireApiKey };
