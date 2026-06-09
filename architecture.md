# Attendance System Architecture

## Overview

This project is an attendance monitoring system with:
- `Backend/`: Express + Prisma + PostgreSQL + device integration
- `frontend/`: Next.js 16 + React 19 + Socket.IO client
- Biometric device integration using ZKTeco device SDK via `node-zklib`

The system is designed to keep attendances and machine users backed up in the database, with manual and optional real-time sync between the biometric device and backend.

## Key components

### Backend

- `Backend/src/app.ts`: Express app with API routes and middleware
- `Backend/src/server.ts`: Starts HTTP server and Socket.IO, initializes device engine
- `Backend/src/modules/device/device.engine.ts`: Connects to the biometric device, syncs logs and users, and starts real-time listener
- `Backend/src/modules/device/device.controller.ts`: API handlers for manual device operations
- `Backend/src/modules/device/device.route.ts`: Routes for device sync operations
- `Backend/src/services/punch.service.ts`: Processes attendance logs and emits `deviceStatus` events
- `Backend/src/services/schedule.service.ts`: Loads schedule cache for attendance status logic

### Frontend

- `frontend/app/attendance/today/page.tsx`: Attendance dashboard for the selected date
- `frontend/components/shared/SyncButton.tsx`: Manual sync button for attendance
- `frontend/services/attendance-service.ts`: Attendance-related API wrapper
- `frontend/services/device-service.ts`: Device user import / restore API wrapper
- `frontend/app/device/users/page.tsx`: Machine user management UI

## How device communication works

### Device polling vs webhook

- The biometric device is not contacted via a webhook.
- The backend uses direct device commands via `node-zklib`.
- Attendance capture happens through an engine that:
  - can run `syncWithMachine()` on demand to read attendance logs from the device
  - optionally starts a real-time listener when configured

### Real-time listener

- `Backend/src/server.ts` starts `startRealTimeListener()` during startup when environment flags enable it:
  - `DEVICE_AUTO_SYNC=true` or `DEVICE_REALTIME_SYNC=true`
- The listener keeps a socket connection with the device and receives events when new punches arrive.
- When a new punch is processed, the backend emits `deviceStatus` over Socket.IO.

### Frontend real-time updates

- `frontend/app/attendance/today/page.tsx` opens a Socket.IO connection using `transports: ['websocket']`
- It listens for `deviceStatus` events
- When a device status event matches the current date, the frontend refreshes attendance data

## WebSocket architecture

The project uses WebSocket through Socket.IO only for frontend live updates. It does not use WebSocket to connect to the biometric machine.

```txt
Biometric Machine
  |
  | node-zklib TCP socket
  v
Backend device.engine.ts
  |
  | raw punch data
  v
PunchService.handlePunch(...)
  |
  | validate + save WorkRecord
  v
PostgreSQL Database
  |
  | io.emit("deviceStatus", payload)
  v
Socket.IO server
  |
  | WebSocket event
  v
Frontend attendance page
  |
  | fetchToday()
  v
GET /api/attendance/daily?date=...
```

### Socket.IO server

The Socket.IO server is created in `Backend/src/server.ts`.

```ts
const httpServer = http.createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
```

The backend uses `httpServer.listen(...)` instead of `app.listen(...)` because Socket.IO must attach to the HTTP server. Express API routes and Socket.IO run on the same backend port.

### Frontend socket connection

The frontend connection is opened in `frontend/app/attendance/today/page.tsx`.

```ts
const socket = io({ transports: ['websocket'] });
```

This creates a live browser-to-backend connection while the attendance page is mounted.

```txt
Frontend browser <-> Backend Socket.IO server
```

When the user leaves the page, the frontend closes the connection.

```ts
return () => {
  socket.disconnect();
};
```

### Trigger point

The WebSocket trigger point is in `Backend/src/services/punch.service.ts`.

```ts
io.emit("deviceStatus", {
  employeeId,
  date: dateUTC,
  status: upsertData.status ?? status,
});
```

This line runs after a punch is accepted and the `WorkRecord` is saved or updated in the database.

The trigger means:

```txt
Attendance changed for an employee/date/status.
Notify connected frontend clients.
```

### Event name and payload

The event name is:

```txt
deviceStatus
```

The backend sends this payload:

```ts
{
  employeeId,
  date,
  status
}
```

The payload is a notification payload, not the full attendance table. The database remains the source of truth.

### Frontend listener

The frontend listens for the same event name.

```ts
socket.on('deviceStatus', (payload) => {
  if (payload?.date === selectedDate) {
    fetchToday();
  }
});
```

