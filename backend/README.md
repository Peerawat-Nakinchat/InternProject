# Backend — Multi-tenant Express (MVC) — Ready ZIP

This project is a ready backend template for a multi-tenant application with:
- Express.js (ESM)
- PostgreSQL (pg)
- JWT Access + Refresh tokens
- MVC-like structure (models, controllers, services)
- Invite flow, role management, transfer ownership
- Middleware to ensure company membership & role

## Files included
- server.js
- src/
  - config/
  - controllers/
  - models/
  - services/
  - middleware/
  - routes/
  - utils/
- sql/00_schema.sql
- sql/01_seed.sql
- .env.example
- package.json

## Quick start

1. Copy `.env.example` to `.env` and fill values (DATABASE_URL, ACCESS_SECRET, REFRESH_SECRET, SMTP settings).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create database and run SQL from `sql/00_schema.sql` (use Navicat or psql).
4. (Optional) Edit `sql/01_seed.sql` to use real bcrypt password hashes and run it.
5. Start server:
   ```bash
   npm run dev
   ```
6. API endpoints:
   - `POST /api/auth/register` { email, password, name }
   - `POST /api/auth/login` { email, password } -> returns accessToken, refreshToken, companies
   - `POST /api/auth/refresh` { refreshToken }
   - `POST /api/companies` create company (auth required)
   - `POST /api/companies/transfer` transfer ownership (auth + company)
   - `POST /api/members/invite` invite (auth + company + owner/admin)
   - `GET /api/members` list members (auth + company)
   - `PUT /api/members/role` update role (auth + company + owner/admin)
   - `DELETE /api/members/:user_id` remove member (auth + company + owner/admin)

## Notes & next steps
- This template focuses on backend logic. You should:
  - Secure refresh token storage and rotation further for production.
  - Add validation (Zod/Joi) for payloads.
  - Add unit/integration tests.
  - Use HTTPS in production.
  - Implement proper email templates and invite token persistence if you need invite link verification.

If you want, I can:
- Add Dockerfile + docker-compose
- Build the Vue 3 frontend to work with this API
- Add Postman collection / example requests

Enjoy!
