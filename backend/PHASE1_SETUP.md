# AgriSupport AI Phase 1 Backend Setup

## Stack

- Node.js
- Express.js
- Prisma ORM
- MySQL by default
- JWT authentication
- bcrypt password hashing

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

Copy values from `.env.example` into `.env` and update `DATABASE_URL` for your machine.

Example:

```env
DATABASE_URL="mysql://root:password@localhost:3306/agrisupport_phase1"
JWT_SECRET=super-secure-jwt-secret-change-me
PORT=5000
```

## MySQL preparation

1. Start your MySQL server.
2. Create a new database:

```sql
CREATE DATABASE agrisupport_phase1;
```

3. If needed, create a dedicated backend user:

```sql
CREATE USER 'agrisupport_app'@'localhost' IDENTIFIED BY 'AgriSupport@12345';
GRANT ALL PRIVILEGES ON agrisupport_phase1.* TO 'agrisupport_app'@'localhost';
FLUSH PRIVILEGES;
```

4. Update `.env` if you use that dedicated account:

```env
DATABASE_URL="mysql://agrisupport_app:AgriSupport@12345@localhost:3306/agrisupport_phase1"
```

## 3. Generate Prisma client

```bash
npm run prisma:generate
```

## 4. Run initial migration

```bash
npm run prisma:migrate
```

## 5. Seed demo users

```bash
npm run prisma:seed
```

Demo accounts:

- `admin@agrisupport.rw / Admin@123`
- `officer@agrisupport.rw / Officer@123`
- `farmer@agrisupport.rw / Farmer@123`

## 6. Start the API

```bash
npm run dev
```

Health check:

`GET http://localhost:5000/health`

## Notes

- Phase 1 only covers authentication, farmer profiles, farms, crop history, and admin approval workflow.
- Weather, soil, pest, market, AI recommendation, notifications, and analytics backend modules are intentionally deferred.
- You can inspect all created tables, seeded users, and farm records from MySQL Workbench, phpMyAdmin, or the MySQL CLI.
