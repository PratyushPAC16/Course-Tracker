# Group 29 - My Courses Project

## Team Members

- Group Number: 29
- Pratyush Anand - 23BEC039

## Project Overview

My Courses is a full-stack course management application with:

- **Interactive Workspace**: Swappable views for Dashboard, My Courses, Enrollment, and Progress pages.
- **My Courses Portal**: Grid & list view toggles for modules, live search, status filtration, and topic completion progress indicators.
- **Enrollment Center**: Register for open classes, withdraw from enrolled ones, or register/cancel waitlisted modules.
- **Academic Progress**: Visualized analytics with cumulative GPA tracker, completion rates, workload metrics, and semester-wise timeline reports.
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB (Mongoose) with extended "Waitlisted" status support
- **Auth**: Cookie-based JWT access and refresh token flow
- **Demo Support**: UI can run in demo mode even when backend is unavailable

## Current Repository Structure

```text
Group29Finalproject/
├── README.md
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── legacy/
│   │   ├── app.js
│   │   └── data/
│   │       └── courses.json
│   └── src/
│       ├── app.js
│       ├── config/
│       │   └── db.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   └── course.controller.js
│       ├── data/
│       │   └── courses.json
│       ├── middlewares/
│       │   ├── auth.middleware.js
│       │   └── error.middleware.js
│       ├── models/
│       │   ├── course.model.js
│       │   └── user.model.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   └── course.routes.js
│       ├── services/
│       │   ├── auth.service.js
│       │   └── course.service.js
│       ├── utils/
│       │   ├── crypto.js
│       │   └── token.js
│       └── validators/
│           └── auth.validator.js
└── frontend/
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── app/
        │   └── App.jsx
        ├── components/
        │   ├── auth/
        │   │   └── LoginForm.jsx
        │   ├── courses/
        │   │   ├── CourseCard.jsx
        │   │   ├── CourseForm.jsx
        │   │   ├── CourseModal.jsx
        │   │   ├── MyCoursesView.jsx
        │   │   ├── EnrollmentView.jsx
        │   │   └── ProgressView.jsx
        │   └── ui/
        │       ├── ActionButton.jsx
        │       ├── Notice.jsx
        │       └── StatusPill.jsx
        ├── features/
        │   ├── auth/
        │   │   ├── auth.service.js
        │   │   └── auth.storage.js
        │   └── courses/
        │       ├── course.service.js
        │       └── demo.data.js
        ├── lib/
        │   └── http.js
        ├── pages/
        │   ├── DashboardPage.jsx
        │   └── LoginPage.jsx
        └── styles/
            └── index.css
```

## Architecture

```text
[React Frontend (Vite)]
        |
        | HTTP (cookies enabled)
        v
[Express Backend API]
        |
        | Mongoose
        v
[MongoDB]
```

### Main API Paths

- Auth routes: /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/refresh-token, /api/auth/me
- Course routes: /courses, /course/:id, /course

## Environment Configuration

### Backend

Create backend/.env from backend/.env.example and set:

- PORT=3000
- FRONTEND_ORIGIN=http://localhost:5173
- MONGODB_URI=your-mongodb-connection-string
- DB_NAME=mycourses
- JWT_ACCESS_SECRET=your-strong-secret
- JWT_REFRESH_SECRET=your-strong-secret

Important:

- If MONGODB_URI is missing, backend cannot start.
- Frontend can still be opened and used in demo mode.

### Frontend

frontend/.env is optional.

- Keep VITE_API_BASE_URL empty for local proxy setup.
- Or set VITE_API_BASE_URL to backend URL if deploying frontend/backend separately.

## Run Instructions

There is no root package.json script setup in this repo right now, so run each app from its own folder.

### 1) Start Backend (for full live mode)

```bash
cd backend
npm install
npm start
```

### 2) Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in terminal (usually http://localhost:5173).

## How To Use The App (Step by Step)

### Option A: Full Live Mode (Backend + MongoDB available)

1. Open the Login page.
2. Click Sign Up to create an account.
3. Enter email and strong password.
4. Click Create Account.
5. Then Sign In with the same credentials.
6. Go to Dashboard and manage courses (create, edit, view, delete).

### Option B: Demo Mode (No MongoDB URL / backend unavailable)

1. Open the Login page.
2. Click Open Dashboard Demo.
3. App opens dashboard with demo course data.
4. You can still explore UI, filters, form flow, and interactions.

Notes for demo mode:

- If backend is not reachable, dashboard will show a message explaining live backend is unavailable.
- If MONGODB_URI is missing, this is expected and demo mode should be used for presentation.

## Deployment Notes

- Configure all backend environment variables in production.
- Set frontend API base URL if frontend and backend are hosted on different origins.
- Enable SPA fallback routing for frontend hosting so /dashboard works on page refresh.

## Professional Checklist Before Demo/Submission

1. Backend .env is configured correctly.
2. MongoDB is reachable from backend runtime.
3. Frontend can call backend API successfully.
4. Login/Signup flow works.
5. Demo mode works when backend is intentionally unavailable.
