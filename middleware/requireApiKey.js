// The key decides which agent is calling, so one agent can never poll for another's jobs.
function createRequireAgentApiKey(agentRegistry) {
  return function requireAgentApiKey(request, response, next) {
    const agentId = agentRegistry.findAgentIdByApiKey(
      request.get("x-api-key") ?? "",
    );

    if (agentId === null) {
      return response
        .status(401)
        .json({ error: "Invalid or missing x-api-key" });
    }
    response.locals.agentId = agentId;
    next();
  };
}

module.exports = { createRequireAgentApiKey };
