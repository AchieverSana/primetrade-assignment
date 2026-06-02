# Primetrade Task API

A scalable REST API with JWT authentication, role-based access control, and a React frontend — built for the Primetrade Backend Intern assignment.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |
| Frontend | React 18 + React Router v6 |
| Bundler | Vite |
| API Docs | Swagger / OpenAPI 3.0 |
| Deployment | Docker + Docker Compose |
| Logging | Winston |
| Validation | express-validator |
| Security | helmet, express-rate-limit, bcryptjs |

---

## Project Structure

```
primetrade/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # MongoDB connection
│   │   │   └── swagger.js        # OpenAPI 3.0 spec config
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register, login, refresh, logout, me
│   │   │   ├── taskController.js  # CRUD + stats + pagination
│   │   │   └── userController.js  # Admin user management
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verify + RBAC
│   │   │   ├── validation.js     # express-validator rules
│   │   │   └── errorHandler.js   # Global error + 404 handler
│   │   ├── models/
│   │   │   ├── User.js           # User schema (bcrypt pre-save)
│   │   │   └── Task.js           # Task schema with indexes
│   │   ├── routes/
│   │   │   ├── auth.js           # /api/v1/auth/*
│   │   │   ├── tasks.js          # /api/v1/tasks/*
│   │   │   └── users.js          # /api/v1/users/* (admin only)
│   │   ├── utils/
│   │   │   ├── logger.js         # Winston logger
│   │   │   └── response.js       # Standardized response helpers
│   │   └── server.js             # Express app entry point
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   │   ├── TaskModal.jsx     # Create/edit task modal
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global auth state + auto-refresh
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx # Tasks CRUD + stats
│   │   │   └── UsersPage.jsx     # Admin: manage users
│   │   ├── utils/
│   │   │   └── api.js            # Axios instance + interceptors
│   │   ├── App.jsx               # Router + layout
│   │   ├── index.css             # Design system (CSS variables)
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
│
├── docker-compose.yml
└── README.md
```

---

## Local Setup (No Docker)

### Prerequisites
- Node.js >= 18
- MongoDB (local or [Atlas free tier](https://www.mongodb.com/atlas))

### 1. Clone & configure backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT secrets
npm install
npm run dev
# → Server at http://localhost:5000
# → Docs at http://localhost:5000/api/docs
```

### 2. Start frontend

```bash
cd frontend
npm install
npm run dev
# → App at http://localhost:3000
```

---

## Docker Setup (Recommended)

```bash
# From project root
docker-compose up --build

# Services:
# Frontend → http://localhost:3000
# Backend  → http://localhost:5000
# API Docs → http://localhost:5000/api/docs
```

---

## API Endpoints

All routes are versioned under `/api/v1`.

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, get tokens |
| POST | `/auth/refresh` | Public | Rotate tokens |
| POST | `/auth/logout` | Private | Invalidate refresh token |
| GET | `/auth/me` | Private | Get current user |

### Tasks

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/tasks` | Private | List tasks (paginated, filtered) |
| POST | `/tasks` | Private | Create task |
| GET | `/tasks/stats` | Private | Stats by status/priority |
| GET | `/tasks/:id` | Private | Get single task |
| PUT | `/tasks/:id` | Private | Update task |
| DELETE | `/tasks/:id` | Private | Delete task |

**Query params for GET /tasks:** `status`, `priority`, `search`, `page`, `limit`, `sortBy`, `order`

### Users (Admin Only)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin | List all users |
| GET | `/users/:id` | Admin | Get user |
| PATCH | `/users/:id/role` | Admin | Update role |
| PATCH | `/users/:id/status` | Admin | Activate/deactivate |
| DELETE | `/users/:id` | Admin | Delete user + cascade tasks |

---

## Authentication Flow

```
Register/Login → { accessToken, refreshToken }
     ↓
All protected requests: Authorization: Bearer <accessToken>
     ↓
Token expires (7d) → POST /auth/refresh with refreshToken
     ↓
New accessToken + rotated refreshToken issued
     ↓
Logout → refreshToken invalidated server-side
```

- Access tokens: 7 days (configurable)
- Refresh tokens: 30 days, stored hashed in DB, rotated on use
- Up to 5 concurrent sessions per user
- Auto-refresh in Axios interceptor (transparent to UI)

---

## Database Schema

### User
```
{
  name:          String (2–50 chars)
  email:         String (unique, indexed)
  password:      String (bcrypt, 12 rounds, select: false)
  role:          Enum ['user', 'admin']  default: 'user'
  isActive:      Boolean                default: true
  lastLogin:     Date
  refreshTokens: [String]              select: false
  createdAt / updatedAt: Date (auto)
}
```

### Task
```
{
  title:       String (3–100 chars)
  description: String (max 1000)
  status:      Enum ['todo', 'in-progress', 'done']   default: 'todo'
  priority:    Enum ['low', 'medium', 'high']          default: 'medium'
  dueDate:     Date (optional)
  tags:        [String] (max 10)
  owner:       ObjectId → User
  createdAt / updatedAt: Date (auto)
}

Indexes:
  { owner, status }        — for filtered list queries
  { owner, priority }      — for priority filtering
  { owner, createdAt }     — for sorted lists
  { title, description }   — full-text search
```

---

## Security Practices

- **Password hashing**: bcrypt with cost factor 12 (never stored in plain text)
- **JWT secrets**: Separate secrets for access/refresh tokens
- **Refresh token rotation**: Old token invalidated on each refresh
- **Rate limiting**: Global 100 req/15min; auth routes 10 req/15min
- **Input sanitization**: express-validator with `.escape()` on all string inputs
- **Helmet**: Sets 15+ security HTTP headers
- **CORS**: Whitelist-based, credentials enabled
- **Body size limit**: 10kb max to prevent payload attacks
- **Role enforcement**: Middleware-level, not just UI-level
- **Cascade-aware delete**: Deleting a user also deletes their tasks

---

## Scalability Notes

### Horizontal Scaling
The stateless JWT design allows multiple backend instances behind a load balancer (e.g. AWS ALB, nginx upstream) with zero session stickiness required. Refresh tokens are stored in MongoDB (shared state), so any instance can validate them.

### Caching (Redis — optional)
Add Redis to cache:
- `GET /tasks` results (invalidate on write)
- Rate limit counters (replace in-memory store for multi-instance)
- Session/token blocklist for instant logout

### Microservices Path
The project is structured to extract cleanly:
- **Auth Service** → `/auth` routes + User model
- **Task Service** → `/tasks` routes + Task model
- **Admin Service** → `/users` routes

Each service gets its own DB collection (or separate MongoDB cluster), communicates via REST or message queue (RabbitMQ / Kafka).

### Database
- MongoDB Atlas auto-scales read replicas
- Indexes are already defined on all common query patterns
- Text index enables full-text search on tasks

### Observability
- Winston logs to `logs/combined.log` + `logs/error.log`
- `/health` endpoint for load balancer health checks
- Structured JSON logs for easy ingestion into Datadog / CloudWatch

### Docker → Kubernetes
Each service has its own `Dockerfile`. Promote to Kubernetes with:
```bash
kubectl apply -f k8s/  # add HPA for auto-scaling backend replicas
```

---

## API Documentation

Interactive Swagger UI available at:
```
http://localhost:5000/api/docs
```

Features:
- Try all endpoints directly in the browser
- JWT auth via "Authorize" button
- Request/response schemas with examples

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | — |
| `JWT_SECRET` | Access token secret (min 32 chars) | — |
| `JWT_EXPIRES_IN` | Access token TTL | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token secret | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `30d` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:3000` |
