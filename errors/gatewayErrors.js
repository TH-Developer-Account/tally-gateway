class AgentOfflineError extends Error {}
class JobTimeoutError extends Error {}
class JobFailedError extends Error {}

module.exports = { AgentOfflineError, JobTimeoutError, JobFailedError };
