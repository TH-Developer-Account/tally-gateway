const express = require("express");

function isValidJobResult(body) {
  return Boolean(
    body &&
    ((body.status === "success" && body.data !== undefined) ||
      body.status === "not_found" ||
      body.status === "error"),
  );
}

function createAgentRouter({ jobBroker }) {
  const router = express.Router();

  // Long-poll: held open until a job arrives or the wait elapses (204).
  router.get("/jobs/next", async (request, response) => {
    const job = await jobBroker.waitForJob(response.locals.agentId);
    if (!job) {
      return response.status(204).end();
    }
    response.json(job);
  });

  router.post(
    "/jobs/:jobId/result",
    express.json({ limit: "1mb" }),
    (request, response) => {
      if (!isValidJobResult(request.body)) {
        return response.status(400).json({ error: "Invalid job result" });
      }

      const wasAccepted = jobBroker.completeJob(
        response.locals.agentId,
        request.params.jobId,
        request.body,
      );
      if (!wasAccepted) {
        // The job already timed out (or belongs to another agent), so the result is dropped.
        return response.status(404).json({ error: "Unknown or expired job" });
      }
      response.status(204).end();
    },
  );

  return router;
}

module.exports = { createAgentRouter };
