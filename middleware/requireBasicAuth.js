const crypto = require("node:crypto");

// Hashing first gives fixed-length values, so timingSafeEqual never throws on a length mismatch.
function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest();
}

function parseBasicCredentials(authorizationHeader) {
  const [scheme, encodedCredentials] = (authorizationHeader ?? "").split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encodedCredentials) {
    return null;
  }

  const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
    "utf8",
  );
  // Only the first colon separates them, because a password may contain colons.
  const separatorIndex = decodedCredentials.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }
  return {
    username: decodedCredentials.slice(0, separatorIndex),
    password: decodedCredentials.slice(separatorIndex + 1),
  };
}

function createRequireBasicAuth({ username, password }) {
  const expectedUsernameHash = hashValue(username);
  const expectedPasswordHash = hashValue(password);

  return function requireBasicAuth(request, response, next) {
    const credentials = parseBasicCredentials(request.get("authorization"));

    // Both comparisons always run, so the timing doesn't reveal which one failed.
    const isUsernameValid = crypto.timingSafeEqual(
      hashValue(credentials?.username ?? ""),
      expectedUsernameHash,
    );
    const isPasswordValid = crypto.timingSafeEqual(
      hashValue(credentials?.password ?? ""),
      expectedPasswordHash,
    );

    if (!credentials || !isUsernameValid || !isPasswordValid) {
      response.set("WWW-Authenticate", 'Basic realm="Tally gateway"');
      return response
        .status(401)
        .json({ error: "Invalid or missing credentials" });
    }
    next();
  };
}

module.exports = { createRequireBasicAuth };
