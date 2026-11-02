const express = require("express");

function isValidJobResult(body) {
  return Boolean(
    body &&
    ((body.status === "success" && typeof body.fileContent === "string") ||
      body.status === "error"),
  );
}

function createAgentRouter({ jobBroker, agentId }) {
  const router = express.Router();

  // Long-poll: held open until a job arrives or the wait elapses (204).
  router.get("/jobs/next", async (request, response) => {
    const job = await jobBroker.waitForJob(agentId);
    if (!job) {
      return response.status(204).end();
    }
    response.json(job);
  });

  router.post(
    "/jobs/:jobId/result",
    express.json({ limit: "10mb" }),
    (request, response) => {
      if (!isValidJobResult(request.body)) {
        return response.status(400).json({ error: "Invalid job result" });
      }

      const wasAccepted = jobBroker.completeJob(
        agentId,
        request.params.jobId,
        request.body,
      );
      if (!wasAccepted) {
        // The job already timed out (or never existed), so the late result is dropped.
        return response.status(404).json({ error: "Unknown or expired job" });
      }
      response.status(204).end();
    },
  );

  return router;
}

module.exports = { createAgentRouter };
