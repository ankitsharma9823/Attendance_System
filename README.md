# Attendance Management System

A modern, full-stack attendance and workforce management platform designed for organizations that rely on biometric attendance capture. This application combines a responsive web dashboard with backend services for device synchronization, attendance tracking, analytics, leave management, and user administration.

## Overview

The Attendance Management System provides a centralized way to manage employee attendance using biometric devices such as ZKTeco-compatible machines. It supports:

- Biometric device integration and attendance sync
- Daily attendance review and manual status overrides
- Attendance analytics and overtime reporting
- Leave and holiday request workflows
- User management for both application users and device users
- Secure authentication with email verification and password reset support

## Key Features

### 1. Biometric Device Integration
- Connects to biometric devices through backend device services
- Supports manual sync and optional real-time punch processing
- Imports and restores machine users from the device to the database
- Keeps attendance records and machine user data backed up in PostgreSQL

### 2. Attendance Management
- View daily attendance records in a structured ledger
- Monitor check-in, check-out, break timings, and overtime
- Manually update attendance status such as Present, Late, Absent, Half Day, Early Leave, or Leave
- Sync attendance data directly from the device when needed

### 3. Analytics and Reporting
- Executive-style dashboard with attendance summaries
- Visual charts for attendance distribution and overtime trends
- Monthly and yearly reporting views for employee performance insights

### 4. Leave and Holiday Requests
- Employees can submit leave requests through a simple request workflow
- Requests can be tracked with status updates and admin notes
- Supports a conversational-style UI for request history

### 5. User Administration
- Manage application users with role-based access
- Manage biometric machine users separately from app users
- Add, edit, and remove users with a simple admin interface

### 6. Secure Authentication
- User registration and login
- Email verification flow
- Password reset and recovery support
- JWT-based authentication with rate limiting

## Technology Stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui style components
- Recharts for analytics visualization
- Socket.IO client for live updates

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- JWT authentication
- Nodemailer for email delivery
- ZKTeco device integration via node-zklib

## Project Structure

- Backend/ - Express API, Prisma schema, device engine, authentication, attendance, and holiday modules
- frontend/ - Next.js app router frontend, pages, services, and UI components
- architecture.md - implementation and system architecture notes

## Prerequisites

Before running the application, make sure you have:

- Node.js 20+ installed
- npm installed
- PostgreSQL server running
- A biometric device (optional for live sync, but recommended for full functionality)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ankitsharma9823/Attendance_System.git
cd Attendance_System
```

### 2. Configure the backend

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory with the required environment variables, including:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=your_sender_email
FRONTEND_URL=your_frontend_url
DEVICE_IP=your_device_ip
DEVICE_PORT=your_device_port
DEVICE_PASSWORD=your_device_password
PORT=4001
```

Then initialize the database:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

If you prefer a non-migration setup during local development, you may use Prisma push as appropriate for your workflow.

### 3. Configure the frontend

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the `frontend` directory with the backend URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

### 4. Run the application

Start the backend:

```bash
cd Backend
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend should be available at `http://localhost:3000` and the backend API at `http://localhost:4001`.

## Usage

Once the app is running:

- Register or log in as an application user
- Visit the attendance page to review and manage daily attendance records
- Use the sync action to pull attendance data from the connected biometric device
- Open the device users page to manage machine users and sync them with the database
- Submit leave requests and monitor their status
- Use the analytics dashboard for reporting and insights

## Notes

- The application uses PostgreSQL as the primary persistence layer for attendance records and user data.
- Device communication is handled by the backend, which acts as the bridge between the biometric machine and the web application.
- The project also includes scheduling and cron-based automation for attendance-related tasks.
- A detailed implementation overview is available in [architecture.md](architecture.md).

## License

This project is licensed under the MIT License.
