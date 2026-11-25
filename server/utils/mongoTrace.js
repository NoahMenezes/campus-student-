const { AsyncLocalStorage } = require('async_hooks');
const mongoose = require('mongoose');

const mongoTraceStorage = new AsyncLocalStorage();

const TOPIC_NAMES = {
  1: 'Install & Health',
  2: 'BSON, Validation & Indexes',
  3: 'Insert, Find & Projection',
  4: 'Update & Delete',
  5: 'Advanced Queries & Pagination',
  6: 'Aggregation Fundamentals',
  7: 'Aggregation Joins & Facets',
  8: 'Replica Set & Failover',
  9: 'Sharding & Shard Keys',
  10: 'Performance & Execution Comparison',
};

let debugHookInstalled = false;

/**
 * Safely clone MongoDB arguments for JSON responses:
 * strips ClientSession objects (which hold circular MongoClient refs), converts ObjectId/Date/RegExp,
 * breaks any circular object cycles, and optionally redacts string credential fields.
 */
function sanitizeMongoValue(value, options = {}, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  if (value instanceof mongoose.Types.ObjectId || value._bsontype === 'ObjectId') {
    return String(value);
  }
  if (value.constructor && value.constructor.name === 'ClientSession') {
    return '[ClientSession]';
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMongoValue(item, options, seen));
  }

  const redactSet = options.redactStrings ? new Set(options.redactStrings) : null;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (key === 'session') continue;
    if (redactSet && redactSet.has(key) && typeof val === 'string') {
      out[key] = '[REDACTED]';
    } else {
      out[key] = sanitizeMongoValue(val, options, seen);
    }
  }
  return out;
}

function pickDefined(obj, keys) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

/**
 * Normalize Mongoose debug arguments into a structured { collection, op, filter|pipeline, ... } entry.
 */
function formatDebugEvent(collectionName, methodName, rawArgs) {
  const args = rawArgs || [];

  switch (methodName) {
    case 'find': {
      const filter = sanitizeMongoValue(args[0] || {});
      const opts = sanitizeMongoValue(args[1] || {});
      if (opts.explain) {
        return {
          collection: collectionName,
          op: `explain(${opts.explain})`,
          filter,
          ...pickDefined(opts, ['projection', 'sort', 'skip', 'limit', 'hint']),
        };
      }
      return {
        collection: collectionName,
        op: 'find',
        filter,
        ...pickDefined(opts, ['projection', 'sort', 'skip', 'limit', 'hint']),
      };
    }
    case 'findOne': {
      const filter = sanitizeMongoValue(args[0] || {});
      const opts = sanitizeMongoValue(args[1] || {});
      return {
        collection: collectionName,
        op: 'findOne',
        filter,
        ...pickDefined(opts, ['projection', 'sort', 'hint']),
      };
    }
    case 'countDocuments':
    case 'estimatedDocumentCount':
      return {
        collection: collectionName,
        op: methodName,
        filter: sanitizeMongoValue(args[0] || {}),
      };
    case 'aggregate': {
      const pipeline = sanitizeMongoValue(args[0] || []);
      const opts = sanitizeMongoValue(args[1] || {});
      return {
        collection: collectionName,
        op: 'aggregate',
        pipeline,
        ...pickDefined(opts, ['hint', 'allowDiskUse', 'maxTimeMS']),
      };
    }
    case 'insertOne':
      return {
        collection: collectionName,
        op: 'insertOne',
        document: sanitizeMongoValue(args[0] || {}, { redactStrings: ['password'] }),
      };
    case 'insertMany': {
      const docs = Array.isArray(args[0]) ? args[0] : [args[0]];
      const opts = sanitizeMongoValue(args[1] || {});
      return {
        collection: collectionName,
        op: 'insertMany',
        documentCount: docs.length,
        sample: docs[0] ? sanitizeMongoValue(docs[0], { redactStrings: ['password'] }) : null,
        ...pickDefined(opts, ['ordered']),
      };
    }
    case 'updateOne':
    case 'updateMany':
    case 'replaceOne':
    case 'findOneAndUpdate':
    case 'findByIdAndUpdate': {
      const filter = sanitizeMongoValue(args[0] || {});
      const update = sanitizeMongoValue(args[1] || {});
      const opts = sanitizeMongoValue(args[2] || {});
      return {
        collection: collectionName,
        op: methodName,
        filter,
        update,
        ...pickDefined(opts, ['upsert', 'writeConcern', 'arrayFilters', 'new', 'runValidators']),
      };
    }
    case 'deleteOne':
    case 'deleteMany':
    case 'findOneAndDelete':
    case 'findByIdAndDelete':
      return {
        collection: collectionName,
        op: methodName,
        filter: sanitizeMongoValue(args[0] || {}),
      };
    default:
      return {
        collection: collectionName,
        op: methodName,
        args: sanitizeMongoValue(args),
      };
  }
}

/**
 * Install a single global Mongoose debug callback that routes live MongoDB queries into
 * the current request's AsyncLocalStorage trace store without flooding stdout.
 */
function installMongooseDebugHook() {
  if (debugHookInstalled) return;
  debugHookInstalled = true;

  mongoose.set('debug', (collectionName, methodName, ...args) => {
    const store = mongoTraceStorage.getStore();
    if (!store) return;
    if (store.suppressDebugFind && methodName === 'find') {
      return;
    }
    if (methodName === 'aggregate') {
      store._debugAggregateCount += 1;
    }
    store.queries.push(formatDebugEvent(collectionName, methodName, args));
  });
}