When the event date matches the selected date, the frontend reloads attendance using the normal REST API.

```txt
Socket event received
  -> fetchToday()
  -> GET /api/attendance/daily?date=selectedDate
  -> update React state
  -> table refreshes
```

### Current communication direction

The current Socket.IO usage is one-way:

```txt
Backend -> Frontend
```

The frontend listens for events, but it does not emit socket events back to the backend.

### Broadcast behavior

The backend currently uses:

```ts
io.emit("deviceStatus", payload);
```

This broadcasts the event to every connected frontend client.

```txt
All open attendance pages receive the event.
```

The project does not currently use Socket.IO rooms.

```txt
No socket.join(...)
No io.to(room).emit(...)
No admin-only or department-only socket channel
```

Rooms can be added later if events should only go to specific users, roles, departments, or classes.

### WebSocket vs device socket

There are two different socket concepts in this project.

```txt
Backend <-> Frontend
Uses Socket.IO WebSocket
Purpose: notify frontend that attendance changed

Backend <-> Biometric Machine
Uses node-zklib TCP socket
Purpose: read punches and manage device data
```

The biometric machine does not connect to Socket.IO. The frontend does not connect directly to the biometric machine. The backend is the bridge between both sides.

### Debouncing consideration

If many punches arrive quickly, the backend may emit many `deviceStatus` events. Without debouncing, the frontend can call `fetchToday()` many times.

```txt
10 quick punches
  -> 10 socket events
  -> 10 API refreshes
```

A debounce on the frontend can reduce this.

```txt
10 quick punches
  -> wait briefly
  -> 1 API refresh
```

Debouncing is useful because the socket is only a notification layer. The expensive part is the follow-up REST API refresh.

### Recommended production improvements

- Send the socket date as a `YYYY-MM-DD` string so it matches `selectedDate` reliably.
- Add frontend debounce around `fetchToday()` to avoid repeated API calls during punch bursts.
- Restrict Socket.IO CORS origin to the real frontend domain instead of `'*'`.
- Add rooms later only if events need to be scoped by role, department, class, or tenant.
- Keep the database and REST API as the source of truth; do not make the socket payload the only attendance data source.

## Manual sync operations

### Attendance sync button

- The Sync button on the attendance page triggers a backend API call that reads current attendance logs from the device.
- This is a manual device poll, not a webhook.
- After the sync completes, the front end reloads the selected date data.

### Machine user sync and restore

- The machine users page supports two separate actions:
  1. Import device users into the database (`POST /api/device/sync-employees`)
  2. Restore users from the database back to the device (`POST /api/device/sync-from-db`)
- This ensures machine user registry is backed up and can be repopulated if the device data is lost.

## Data persistence and backup

### Attendance data

- Punch logs from the biometric device are persisted into PostgreSQL.
- `WorkRecord` entries store attendance events, check-in/check-out, and status.
- These are the DB backup for attendance.

### Machine user data

- User identities and roles are stored in DB-backed `Employee` records.
- The device engine can import the machine user registry into the database and later restore it from the database.
- This gives a durable backup path for machine user data in case the device is reset or cleared.

## System flows

### Startup

1. Express app boots.
2. Device engine optionally syncs device time and employee registry if `DEVICE_STARTUP_SYNC=true`.
3. Real-time listener may start if configured.
4. Schedule cache loads and absent jobs begin.

### Attendance refresh

- Manual flow: user presses sync button → backend polls device → writes attendance records to DB → frontend reloads data.
- Real-time flow: device event arrives → backend processes and saves attendance → backend emits `deviceStatus` → frontend refreshes if needed.

### User backup / restore

- Backup flow: call import API to copy device employees into DB.
- Restore flow: call restore API to push current DB user records back to the device.

## Important notes

- The system does not use a webhook from the biometric device.
- It relies on direct device communication and Socket.IO for real-time app updates.
- Device user persistence is handled explicitly through separate backup/restore APIs.

## Recommended terminology

- `Polling`: the backend polls the device when triggered or during sync retries.
- `Real-time listener`: the backend keeps a socket open with the device and emits front-end events.
- `Database backup`: attendance and user records are stored in PostgreSQL.
- `Restore`: database users can be written back to the device when needed.

## What this means for the project

- Attendance and user backups are stored safely in the DB.
- Frontend refresh works with socket notifications rather than HTTP polling.
- If the device is reset or data is lost, the database can be used to restore user records.
- Manual sync buttons are the explicit trigger points for on-demand device reads.
