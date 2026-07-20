# 🚀 Express TypeScript Boilerplate 2025

[![CI](https://github.com/edwinhern/express-typescript/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/ci.yml)

```code
Hey There! 🙌
🤾 that ⭐️ button if you like this boilerplate.
```

## 🌟 Introduction

Welcome to Express TypeScript Boilerplate 2025 – a simple and ready-to-use starting point for building backend web services with Express.js and TypeScript.

## 💡 Why We Made This

This starter kit helps you:

- ✨ Start new projects faster
- 📊 Write clean, consistent code
- ⚡ Build things quickly
- 🛡️ Follow best practices for security and testing

## 🚀 What's Included

- 📁 Well-organized folders: Files grouped by feature so you can find things easily
- 💨 Fast development: Quick code running with `tsx` and error checking with `tsc`
- 🌐 Latest Node.js: Uses the newest stable Node.js version from `.tool-versions`
- 🔧 Safe settings: Environment settings checked with Zod to prevent errors
- 🔗 Short import paths: Clean code with easy imports using path shortcuts
- 🔄 Auto-updates: Keeps dependencies up-to-date with Renovate
- 🔒 Better security: Built-in protection with Helmet and CORS settings
- 📊 Easy tracking: Built-in logging with `pino-http`
- 🧪 Ready-to-test: Testing tools with Vitest and Supertest already set up
- ✅ Clean code: Consistent coding style with `Biomejs`
- 📃 Standard responses: Unified API responses using `ServiceResponse`
- 📝 Input checking: Request validation using Zod
- 🧩 API browser: Interactive API docs with Swagger UI

## 🛠️ Getting Started

### Video Demo

For a visual guide, watch the [video demo](https://github.com/user-attachments/assets/b1698dac-d582-45a0-8d61-31131732b74e) to see the setup and running of the project.

### Step-by-Step Guide

#### Step 1: 🚀 Initial Setup

- Clone the repository: `git clone https://github.com/edwinhern/express-typescript.git`
- Navigate: `cd express-typescript`
- Install dependencies: `pnpm install`

#### Step 2: ⚙️ Environment Configuration

- Create `.env`: Copy `.env.template` to `.env`
- Update `.env`: Fill in necessary environment variables

#### Step 3: 🏃‍♂️ Running the Project

- Development Mode: `pnpm start:dev`
- Building: `pnpm build`
- Production Mode: Set `NODE_ENV="production"` in `.env` then `pnpm build && pnpm start:prod`

## 🤝 Feedback and Contributions

We'd love to hear your feedback and suggestions for further improvements. Feel free to contribute and join us in making backend development cleaner and faster!

🎉 Happy coding!

## 📁 Folder Structure

See [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for the full endpoint reference
and [`Implemented.md`](./Implemented.md) for the implementation notes.

```code
├── biome.json
├── package.json
├── prisma.config.ts
├── prisma/
│   └── schemas/                  # multi-file Prisma schema (one file per domain)
├── src
│   ├── api                       # feature modules (router / controller / service / validation)
│   │   ├── auth
│   │   ├── onboarding            # client wizard + admin review
│   │   ├── requests
│   │   ├── projects              # projects, deliverables, approvals
│   │   ├── tickets
│   │   ├── chat
│   │   ├── notifications
│   │   ├── files
│   │   ├── announcements
│   │   ├── team
│   │   ├── invites
│   │   ├── audit
│   │   ├── dashboard
│   │   └── routes.ts             # central route map (mounts every module)
│   ├── config                    # cloudinary, cors, db, roles, categories
│   ├── lib                       # BetterAuth instance
│   ├── middlewares               # auth (RBAC), upload, rate limit, error handling
│   ├── services                  # cross-cutting: notification, audit, activity, file, user
│   ├── sockets                   # Socket.IO init + handlers (realtime chat/notifications)
│   ├── utils                     # ServiceResponse, AppError, pagination, codes, env
│   ├── index.ts                  # HTTP server + Socket.IO bootstrap
│   └── server.ts                 # Express app + middleware + routes
├── tsconfig.json
└── vite.config.mts
```
