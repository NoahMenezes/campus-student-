#!/usr/bin/env node
/**
 * Lightweight local authentication server for Konnakol Campus Student.
 * Uses native Node.js HTTP module (no extra dependencies required).
 * Handles CORS and provides /auth/login and /auth/signup endpoints.
 */

import http from 'node:http';

const PORT = process.env.PORT || 4000;

// In-memory student store
const users = new Map([
  [
    'nnm1.s24@gec.ac.in',
    {
      id: 'usr_student_01',
      name: 'Noah Menezes',
      email: 'nnm1.s24@gec.ac.in',
      password: 'password123',
    },
  ],
]);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && path === '/auth/signup') {
    try {
      const body = await parseJsonBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const name = (body.name || '').trim();
      const password = body.password || '';

      if (!email || !name || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Name, email, and password are required' }));
        return;
      }

      const id = 'usr_' + Date.now().toString(36);
      const user = { id, name, email, password };
      users.set(email, user);

      const token = 'jwt_token_' + Buffer.from(email + ':' + Date.now()).toString('base64');

      console.log(`[AUTH] Registered new student: ${name} (${email})`);

      res.writeHead(200);
      res.end(
        JSON.stringify({
          token,
          user: { id, name, email, role: 'student' },
        })
      );
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && path === '/auth/login') {
    try {
      const body = await parseJsonBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const password = body.password || '';

      if (!email || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Email and password are required' }));
        return;
      }

      let user = users.get(email);
      if (!user) {
        // Auto-register for smooth student development onboarding
        const name = email.split('@')[0];
        user = {
          id: 'usr_' + Date.now().toString(36),
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email,
          password,
        };
        users.set(email, user);
      }

      const token = 'jwt_token_' + Buffer.from(email + ':' + Date.now()).toString('base64');

      console.log(`[AUTH] Signed in student: ${user.name} (${email})`);

      res.writeHead(200);
      res.end(
        JSON.stringify({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: 'student' },
        })
      );
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET' && path === '/attendance') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        semester: 'Semester 5',
        overallPercentage: 0,
        attendedClasses: 0,
        totalClasses: 0,
        subjects: [
          { id: 'sub_dbms_th', code: 'CECMP300', name: 'Database Management Systems', type: 'theory', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_dbms_pr', code: 'CECMP301', name: 'Database Management Systems Lab', type: 'lab', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_dccn_th', code: 'CECMP302', name: 'Data Communication & Computer Networks', type: 'theory', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_dccn_pr', code: 'CECMP303', name: 'Data Communication & Computer Networks Lab', type: 'lab', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_ai_th', code: 'CECMP304', name: 'Artificial Intelligence', type: 'theory', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_ai_pr', code: 'CECMP305', name: 'Artificial Intelligence Lab', type: 'lab', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_daa_th', code: 'CECMP306', name: 'Design & Analysis of Algorithms', type: 'theory', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_daa_pr', code: 'CECMP307', name: 'Design & Analysis of Algorithms Lab', type: 'lab', category: 'mandatory', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_sc_th', code: 'CECMP325', name: 'Soft Computing', type: 'theory', category: 'elective', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
          { id: 'sub_sc_pr', code: 'CECMP326', name: 'Soft Computing Lab', type: 'lab', category: 'elective', attended: 0, total: 0, percentage: 0, progressColor: '#4B5563' },
        ],
      })
    );
    return;
  }

  if (path === '/health' || path === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'konnakol-auth-service', port: PORT }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n Konnakol Auth Server running on http://localhost:${PORT}`);
  console.log(` Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/auth/signup`);
  console.log(`   POST http://localhost:${PORT}/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/health\n`);
});

