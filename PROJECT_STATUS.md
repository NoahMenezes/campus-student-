# Project Status Report: Campus Student (Konnakol Attendance Management System)

**Generated Date:** November 25, 2026  
**Repository:** `campus-student-`  
**Workspace:** `/home/piyush/Documents/DBMS/Mongo_DB/campus-student-`  
**Current Branch:** `main`  
**Latest Commit:** `81ba733` — *feat: complete Sem 5 attendance management system with timetable engine, today/yesterday views, monthly reports, notification alerts, and fix native barcode crash*

---

## 1. Executive Summary

**Campus Student** (also referred to as **Konnakol**) is a full-stack, mobile-first academic attendance tracking and management system tailored for engineering students. The current deployment focuses on **Semester 5 Computer Engineering** at **Goa College of Engineering (GEC)**.

The system addresses the 75% mandatory attendance requirement by providing automated lecture tracking, batch-aware timetable scheduling (Batches C & D), real-time notifications when classes start, instant attendance logging, and deficit analytics ("classes needed to reach 75%").

### Health & Quality Indicators
- **TypeScript Typecheck (`npx tsc --noEmit`):** Passed with **0 errors**.
- **ESLint (`npx expo lint`):** Passed with **0 warnings / 0 errors**.
- **Git Tree:** Clean (all commits synced to `origin/main`).
- **Runtime Target:** Cross-platform (Android, iOS, Web via Expo SDK 58 & React Native 0.88).

---

## 2. Technology Stack & Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Client Layer (Expo / React Native)                   │
│                                                                        │
│   Expo Router (src/app/)  ───► Glassmorphic Design System (src/glass/) │
│             │                                                          │
│             ├──► Local Engine (src/services/attendance-manager.ts)    │
│             │       └─► Timetable & IST Engine (timetable.ts)         │
│             │       └─► In-App Notification Manager (notifications.ts) │
│             │       └─► Client Storage (AsyncStorage / SecureStore)   │
│             │                                                          │
│             └──► REST API Service (src/services/attendance.ts, auth.ts)│
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTP / JSON (Port 4000)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Server Layer (Node.js & Express 5)                   │
│                                                                        │
│   Middleware: Helmet, CORS, Express-Rate-Limit, JWT Auth Gatekeeper    │
│   Routes: /auth, /subjects, /timetable, /attendance, /health           │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Mongoose ODM
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Database Layer (MongoDB)                             │
│                                                                        │
│   Database: campus_student                                             │
│   Collections: users, subjects, timetables, attendances,               │
│                attendancerecords, attendancesessions,                  │
│                studentenrollments, notifications, etc.                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Tech Stack Matrix

| Domain | Technology / Library | Version | Role / Purpose |
| :--- | :--- | :--- | :--- |
| **Mobile Runtime** | Expo SDK | `~58.0.26` | Unified cross-platform app framework |
| **Frontend Framework** | React / React Native | `19.3.0` / `0.88.1` | UI rendering engine |
| **Navigation** | Expo Router | `~58.0.32` | Typed, file-based routing |
| **Animations** | React Native Reanimated | `4.7.1` | Micro-interactions and fluid screen transitions |
| **Styling** | Custom Glassmorphic System | Native StyleSheet | Dark-themed, high-contrast UI (zero-emoji) |
| **Hardware / Sensors**| `expo-camera`, `expo-notifications`| `~58.0.14`, `~58.1.9` | QR Code scanning & native lecture push alerts |
| **Backend Framework** | Express.js | `^5.3.0` | REST API HTTP server |
| **Security** | Helmet, bcryptjs, JWT, RateLimit | Latest | API protection, credential hashing, bearer tokens |
| **Database** | MongoDB / Mongoose | `^9.12.2` | Document database & schema validation |
| **Validation** | Zod & Express Validator | `^4.6.7` / `^7.3.2` | End-to-end client/server runtime schema validation |

---

## 3. Database Schema & Models (`server/models/`)

The backend schema features 10 Mongoose models supporting both core attendance tracking and enterprise academic operations:

