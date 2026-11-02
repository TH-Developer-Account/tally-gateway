const express = require("express");
const {
  AgentOfflineError,
  JobTimeoutError,
} = require("../errors/gatewayErrors");

function logExport(outcome, startedAt) {
  console.log(`Export outcome=${outcome} durationMs=${Date.now() - startedAt}`);
}

function respondWithError(response, error) {
  // BYD won't retry, so every failure must be visible in the log.
  console.error("Tally export request failed:", error);

  if (error instanceof AgentOfflineError) {
    return response.status(503).json({ error: "Tally agent is not connected" });
  }
  if (error instanceof JobTimeoutError) {
    return response.status(504).json({ error: "Tally export timed out" });
  }
  return response.status(502).json({ error: "Tally export failed" });
}

function createBydRouter({ jobBroker, agentId }) {
  const router = express.Router();

  router.post("/export", async (request, response) => {
    const startedAt = Date.now();

    try {
      const { fileContent } = await jobBroker.submitJob(agentId, {});
      logExport("success", startedAt);
      response.json({ fileContent });
    } catch (error) {
      logExport("failed", startedAt);
      respondWithError(response, error);
    }
  });

  return router;
}

module.exports = { createBydRouter };
