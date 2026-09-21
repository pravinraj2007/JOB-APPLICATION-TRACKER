# JobTrack

JobTrack is a complete job search and career management platform built with React, Vite, Express, and a demo-first architecture. It works without external AI keys or MongoDB and includes a ready-to-use demo mode for local development.

## Features

- Landing page with marketing sections and responsive layout
- Login and signup flows with demo authentication
- Protected dashboard with application stats and charts
- Job tracker with add, edit, delete, and status kanban workflow
- Saved jobs and bookmarks pages
- Resume builder with live preview
- ATS checker with scoring and suggestions
- AI enhancement module with local enhancement logic
- Skills check and interview prep modules
- Career guidance and profile/settings pages
- Direct route support for front-end navigation

## Tech stack

- Frontend: React + Vite + React Router + Recharts + Lucide React
- Backend: Node.js + Express
- Auth: demo JWT-style flows with local storage session handling
- Demo mode: works without MongoDB or AI API

## Project structure

- `client/` – React frontend
- `server/` – Express backend demo API
- `.env.example` – environment example values

## Installation

1. Install dependencies:

```bash
cd "c:\Users\aniru\Downloads\MERN PROJECT\New folder"
npm install
```

2. Copy environment values:

```bash
copy .env.example .env
```

3. Start the app:

```bash
npm run dev
```

This starts the Express API on port 5001 and the Vite app on port 5173.

## Environment variables

Example values are in `.env.example`:

- `PORT=5001`
- `CLIENT_URL=http://localhost:5173`
- `MONGODB_URI=`
- `JWT_SECRET=jobtrack-demo-secret`

## Demo credentials

- Email: `demo@jobtrack.app`
- Password: `demo123`

## Troubleshooting

- If the frontend route does not load on refresh, make sure the Vite dev server is running and you are opening the app through the client port.
- If you want to use the backend API without the frontend, run `npm run dev:server`.
- If you need to build for production, run `npm run build`.