| Model | File | Primary Fields & Purpose |
| :--- | :--- | :--- |
| **`User`** | `server/models/User.js` | Name, email (unique), password (bcrypt), role (`student`, `faculty`, `admin`), roll number, department, semester, academic year, `isOfflineMode`. |
| **`Subject`** | `server/models/Subject.js` | Code (`CECMP300`, unique uppercase), name, type (`theory`, `lab`), category (`mandatory`, `elective`), semester (5), department, academic level (`SE`). |
| **`Timetable`** | `server/models/Timetable.js` | Day (`Monday`–`Friday`), time, subject ref (`Subject`), faculty ref (`User`), room (`CR-204`, `Lab 3`), type (`theory`, `lab`), semester. |
| **`Attendance`** | `server/models/Attendance.js` | Direct student attendance record: student ref, subject ref, date, status (`present`, `absent`, `late`), markedBy ref, sessionCode. Indexed on `(student, subject, date)`. |
| **`AttendanceRecord`** | `server/models/AttendanceRecord.js`| Extended audit schema: `studentEnrollment`, `attendanceSession`, `subject`, status (`present`, `absent`, `pending`), markedAt, source (`student_app`, `faculty_app`), correctionHistory. |
| **`AttendanceSession`**| `server/models/AttendanceSession.js`| Session instance: timetableEntry, scheduledDate, startTime, endTime, sessionType (`theory`, `lab`, `other`), labBatch (`C`, `D`), durationMinutes, sessionStatus. |
| **`StudentEnrollment`**| `server/models/StudentEnrollment.js`| Student academic grouping: semester (5), section (`B`), labBatch (`C`, `D`), department (`Computer Engineering`), institution (`Goa College of Engineering`), timezone (`Asia/Kolkata`). |
| **`Notification`** | `server/models/Notification.js` | In-app notification queue: type (`lecture_started`, `attendance_pending`, `low_attendance_warning`, etc.), title, body, scheduledFor, sentAt, isRead, isSent. |
| **`NotificationPreference`**| `server/models/NotificationPreference.js`| Student alerting preferences: lectureStartNotifications, reminderIntervalMinutes, lowAttendanceWarning, quietHours. |
| **`TimetableException`**| `server/models/TimetableException.js`| Academic calendar overrides: holiday, cancelled, rescheduled sessions, batch-specific cancellations. |

---

## 4. Backend API Routes (`server/routes/`)

The Express server exposes modular REST endpoints running by default on port `4000`:

### 4.1 Authentication (`/auth`)
- `POST /auth/register` — Validates email/password/name, creates student/faculty account, issues 7-day JWT.
- `POST /auth/login` — Authenticates credentials, returns user profile + bearer token.
- `GET /auth/me` — Protected by `authenticateToken`, returns active authenticated user payload.

### 4.2 Subjects (`/subjects`)
- `GET /subjects` — Fetches subjects filtered by `semester` and `category`.
- `GET /subjects/:id` — Retrieves individual subject details.
- `POST /subjects` — Faculty/Admin only: creates subject with uppercase code enforcement.
- `PUT /subjects/:id` — Faculty/Admin only: updates subject attributes.
- `DELETE /subjects/:id` — Admin only: removes subject from curriculum.

### 4.3 Timetable (`/timetable`)
- `GET /timetable` — Returns weekly schedule grouped by day (`Monday` through `Friday`) populated with subject and faculty references.
- `POST /timetable` — Faculty/Admin: registers schedule entries.

### 4.4 Attendance (`/attendance`)
- `GET /attendance` — Calculates student's overall attendance %, subject-wise statistics, progress colors, and threshold warning states.
- `GET /attendance/history` — Returns chronologically sorted log of past marked attendances with optional status filtering (`present`, `absent`, `all`).
- `POST /attendance` — Faculty/Admin: marks official attendance record with conflict detection for duplicate markings on the same date.
- `GET /attendance/stats` — Faculty/Admin: aggregated student and institution-level attendance rates.

### 4.5 Seeding Routine (`server/seed.js`)
- Pre-populates default faculty (`faculty@campus.edu`), default student (`student@campus.edu`), all 10 Semester 5 subjects, and complete Monday–Friday lecture slots.

---

## 5. Frontend Screens & Navigation (`src/app/`)

Navigation is organized via a custom dark-glass bottom tab bar across 5 primary destinations (`home`, `today`, `subjects`, `reports`, `timetable`) supplemented by auxiliary tool screens:

```
src/app/
├── _layout.tsx              # Root Stack Navigator, theme provider, splash overlay
├── index.tsx                # Auth state redirector (router.replace to /home or /login)
├── login.tsx                # Glassmorphic login with offline bypass
├── signup.tsx               # Student registration with Zod validation
├── home.tsx                 # [Tab 1] Master dashboard with live stats & quick mark
├── today.tsx                # [Tab 2] Today's time-ordered schedule & attendance toggle
├── subjects.tsx             # [Tab 3] 10 Semester 5 subjects with deficit analytics
├── monthly-reports.tsx      # [Tab 4] Monthly aggregation & historical breakdown
├── timetable.tsx            # [Tab 5] Weekly timetable viewer with batch toggle
├── yesterday.tsx            # Retrospective attendance review for the previous day
├── notifications.tsx        # Class start alerts & low-attendance notifications
├── calendar.tsx             # Monthly grid visualization of present/absent days
├── qr-scanner.tsx           # Native camera QR verification
├── attendance-history.tsx   # Detailed audit log of marked sessions
├── profile.tsx              # Student profile, Batch C/D selector, cache reset
└── explore.tsx              # Reference template component screen
```

---

## 6. Core Client-Side Engines

