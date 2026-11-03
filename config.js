function readRequiredVariable(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readPositiveNumberVariable(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsedValue;
}

const config = {
  // Loopback by default so nothing is exposed unless you choose to.
  host: process.env.GATEWAY_HOST ?? "127.0.0.1",
  port: readPositiveNumberVariable("GATEWAY_PORT", 4000),
  bydApiKey: readRequiredVariable("BYD_API_KEY"),
  // Must be at least 2x the agent's export timeout plus slack, and below the ALB idle timeout.
  jobTimeoutMs: readPositiveNumberVariable("JOB_TIMEOUT_MS", 45000),
  pollWaitMs: readPositiveNumberVariable("POLL_WAIT_MS", 20000),
};

module.exports = config;
