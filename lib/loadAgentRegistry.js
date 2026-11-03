const crypto = require("node:crypto");
const { isValidDealerCode } = require("./isValidDealerCode");

const MIN_API_KEY_LENGTH = 16;

function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest();
}

function findDuplicate(values) {
  const seenValues = new Set();
  for (const value of values) {
    if (seenValues.has(value)) {
      return value;
    }
    seenValues.add(value);
  }
  return undefined;
}

// Fails at startup so a bad mapping can never silently misroute a dealer's requests.
function validateAgentDefinitions(agentDefinitions, bydApiKey) {
  if (!Array.isArray(agentDefinitions) || agentDefinitions.length === 0) {
    throw new Error("Agent registry: at least one agent must be configured");
  }

  for (const agent of agentDefinitions) {
    if (typeof agent?.agentId !== "string" || agent.agentId === "") {
      throw new Error("Agent registry: every agent needs a non-empty agentId");
    }
    if (
      typeof agent.apiKey !== "string" ||
      agent.apiKey.length < MIN_API_KEY_LENGTH
    ) {
      throw new Error(
        `Agent registry: agent "${agent.agentId}" needs an apiKey of at least ${MIN_API_KEY_LENGTH} characters`,
      );
    }
    if (
      !Array.isArray(agent.dealerCodes) ||
      agent.dealerCodes.length === 0 ||
      !agent.dealerCodes.every(isValidDealerCode)
    ) {
      throw new Error(
        `Agent registry: agent "${agent.agentId}" needs a non-empty list of valid dealerCodes`,
      );
    }
    if (agent.apiKey === bydApiKey) {
      throw new Error(
        `Agent registry: agent "${agent.agentId}" must not use the same key as BYD_API_KEY`,
      );
    }
  }

  const duplicateAgentId = findDuplicate(
    agentDefinitions.map((agent) => agent.agentId),
  );
  if (duplicateAgentId !== undefined) {
    throw new Error(
      `Agent registry: agentId "${duplicateAgentId}" is listed more than once`,
    );
  }

  const duplicateApiKey = findDuplicate(
    agentDefinitions.map((agent) => agent.apiKey),
  );
  if (duplicateApiKey !== undefined) {
    // The key itself is deliberately left out of the message.
    throw new Error("Agent registry: two agents share the same apiKey");
  }

  const allDealerCodes = agentDefinitions.flatMap((agent) => agent.dealerCodes);
  const duplicateDealerCode = findDuplicate(allDealerCodes);
  if (duplicateDealerCode !== undefined) {
    throw new Error(
      `Agent registry: dealer code "${duplicateDealerCode}" is assigned to more than one agent`,
    );
  }
}

function createAgentRegistry({ agentDefinitions, bydApiKey }) {
  validateAgentDefinitions(agentDefinitions, bydApiKey);

  const agentIdsByDealerCode = new Map();
  for (const agent of agentDefinitions) {
    for (const dealerCode of agent.dealerCodes) {
      agentIdsByDealerCode.set(dealerCode, agent.agentId);
    }
  }

  const agentKeyEntries = agentDefinitions.map((agent) => ({
    agentId: agent.agentId,
    apiKeyHash: hashApiKey(agent.apiKey),
  }));

  function findAgentIdByDealerCode(dealerCode) {
    return agentIdsByDealerCode.get(dealerCode) ?? null;
  }

  function findAgentIdByApiKey(providedApiKey) {
    // Comparing fixed-length hashes avoids a length mismatch error, and checking every
    // entry without stopping early keeps the timing independent of which agent matched.
    const providedHash = hashApiKey(providedApiKey);
    let matchedAgentId = null;
    for (const entry of agentKeyEntries) {
      if (crypto.timingSafeEqual(providedHash, entry.apiKeyHash)) {
        matchedAgentId = entry.agentId;
      }
    }
    return matchedAgentId;
  }

  return {
    findAgentIdByDealerCode,
    findAgentIdByApiKey,
    agentCount: agentDefinitions.length,
    dealerCodeCount: agentIdsByDealerCode.size,
  };
}

function resolveAgentDefinitions(agentConfigurations, environment) {
  return agentConfigurations.map(
    ({ agentId, apiKeyVariableName, dealerCodes }) => {
      if (typeof apiKeyVariableName !== "string" || apiKeyVariableName === "") {
        throw new Error(
          `Agent registry: agent "${agentId}" needs an apiKeyVariableName`,
        );
      }

      const apiKey = environment[apiKeyVariableName];
      if (!apiKey) {
        throw new Error(
          `Agent registry: environment variable ${apiKeyVariableName} (the key for agent "${agentId}") is not set`,
        );
      }

      return { agentId, apiKey, dealerCodes };
    },
  );
}

function loadAgentRegistry({ agentConfigurations, environment, bydApiKey }) {
  if (!Array.isArray(agentConfigurations)) {
    throw new Error("Agent registry: agent configurations must be an array");
  }

  return createAgentRegistry({
    agentDefinitions: resolveAgentDefinitions(agentConfigurations, environment),
    bydApiKey,
  });
}

module.exports = { createAgentRegistry, loadAgentRegistry };
