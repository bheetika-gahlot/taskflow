# ⚡ TaskFlow — Project Management App

A full-stack project management web app with role-based access control, task tracking, and a Kanban board.

## 🚀 Live Features

- **Authentication** — Signup/Login with JWT tokens
- **Role-Based Access** — Admin (full control) vs Member (view/update assigned tasks)
- **Project Management** — Create, edit, delete projects with deadlines & status
- **Team Management** — Add/remove members per project with Admin or Member roles
- **Task Tracking** — Create tasks, assign to members, set priority & due dates
- **Kanban Board** — Visual To Do / In Progress / Done columns per project
- **Dashboard** — Stats overview, recent tasks, overdue alerts

## 🔑 Demo Accounts

| Role   | Email                    | Password   |
|--------|--------------------------|------------|
| Admin  | admin@taskflow.com       | admin123   |
| Member | member@taskflow.com      | member123  |

## ⚙️ Tech Stack

- **Backend**: Node.js + Express 5
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Database**: In-memory (production: swap to PostgreSQL via `DATABASE_URL`)
- **Frontend**: Vanilla JS SPA served as static HTML

## 📦 Local Setup

```bash
npm install
npm start
# Open http://localhost:3000
```

## 🌐 Deploy to Railway

1. Push to GitHub
2. Create new Railway project → "Deploy from GitHub repo"
3. Set environment variables:
   - `JWT_SECRET` = any long random string
   - `PORT` = 3000 (auto-set by Railway)
4. Deploy — Railway auto-runs `npm start`

> **For production persistence**: Add a PostgreSQL plugin in Railway and replace the in-memory `src/database.js` with a Postgres adapter using the `DATABASE_URL` env var.

## 🗂 Project Structure

```
taskflow/
├── server.js           # Express entry point
├── src/
│   └── database.js     # In-memory DB (replace with Postgres for prod)
├── middleware/
│   └── auth.js         # JWT auth + role guards
├── routes/
│   ├── auth.js         # POST /api/auth/login|signup, GET /api/auth/me
│   ├── projects.js     # CRUD /api/projects + members
│   ├── tasks.js        # CRUD /api/tasks + dashboard
│   └── users.js        # GET /api/users (admin only)
└── public/
    └── index.html      # Full SPA frontend
```

## 🔒 API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Auth |
| GET/POST | `/api/projects` | Auth |
| GET/PUT/DELETE | `/api/projects/:id` | Auth / Project Admin |
| GET/POST | `/api/projects/:id/members` | Auth / Project Admin |
| GET | `/api/tasks/dashboard` | Auth |
| GET/POST | `/api/tasks` | Auth |
| PUT | `/api/tasks/:id` | Auth (assignee or admin) |
| DELETE | `/api/tasks/:id` | Project Admin |
| GET | `/api/users` | Global Admin only |
