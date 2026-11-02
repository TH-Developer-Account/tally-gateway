const crypto = require("node:crypto");
const {
  AgentOfflineError,
  JobTimeoutError,
  JobFailedError,
} = require("../errors/gatewayErrors");

/**
 * Matches callers waiting for data with agents that fetch work by long-polling.
 * State is in memory, so exactly one gateway process may run.
 */
function createJobBroker({ jobTimeoutMs, pollWaitMs }) {
  // One full poll cycle plus slack for the agent to reconnect after a network blip.
  const agentOnlineWindowMs = pollWaitMs * 2;
  const agentStatesById = new Map();
  const jobsById = new Map();

  function getAgentState(agentId) {
    if (!agentStatesById.has(agentId)) {
      agentStatesById.set(agentId, {
        pendingJobs: [],
        waitingPoller: null,
        lastSeenAt: 0,
      });
    }
    return agentStatesById.get(agentId);
  }

  function isAgentOnline(agentState) {
    return (
      agentState.waitingPoller !== null ||
      Date.now() - agentState.lastSeenAt <= agentOnlineWindowMs
    );
  }

  function releaseWaitingPoller(agentState) {
    const { waitingPoller } = agentState;
    if (!waitingPoller) {
      return;
    }
    clearTimeout(waitingPoller.timeoutHandle);
    agentState.waitingPoller = null;
    waitingPoller.resolve(null);
  }

  function deliverJob(agentState, job) {
    const { waitingPoller } = agentState;
    if (!waitingPoller) {
      agentState.pendingJobs.push(job);
      return;
    }
    clearTimeout(waitingPoller.timeoutHandle);
    agentState.waitingPoller = null;
    waitingPoller.resolve(job);
  }

  async function submitJob(agentId, payload) {
    const agentState = getAgentState(agentId);
    if (!isAgentOnline(agentState)) {
      throw new AgentOfflineError(`Agent ${agentId} is not connected`);
    }

    const jobId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        jobsById.delete(jobId);
        agentState.pendingJobs = agentState.pendingJobs.filter(
          (job) => job.jobId !== jobId,
        );
        reject(
          new JobTimeoutError(
            `Job ${jobId} not completed within ${jobTimeoutMs}ms`,
          ),
        );
      }, jobTimeoutMs);

      jobsById.set(jobId, { agentId, resolve, reject, timeoutHandle });
      deliverJob(agentState, { jobId, ...payload });
    });
  }

  function waitForJob(agentId) {
    const agentState = getAgentState(agentId);
    agentState.lastSeenAt = Date.now();

    if (agentState.pendingJobs.length > 0) {
      return Promise.resolve(agentState.pendingJobs.shift());
    }

    // A new poll means the agent restarted or reconnected, so the old poll is dead.
    releaseWaitingPoller(agentState);

    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        agentState.waitingPoller = null;
        resolve(null);
      }, pollWaitMs);
      agentState.waitingPoller = { resolve, timeoutHandle };
    });
  }

  function completeJob(agentId, jobId, result) {
    const job = jobsById.get(jobId);
    if (!job || job.agentId !== agentId) {
      return false;
    }

    clearTimeout(job.timeoutHandle);
    jobsById.delete(jobId);
    getAgentState(agentId).lastSeenAt = Date.now();

    if (result.status === "success") {
      job.resolve({ fileContent: result.fileContent });
    } else {
      job.reject(
        new JobFailedError(result.message ?? "Agent reported a failure"),
      );
    }
    return true;
  }

  return { submitJob, waitForJob, completeJob };
}

module.exports = { createJobBroker };
