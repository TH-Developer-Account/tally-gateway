const express = require("express");
const {
  AgentOfflineError,
  JobTimeoutError,
} = require("../errors/gatewayErrors");
const { isValidRecordId } = require("../lib/isValidRecordId");

function logLookup(recordId, outcome, startedAt) {
  console.log(
    `Lookup id="${recordId}" outcome=${outcome} durationMs=${Date.now() - startedAt}`,
  );
}

function respondWithError(response, error) {
  // BYD won't retry, so every failure must be visible in the log.
  console.error("Tally lookup request failed:", error);

  if (error instanceof AgentOfflineError) {
    return response.status(503).json({ error: "Tally agent is not connected" });
  }
  if (error instanceof JobTimeoutError) {
    return response.status(504).json({ error: "Tally lookup timed out" });
  }
  return response.status(502).json({ error: "Tally lookup failed" });
}

function createBydRouter({ jobBroker, agentId }) {
  const router = express.Router();

  router.post(
    "/lookup",
    express.json({ limit: "1kb" }),
    async (request, response) => {
      const recordId = request.body?.id;

      if (!isValidRecordId(recordId)) {
        return response
          .status(400)
          .json({ error: 'A valid "id" is required in the JSON body' });
      }

      const startedAt = Date.now();

      try {
        const { found, data } = await jobBroker.submitJob(agentId, {
          recordId,
        });

        if (!found) {
          logLookup(recordId, "not_found", startedAt);
          return response
            .status(404)
            .json({ error: "No record found for the given id" });
        }

        logLookup(recordId, "found", startedAt);
        response.json({ id: recordId, data });
      } catch (error) {
        logLookup(recordId, "failed", startedAt);
        respondWithError(response, error);
      }
    },
  );

  return router;
}

module.exports = { createBydRouter };
