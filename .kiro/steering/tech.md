# Tech Stack & Build

## Runtime & Language

- **Node.js** with **TypeScript** (strict mode, ES2016 target, CommonJS modules)
- Output compiled to `dist/` via `tsc`

## Frameworks & Libraries

- **Express 4** — HTTP server and routing
- **Mongoose 8** — MongoDB ODM
- **jsonwebtoken** — JWT auth
- **bcryptjs** — Password hashing
- **dayjs** — Date parsing and formatting
- **helmet** — Security headers
- **cors** — Cross-origin configuration
- **uuid** — Unique ID generation
- **serverless / serverless-http** — AWS Lambda deployment via Serverless Framework
- **serverless-esbuild** — Bundling for Lambda

## Dev Tooling

- **ESLint 9** with `typescript-eslint` — flat config (`eslint.config.mjs`)
- **Prettier 3** — code formatting
- **Husky + lint-staged** — pre-commit hooks run ESLint fix and Prettier on staged files
- **Jest** — test runner (with `@types/jest`)
- **nodemon + ts-node** — local dev server with hot reload
- **tsconfig-paths** — path alias resolution at runtime

## Environment

- Config via `.env` file loaded with `dotenv`
- Key env vars: `PORT`, `DB_URL`, `DB_NAME`, `JWT_SECRET_KEY`, `ENVIRONMENT`, `SERVER`

## Common Commands

| Command                  | Description                                |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Start dev server with nodemon + hot reload |
| `npm run build`          | Clean `dist/` and compile TypeScript       |
| `npm run start`          | Build then serve from `dist/`              |
| `npm run serve`          | Run compiled JS from `dist/`               |
| `npm test`               | Run Jest tests with coverage               |
| `npm run check-prettier` | Check formatting                           |
| `npm run check-eslint`   | Lint check                                 |
| `npm run fix-prettier`   | Auto-fix formatting                        |
| `npm run deploy`         | Build and deploy via Serverless Framework  |

## Code Style Rules

- Single quotes, 2-space indent, semicolons required
- Trailing commas: ES5 style
- Print width: 100 characters
- LF line endings
