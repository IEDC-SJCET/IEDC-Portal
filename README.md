# IEDC Portal

Student engagement platform for the **Innovation and Entrepreneurship Development Cell (IEDC), SJCET**. It centralizes events, attendance, points, badges, and analytics for students, faculty, Execom, and Nodal Officers in one role-based portal.

Built with Next.js 16, React 19, Drizzle ORM, and Supabase Postgres.

## Features

- **Role-based dashboards** — separate workspaces for Students, Faculty, Execom, and Nodal Officers
- **Events & attendance** — event management with QR-based check-in
- **Gamification** — points, badges, and a live leaderboard
- **Certificate engine** — per-event templates, one-click batch issuing, and on-demand PDF download for students
- **Projects** — student project submission and review by faculty/Execom
- **Analytics & reports** — engagement insights for faculty and admins
- **Secure auth** — Better Auth with Google OAuth, scoped to a college email domain

## Tech Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19           |
| Database   | Supabase (PostgreSQL) + Drizzle ORM         |
| Auth       | Better Auth (Google OAuth)                  |
| Styling/UI | Tailwind CSS, Radix UI, shadcn              |
| Caching    | Upstash Redis (optional, for leaderboard)   |
| Email      | Resend                                      |
| PDF/Docs   | pdf-lib (certificate rendering), docx       |
| Other      | Zod, React Hook Form, Zustand, Recharts     |

## Certificate Engine

Event organisers (Execom and Nodal Officers) can design a certificate per event and issue it to
attendees in one batch. Students see their certificates under **Student → Certificates** and
download them as PDFs.

### How it works

- **Templates** — each event has an optional template row. `default` renders the built-in IEDC
  layout; `custom` draws the recipient's name (and an optional class/detail line) on top of
  uploaded artwork. Text positions are stored as *percentages* of the page, so a template looks
  the same at any resolution or aspect ratio.
- **Live preview** — the template editor renders a real PDF with sample data before anything is
  issued, so positioning, colours, and font sizes can be checked first.
- **Batch issuing** — "Send certificates" issues to every eligible attendee for the event. A
  unique index on `(event_id, student_id)` makes re-running it safe: it can never double-issue.
- **Certificate numbers** — sequential and year-scoped, in the form `IEDC/<year>/00001`, reserved
  atomically from a counter table so concurrent batches never collide.
- **No file storage** — PDFs are never written to disk or a bucket. Each certificate is a single
  database row, re-rendered on demand by `GET /api/certificates/:id/file`. Issuing a batch of
  hundreds costs one insert, not hundreds of uploads.
- **Historical accuracy** — the recipient's name and details are snapshotted at issue time, so a
  certificate never silently changes when a student later edits their profile.

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