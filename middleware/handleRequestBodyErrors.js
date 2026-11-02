// express.json forwards malformed or oversized bodies as errors; without this,
// Express replies with an HTML error page instead of JSON.
function handleRequestBodyErrors(error, request, response, next) {
  if (error.status === 400 || error.status === 413) {
    return response
      .status(error.status)
      .json({ error: "Invalid request body" });
  }
  next(error);
}

module.exports = { handleRequestBodyErrors };