function getMongoTrace(req) {
  return mongoTraceStorage.getStore() || (req && req._mongoTrace) || null;
}

/**
 * Attach a MongoDB topic tag to the active request trace (used in meta.concepts).
 */
function tag(req, topic, operators, why) {
  const store = getMongoTrace(req);
  if (!store) return;

  const topicNum = Number(topic);
  const topicName = TOPIC_NAMES[topicNum] || `Topic ${topicNum}`;
  const opsList = (Array.isArray(operators) ? operators : [operators])
    .filter(Boolean)
    .map((op) => String(op));

  const existing = store.concepts.find(
    (c) => c.topic === topicNum && c.why === String(why || '')
  );
  if (existing) {
    for (const op of opsList) {
      if (!existing.operators.includes(op)) {
        existing.operators.push(op);
      }
    }
    return;
  }

  store.concepts.push({
    topic: topicNum,
    topicName,
    operators: opsList,
    why: String(why || ''),
  });
}

/**
 * Explicitly record a driver-level MongoDB command (e.g. admin ping, listCollections, explain)
 * that does not pass through Mongoose Model debug hooks.
 */
function recordQuery(reqOrEntry, maybeEntry) {
  const store =
    maybeEntry !== undefined ? getMongoTrace(reqOrEntry) : mongoTraceStorage.getStore();
  const entry = maybeEntry !== undefined ? maybeEntry : reqOrEntry;
  if (!store || !entry) return;
  store.queries.push(sanitizeMongoValue(entry));
}

/**
 * Execute Model.aggregate(pipeline, options) and guarantee the pipeline is logged in
 * AsyncLocalStorage even if mongoose.set("debug", cb) did not capture the aggregate call.
 */
async function runAggregate(modelOrCol, pipeline, options) {
  const store = mongoTraceStorage.getStore();
  const beforeAggCount = store ? store._debugAggregateCount : 0;

  let agg;
  if (typeof modelOrCol.aggregate === 'function') {
    if (modelOrCol.modelName) {
      agg = modelOrCol.aggregate(pipeline);
      if (options && typeof agg.option === 'function') {
        agg.option(options);
      }
    } else {
      agg = options
        ? modelOrCol.aggregate(pipeline, options)
        : modelOrCol.aggregate(pipeline);
    }
  }
  const result = typeof agg.toArray === 'function' ? await agg.toArray() : await agg;

  if (store && store._debugAggregateCount === beforeAggCount) {
    const colName =
      modelOrCol.collection?.collectionName ||
      modelOrCol.collectionName ||
      modelOrCol.modelName ||
      'unknown';
    store.queries.push({
      collection: colName,
      op: 'aggregate',
      pipeline: sanitizeMongoValue(pipeline),
      ...(options ? sanitizeMongoValue(options) : {}),
      capturedBy: 'aggregate-wrapper',
    });
  }

  return result;
}

/**
 * Execute an explain('executionStats') probe on a native collection and record exact hint metadata.
 */
async function runExplain(collection, filter, hintObj = null) {
  const store = mongoTraceStorage.getStore();
  if (store) store.suppressDebugFind = true;
  try {
    let cursor = collection.find(filter);
    if (hintObj) {
      cursor = cursor.hint(hintObj);
    }
    const result = await cursor.explain('executionStats');
    recordQuery({
      collection: collection.collectionName || 'unknown',
      op: 'explain(executionStats)',
      filter: sanitizeMongoValue(filter),
      ...(hintObj ? { hint: sanitizeMongoValue(hintObj) } : {}),
    });
    return result;
  } finally {
    if (store) store.suppressDebugFind = false;
  }
}

function buildMeta(req, fallback = {}) {
  const store = getMongoTrace(req);
  const startMs = store?.startMs ?? fallback.startMs ?? Date.now();
  const concepts = [...(store?.concepts || [])];
  for (const c of fallback.concepts || []) {
    if (!concepts.some((x) => x.topic === c.topic && x.why === c.why)) {
      concepts.push(c);
    }
  }
  const queries = store && store.queries.length > 0 ? store.queries : fallback.queries || [];
  return {
    ms: Math.max(0, Date.now() - startMs),
    concepts,
    queries,
  };
}

/**
 * Express middleware that binds an AsyncLocalStorage trace store to every HTTP request
 * and guarantees { data, meta: { ms, concepts, queries } } on every JSON response.
 */
function mongoTraceMiddleware(req, res, next) {
  installMongooseDebugHook();

  const store = {
    startMs: Date.now(),
    concepts: [],
    queries: [],
    _debugAggregateCount: 0,
    suppressDebugFind: false,
  };
  req._mongoTrace = store;

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && !Array.isArray(body) && 'meta' in body && 'data' in body) {
      return originalJson({
        data: body.data,
        meta: {
          ms: typeof body.meta?.ms === 'number' ? body.meta.ms : Math.max(0, Date.now() - store.startMs),
          concepts: Array.isArray(body.meta?.concepts) ? body.meta.concepts : store.concepts,
          queries: Array.isArray(body.meta?.queries) ? body.meta.queries : store.queries,
        },
      });
    }
    const meta = buildMeta(req);
    const data = body && typeof body === 'object' && 'data' in body ? body.data : body;
    return originalJson({ data, meta });
  };

  mongoTraceStorage.run(store, () => next());
}

module.exports = {
  TOPIC_NAMES,
  mongoTraceStorage,
  installMongooseDebugHook,
  mongoTraceMiddleware,
  getMongoTrace,
  tag,
  recordQuery,
  runAggregate,
  runExplain,
  buildMeta,
  sanitizeMongoValue,
};
