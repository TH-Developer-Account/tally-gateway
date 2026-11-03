const express = require("express");
const {
  AgentOfflineError,
  JobTimeoutError,
} = require("../errors/gatewayErrors");
const { isValidDealerCode } = require("../lib/isValidDealerCode");
const { isValidRecordId } = require("../lib/isValidRecordId");

function logLookup({ dealerCode, recordId, outcome, startedAt }) {
  console.log(
    `Lookup dealer="${dealerCode}" id="${recordId}" outcome=${outcome} durationMs=${Date.now() - startedAt}`,
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

function createBydRouter({ jobBroker, agentRegistry }) {
  const router = express.Router();

  router.post(
    "/lookup",
    express.json({ limit: "1kb" }),
    async (request, response) => {
      const { dealerCode, id: recordId } = request.body ?? {};

      if (!isValidDealerCode(dealerCode) || !isValidRecordId(recordId)) {
        return response.status(400).json({
          error: 'Valid "dealerCode" and "id" are required in the JSON body',
        });
      }

      const startedAt = Date.now();
      const agentId = agentRegistry.findAgentIdByDealerCode(dealerCode);

      if (agentId === null) {
        logLookup({
          dealerCode,
          recordId,
          outcome: "unknown_dealer",
          startedAt,
        });
        return response
          .status(404)
          .json({ error: "Unknown dealer code", code: "UNKNOWN_DEALER" });
      }

      try {
        const { found, data } = await jobBroker.submitJob(agentId, {
          recordId,
        });

        if (!found) {
          logLookup({ dealerCode, recordId, outcome: "not_found", startedAt });
          return response.status(404).json({
            error: "No record found for the given id",
            code: "RECORD_NOT_FOUND",
          });
        }

        logLookup({ dealerCode, recordId, outcome: "found", startedAt });
        response.json({ dealerCode, id: recordId, data });
      } catch (error) {
        logLookup({ dealerCode, recordId, outcome: "failed", startedAt });
        respondWithError(response, error);
      }
    },
  );

  return router;
}

module.exports = { createBydRouter };
