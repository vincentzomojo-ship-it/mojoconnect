const { randomUUID } = require("crypto");
const logger = require("../utils/logger");

function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  const start = Date.now();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    logger.info("http_request", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip
    });
  });

  next();
}

module.exports = requestContext;
