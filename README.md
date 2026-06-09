# Attendance System

An attendance monitoring system built with a Next.js frontend, Express backend, PostgreSQL database, Prisma ORM, Socket.IO live updates, and ZKTeco biometric device integration through `node-zklib`.

The backend is the bridge between the biometric machine, the database, and the frontend dashboard.

```txt
Biometric Machine
  |
  | node-zklib TCP socket
  v
Backend Express + Device Engine
  |
  | Prisma
  v
PostgreSQL Database
  ^
  |
  | REST API
Frontend Next.js
  ^
  |
  | Socket.IO WebSocket notification
Backend emits deviceStatus
```

## Features

- Biometric attendance sync from a ZKTeco-compatible machine
- Employee import from device to database
- Employee restore from database back to device
- Daily and yearly attendance views
- Attendance status calculation using configurable schedule windows
- Check-in, break-out, break-in, and check-out handling
- Real-time frontend refresh using Socket.IO
- Manual device sync operations
- Auth with email verification and password reset support
- PostgreSQL persistence through Prisma

## Project Structure

```txt
Attendance_System/
  Backend/
    src/
      app.ts                         Express app, middleware, routes
      server.ts                      HTTP server, Socket.IO, startup jobs
      config/
        db.ts                        Prisma/PostgreSQL client setup
        device.config.ts             Biometric machine config
      modules/
        attendance/                  Attendance API routes/controllers
        auth/                        Login, registration, email verification
        device/                      Device routes, controller, engine
        schedule/                    Attendance schedule API
      services/
        punch.service.ts             Main punch validation and save logic
        schedule.service.ts          Schedule cache/default schedule
        absent.service.ts            Absent backfill job
      utils/
        jjwt.ts                      JWT helpers
        email.service.ts             Email service
    prisma/
      schema.prisma                  Database models

  frontend/
    app/                             Next.js app routes
    components/                      Shared UI components
    lib/                             API client/helpers
    services/                        Frontend API service wrappers
    types/                           Shared frontend types

  architecture.md                    Detailed architecture notes
```

## Main Architecture

The system has two separate connection types:

```txt
Backend <-> Biometric Machine
Uses node-zklib TCP socket
Purpose: read punches, sync users, manage device data

Frontend <-> Backend
Uses HTTP REST API and Socket.IO WebSocket
Purpose: fetch data and refresh UI in real time
```

The biometric machine does not connect directly to the frontend. The frontend does not talk directly to the biometric machine.

## WebSocket Flow

Socket.IO is used only as a notification layer. It does not send the full attendance table.

```txt
Employee punches biometric machine
  ↓
Backend receives/syncs punch
  ↓
PunchService validates punch
  ↓
WorkRecord is saved/updated in PostgreSQL
  ↓
Backend emits deviceStatus over Socket.IO
  ↓
Frontend receives deviceStatus
  ↓
Frontend calls GET /api/attendance/daily
  ↓
Attendance table refreshes
```

Socket server setup:

```ts
const httpServer = http.createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
```

Trigger point:

```ts
io.emit("deviceStatus", {
  employeeId,
  date: dateUTC,
  status: upsertData.status ?? status,
});
```

Frontend listener:

```ts
socket.on("deviceStatus", (payload) => {
  if (payload?.date === selectedDate) {
    fetchToday();
  }
});
```

Current behavior:

- Backend sends `deviceStatus` to all connected clients using `io.emit`.
- Frontend only listens; it does not emit socket events back to the backend.
- No Socket.IO rooms are currently used.
- The database and REST API remain the source of truth.

## Backend Setup

```bash
cd Backend
npm install
```

Create `Backend/.env`:

```env
PORT=4002
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/attendance_db"

JWT_SECRET="replace-with-a-secure-secret"
JWT_EXPIRES_IN="1d"

FRONTEND_URL="http://localhost:3000"

DEVICE_IP="192.168.1.201"
DEVICE_PORT=4370
DEVICE_TIMEOUT=180000
DEVICE_IN_PORT=4000
DEVICE_PASSWORD=0

DEVICE_STARTUP_SYNC=false
DEVICE_AUTO_SYNC=false
DEVICE_REALTIME_SYNC=false
PUNCH_DEBOUNCE_SECONDS=45

DEFAULT_CHECK_IN_START="07:00"
DEFAULT_CHECK_IN_END="10:30"
DEFAULT_BREAK_OUT_START="12:30"
DEFAULT_BREAK_OUT_END="14:00"
DEFAULT_BREAK_IN_START="13:00"
DEFAULT_BREAK_IN_END="14:30"
DEFAULT_CHECK_OUT_START="17:00"
DEFAULT_CHECK_OUT_END="21:00"
DEFAULT_MIN_INTERVAL=5
DEFAULT_HALF_DAY=240
DEFAULT_MAX_PUNCHES=4

SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
```

