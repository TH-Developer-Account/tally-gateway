require("dotenv").config();
const express = require("express");
const config = require("./config");
const agentConfigurations = require("./agentConfigurations");
const { createRequireApiKey } = require("./middleware/requireApiKey");
const { createRequireAgentApiKey } = require("./middleware/requireAgentApiKey");
const {
  handleRequestBodyErrors,
} = require("./middleware/handleRequestBodyErrors");
const { createJobBroker } = require("./lib/createJobBroker");
const { createAgentRegistry } = require("./lib/createAgentRegistry");
const { createBydRouter } = require("./routes/bydRoute");
const { createAgentRouter } = require("./routes/agentRoute");

const agentRegistry = createAgentRegistry({
  agentDefinitions: agentConfigurations,
  bydApiKey: config.bydApiKey,
});
console.log(
  `Loaded ${agentRegistry.agentCount} agent(s) covering ${agentRegistry.dealerCodeCount} dealer code(s)`,
);

const jobBroker = createJobBroker({
  jobTimeoutMs: config.jobTimeoutMs,
  pollWaitMs: config.pollWaitMs,
});

// Everything lives under /tally so the ALB can route one prefix to this app.
const tallyRouter = express.Router();

tallyRouter.get("/health", (request, response) =>
  response.json({ status: "ok" }),
);

tallyRouter.use(
  "/byd",
  createRequireApiKey(config.bydApiKey),
  createBydRouter({ jobBroker, agentRegistry }),
);

tallyRouter.use(
  "/agent",
  createRequireAgentApiKey(agentRegistry),
  createAgentRouter({ jobBroker }),
);

tallyRouter.use(handleRequestBodyErrors);

const app = express();
app.disable("x-powered-by");
app.use("/tally", tallyRouter);

const server = app.listen(config.port, config.host, () => {
  console.log(`Gateway listening on ${config.host}:${config.port}`);
});

// Node's default 5 s keep-alive is shorter than the ALB's idle timeout, which makes the
// ALB occasionally reuse a socket Node has already closed and return a 502.
// Keep this above whatever idle timeout IT confirms (assumed 60 s).
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
