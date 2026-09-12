# IEDC Portal

Student engagement platform for the **Innovation and Entrepreneurship Development Cell (IEDC), SJCET**. It centralizes events, attendance, points, badges, and analytics for students, faculty, Execom, and Nodal Officers in one role-based portal.

Built with Next.js 16, React 19, Drizzle ORM, and Supabase Postgres.

## Features

- **Role-based dashboards** — separate workspaces for Students, Faculty, Execom, and Nodal Officers
- **Events & attendance** — event management with QR-based check-in
- **Gamification** — points, badges, and a live leaderboard
- **Projects & certificates** — project tracking and certificate generation
- **Analytics & reports** — engagement insights for faculty and admins
- **Secure auth** — Better Auth with Google OAuth, scoped to a college email domain

## Tech Stack

| Layer      | Technology                                  |
| ---------- | -------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19            |
| Database   | Supabase (PostgreSQL) + Drizzle ORM          |
| Auth       | Better Auth (Google OAuth)                   |
| Styling/UI | Tailwind CSS, Radix UI, shadcn                |
| Caching    | Upstash Redis (optional, for leaderboard)     |
| Email      | Resend                                        |
| Other      | Zod, React Hook Form, Zustand, Recharts       |

## Getting Started

### Prerequisites

- Node.js 20+ and [Bun](https://bun.sh) (or npm/yarn/pnpm)
- A Supabase Postgres database
- A Google OAuth client (for sign-in)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/IEDC-SJCET/IEDC-Portal.git
cd IEDC-Portal
bun install

# 2. Configure environment
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, etc.

# 3. Set up the database
bun run db:push

# 4. Run the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Useful Scripts

| Command              | Description                       |
| --------------------- | ---------------------------------- |
| `bun run dev`          | Start the development server       |
| `bun run build`        | Build for production               |
| `bun run lint`         | Run ESLint                         |
| `bun run db:studio`    | Open Drizzle Studio                |
| `bun run db:generate`  | Generate a new migration           |
| `bun run db:migrate`   | Apply pending migrations           |

## Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Make your changes**, following the existing code style (TypeScript, ESLint config in the repo).
3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: add badge revocation`, `fix: correct leaderboard ranking`).
4. **Test** your changes locally and ensure `bun run lint` passes.
5. **Push** your branch and open a **Pull Request** against `main`, describing what changed and why.

Please open an issue first for larger changes or new features, so we can discuss the approach before implementation.

## License

This project is currently unlicensed and maintained internally by IEDC SJCET. Reach out to the maintainers before reusing or redistributing this code.