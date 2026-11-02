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
  host: process.env.HOST ?? "0.0.0.0",
  port: readPositiveNumberVariable("PORT", 4000),
  bydApiKey: readRequiredVariable("BYD_API_KEY"),
  agentApiKey: readRequiredVariable("AGENT_API_KEY"),
  defaultAgentId: process.env.DEFAULT_AGENT_ID ?? "th-ats-prd",
  jobTimeoutMs: readPositiveNumberVariable("JOB_TIMEOUT_MS", 30000),
  pollWaitMs: readPositiveNumberVariable("POLL_WAIT_MS", 20000),
};

// Separate credentials mean a leaked agent key can't be used to call BYD's endpoint.
if (config.bydApiKey === config.agentApiKey) {
  throw new Error("BYD_API_KEY and AGENT_API_KEY must be different");
}

module.exports = config;