Generate/apply database schema as needed:

```bash
npx prisma generate
npx prisma db push
```

Run backend in development:

```bash
npm run dev
```

Backend health check:

```txt
GET http://localhost:4002/health
```

## Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4002/api"
```

Run frontend in development:

```bash
npm run dev
```

Frontend usually runs at:

```txt
http://localhost:3000
```

## Scripts

Backend:

```bash
npm run dev      # start backend with tsx watch
npm run build    # compile TypeScript
npm run start    # run compiled backend
```

Frontend:

```bash
npm run dev      # start Next.js dev server
npm run build    # production build
npm run start    # start production server
npm run lint     # run ESLint
```

## API Map

Base backend routes:

```txt
GET  /health

/api/auth
/api/attendance
/api/device
/api/schedule
```

Auth routes:

```txt
POST /api/auth/verify-email
POST /api/auth/resend-verification
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/admin/register
```

Attendance routes:

```txt
GET    /api/attendance/daily
GET    /api/attendance/yearly
GET    /api/attendance/stats/yearly
DELETE /api/attendance/:id
```

Device routes:

```txt
POST   /api/device/sync
POST   /api/device/sync-time
POST   /api/device/reset-cursors
POST   /api/device/sync-employees
POST   /api/device/sync-from-db
GET    /api/device/machine-time
POST   /api/device/cleanup

GET    /api/device/users
POST   /api/device/users
PATCH  /api/device/users/:id
DELETE /api/device/users/:id
POST   /api/device/users/:id/clear-fp
```

Schedule routes:

```txt
GET /api/schedule
PUT /api/schedule
```

## Database Models

Main Prisma models:

- `Employee`: employee/user stored from the biometric machine or database
- `WorkRecord`: daily attendance record for each employee
- `User`: application login user
- `AttendanceSchedule`: configurable attendance windows
- `SyncLog`: processed device log tracking
- `Holiday`: public/company holiday dates

## Attendance Logic

Punches are processed by `Backend/src/services/punch.service.ts`.

Main logic:

1. Check employee exists.
2. Convert timestamp to Nepal time.
3. Load attendance schedule.
4. Match punch to a schedule window.
5. Ignore punches outside valid windows.
6. Prevent duplicate filled slots.
7. Validate sequence.
8. Create or update `WorkRecord`.
9. Emit `deviceStatus` so frontend can refresh.

Supported attendance slots:

```txt
checkIn
breakOut
breakIn
checkOut
```

## Device Sync Modes

Manual sync:

```txt
Frontend Sync button
  -> POST /api/device/sync
  -> Backend reads biometric logs
  -> Backend saves records
  -> Frontend reloads data
```

Optional real-time listener:

```txt
DEVICE_AUTO_SYNC=true
or
DEVICE_REALTIME_SYNC=true
```

When enabled, the backend starts a listener for device punch events and then emits frontend Socket.IO notifications.

Startup sync:

```txt
DEVICE_STARTUP_SYNC=true
```

When enabled, the backend syncs device time, imports employee profiles, and starts the real-time listener during startup.

## Notes For Maintenance

If live updates stop working, check these three places:

```txt
1. Backend Socket.IO server
   Backend/src/server.ts

2. Backend emit trigger
   Backend/src/services/punch.service.ts

3. Frontend socket listener
   frontend/app/attendance/today/page.tsx
```

Common improvements:

- Send socket dates as `YYYY-MM-DD` strings to match frontend selected dates.
- Debounce frontend `fetchToday()` when many punches arrive quickly.
- Restrict Socket.IO CORS to the deployed frontend domain in production.
- Add Socket.IO rooms later if only specific users should receive updates.
- Keep REST API and database as the source of truth.