### 6.1 Timetable & Scheduling Engine (`src/services/timetable.ts`)
- **Curriculum Definition:** Configures 10 official Semester 5 Computer Engineering courses:
  - `CECMP300`: Database Management Systems (Theory)
  - `CECMP301`: Database Management Systems Lab (Lab)
  - `CECMP302`: Data Communication & Computer Networks (Theory)
  - `CECMP303`: Data Communication & Computer Networks Lab (Lab)
  - `CECMP304`: Artificial Intelligence (Theory)
  - `CECMP305`: Artificial Intelligence Lab (Lab)
  - `CECMP306`: Design & Analysis of Algorithms (Theory)
  - `CECMP307`: Design & Analysis of Algorithms Lab (Lab)
  - `CECMP325`: Soft Computing (Elective Theory)
  - `CECMP326`: Soft Computing Lab (Elective Lab)
  - `NCC301`: NCC / NSS / Mentoring
- **Timezone Awareness:** All calculations use Indian Standard Time (`Asia/Kolkata`).
- **Batch Resolution:** Handles split batches where Batch C and Batch D attend distinct labs simultaneously (e.g., Monday 09:00: DAA Lab for Batch C vs SC Lab for Batch D).
- **Dynamic Status Computation:** Compares current IST minutes against lecture start/end windows to assign statuses: `upcoming`, `started`, `unmarked`, `present`, `absent`.

### 6.2 Offline-First Attendance Manager (`src/services/attendance-manager.ts`)
- Persists all student session actions locally in `AsyncStorage` (`konnakol_attendance_records_v2`).
- Computes real-time summaries:
  - `getTodayAttendanceSummary(batch)`
  - `getYesterdayAttendanceSummary(batch)`
  - `getOverallAttendanceSummary()`
  - `getSubjectWiseAttendanceStats()` (computes classes needed to reach 75%)
  - `getMonthlyAttendanceReport(year, month)`

### 6.3 Background Notifications Engine (`src/services/notifications.ts`)
- Checks scheduled sessions for the current day against IST time.
- Automatically creates notifications when a lecture starts and delivers native push alerts via `expo-notifications` (on mobile platforms) while recording dispatch history to prevent duplicate alerts.

---

## 7. Feature Completion Matrix

| Feature / Module | Status | Notes / Capabilities |
| :--- | :---: | :--- |
| **User Authentication** | Completed | Email/password login, signup, token storage, and offline demo fallback. |
| **Glassmorphic UI** | Completed | High-contrast dark styling (`GlassCard`, `GlassButton`, `GlassInput`, `GlassView`). |
| **Sem 5 Timetable Engine** | Completed | Complete weekly schedule with lab batch filtering (C/D) and IST time parsing. |
| **Today's Attendance** | Completed | Live lecture cards with real-time status and instant Present/Absent marking. |
| **Yesterday's Attendance**| Completed | Retrospective catch-up screen for unlogged classes from the preceding day. |
| **Subject Breakdown** | Completed | 10 subjects with progress bars, warning colors, and class deficit calculation. |
| **Monthly Reports** | Completed | Historical month-by-month percentage breakdown across all subjects. |
| **Notification Center** | Completed | Automated lecture start dispatching, unread badges, mark-as-read, clear. |
| **QR Code Scanner** | Completed | Native camera integration with permission handling and code processing. |
| **Profile & Settings** | Completed | User details, batch selector (C/D), cache reset, and sign-out. |
| **Express Backend API** | Completed | Full CRUD for subjects/timetable and JWT-protected endpoints. |
| **MongoDB Schema** | Completed | 10 Mongoose schemas with indexing and seed script. |
| **Client-Server Sync** | In Progress | App currently uses `attendance-manager.ts` (AsyncStorage) on the frontend; API client in `attendance.ts` exists but full automated bidirectional sync is yet to be plugged in. |
| **Automated Test Suite** | Pending | Unit tests (`jest`) and API integration tests are not yet implemented. |

---

## 8. Current Observations & Recommended Next Steps

### 8.1 Client-Server Storage Alignment
- **Observation:** The frontend app primarily operates on `AsyncStorage` via `attendance-manager.ts` for instant offline responsiveness. The Express backend (`server/routes/attendance.js`) has its own MongoDB persistence.
- **Recommendation:** Implement a background synchronization hook (`useAttendanceSync` or Workbox/BackgroundSync) that posts locally stored records from `AsyncStorage` to the MongoDB `/attendance` endpoint when network connectivity is detected.

### 8.2 Student Attendance Authorization
- **Observation:** In `server/routes/attendance.js`, `POST /attendance` is guarded with `authorizeRoles('faculty', 'admin')`.
- **Recommendation:** If students mark their own attendance via QR code or student app self-checkin, create a dedicated endpoint `POST /attendance/self-mark` (verifying session code / QR token) accessible to students.

### 8.3 Automated Testing
- **Observation:** Static analysis passes (`tsc` and `eslint`), but automated test suites (`jest`, `supertest`) are not present in `package.json`.
- **Recommendation:** Introduce Jest with `@testing-library/react-native` for timetable engine unit tests and Supertest for Express API integration tests.

### 8.4 Production Deployment
- **Mobile:** Configure EAS (`eas.json`) profiles for staging and production Android APK / iOS builds.
- **Backend:** Add a `Dockerfile` and `docker-compose.yml` to spin up the Node server and MongoDB container together seamlessly.

---

*Report prepared by Antigravity Code Analysis Agent.*
