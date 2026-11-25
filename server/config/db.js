require('dotenv').config();

const mongoose = require('mongoose');
const { installMongooseDebugHook } = require('../utils/mongoTrace');

// Topic 8: Replica set URI with seed list across all 3 rs0 members
const DEFAULT_URI =
  'mongodb://localhost:27017,localhost:27018,localhost:27019/campus_student?replicaSet=rs0';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  const conn = mongoose.connection;

  // Topic 1 & 8: Connection lifecycle and replica-set reconnect observability
  conn.on('connected', () => {
    console.log(`[MongoDB] Connected (readyState=${conn.readyState})`);
  });

  conn.on('disconnected', () => {
    console.warn(`[MongoDB] Disconnected (readyState=${conn.readyState}) - awaiting reconnect/failover`);
  });

  conn.on('reconnected', () => {
    console.log(`[MongoDB] Reconnected (readyState=${conn.readyState})`);
  });

  conn.on('reconnectFailed', () => {
    console.error('[MongoDB] Reconnect failed after exhausting retries');
  });

  conn.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  conn.on('close', () => {
    console.log('[MongoDB] Connection closed');
  });
};

const connectDB = async () => {
  installMongooseDebugHook();
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  registerConnectionListeners();

  try {
    // Topic 1 & 8: Connect via Mongoose 9 (no deprecated options) with failover timeout, retries, and majority write concern
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
      writeConcern: { w: 'majority' },
    });
    return mongoose.connection;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    // Topic 1: Graceful Mongoose disconnect
    await mongoose.disconnect();
  }
};

connectDB.connectDB = connectDB;
connectDB.disconnectDB = disconnectDB;
connectDB.mongoose = mongoose;
connectDB.MONGODB_URI = MONGODB_URI;

module.exports = connectDB;
