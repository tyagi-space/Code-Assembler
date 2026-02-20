# Code Assembler

Full-stack news aggregation app with:
- React + Vite frontend
- Express + TypeScript backend
- PostgreSQL + Drizzle ORM

## Local setup

1. Install dependencies:
```bash
npm install
```

2. Create your local env file:
```bash
cp .env.example .env
```

3. Start local PostgreSQL (Docker):
```bash
npm run db:up
```

4. Push schema to DB:
```bash
npm run db:push
```

5. Run in development:
```bash
npm run dev
```

App runs at `http://localhost:5005`.

## Admin approval flow

- During registration, users can choose `Normal User` or `Admin`.
- `Admin` registrations are created as pending and inactive until approved by an existing admin.
- Existing admins can approve/reject requests from the Admin dashboard.
- Decision emails are sent when SMTP variables are configured in `.env`.

## Helpful commands

- Stop local DB: `npm run db:down`
- Build for production: `npm run build`
- Run production build: `npm run start`
