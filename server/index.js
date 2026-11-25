const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { mongoTraceMiddleware, tag, buildMeta } = require('./utils/mongoTrace');
const demoRoutes = require('./routes/demo');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const courseRoutes = require('./routes/courses');
const attendanceRoutes = require('./routes/attendance');
const timetableRoutes = require('./routes/timetable');
const notificationRoutes = require('./routes/notifications');
const studentRoutes = require('./routes/students');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Attach AsyncLocalStorage request trace + Mongoose debug hook on every response
app.use(mongoTraceMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Topic 8: Middleware returning { status: "reconnecting" } while MongoDB is failing over/reconnecting
const requireDbReady = (req, res, next) => {
  const readyState = mongoose.connection.readyState;
  if (readyState !== 1) {
    tag(
      req,
      8,
      ['readyState', 'serverSelectionTimeoutMS'],
      'Signals clients immediately when the replica set is electing a new primary.'
    );
    return res.status(503).json({
      data: {
        status: 'reconnecting',
        readyState,
        readyStateLabel: READY_STATE_LABELS[readyState] || 'unknown',
        message: 'MongoDB replica set is reconnecting, please retry shortly',
      },
      meta: buildMeta(req),
    });
  }
  next();
};

// Demo / Observability / Sharding / Benchmark / Change Stream routes
app.use('/demo', demoRoutes);

// API routes
app.use('/auth', requireDbReady, authRoutes);
app.use('/me', requireDbReady, meRoutes);
app.use('/courses', requireDbReady, courseRoutes);
app.use('/subjects', requireDbReady, courseRoutes);
app.use('/attendance', requireDbReady, attendanceRoutes);
app.use('/timetable', requireDbReady, timetableRoutes);
app.use('/notifications', requireDbReady, notificationRoutes);
app.use('/students', requireDbReady, studentRoutes);
app.use('/analytics', requireDbReady, analyticsRoutes);
app.use('/admin', requireDbReady, adminRoutes);

// 404 handler (wrapped with meta via mongoTraceMiddleware)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (wrapped with meta via mongoTraceMiddleware)
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Campus Student API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
