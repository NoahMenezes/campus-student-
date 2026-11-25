const { buildMeta } = require('./mongoTrace');

// Standardized API envelope builder reading live ALS concepts & queries automatically
function sendSuccess(res, { status = 200, data, startMs, concepts = [], queries = [] }) {
  return res.status(status).json({
    data,
    meta: buildMeta(res.req, { startMs, concepts, queries }),
  });
}

function sendError(res, { status = 500, error, code, details, startMs, concepts = [], queries = [] }) {
  const payload = { error };
  if (code !== undefined) payload.code = code;
  if (details !== undefined) payload.details = details;
  return res.status(status).json({
    data: payload,
    meta: buildMeta(res.req, { startMs, concepts, queries }),
  });
}

module.exports = { sendSuccess, sendError };
