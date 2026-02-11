# Gaud Integrations

Integration platform for Meta (Facebook/Instagram), WhatsApp, and CRM services (Pipedrive).

## Stack

- **Backend**: Node.js + Fastify + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Testing**: Vitest
- **Code Quality**: ESLint + Prettier

## Features (Phase 1)

- [ ] Webhook listener for Meta Conversions API
- [ ] WhatsApp Business API integration
- [ ] Pipedrive lead auto-creation
- [ ] Data mapping and transformation
- [ ] Webhook logging and retry mechanism

## Project Structure

```
src/
├── index.ts           # Main entry point
├── services/          # Business logic
│   ├── meta/         # Meta API integration
│   ├── whatsapp/     # WhatsApp integration
│   └── pipedrive/    # Pipedrive integration
├── routes/           # API endpoints
├── models/           # Data models
├── middleware/       # Custom middleware
└── utils/            # Utilities
prisma/
├── schema.prisma     # Database schema
└── migrations/       # Database migrations
tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
```

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Testing

```bash
npm test
npm run test:coverage
```

## Code Quality

```bash
npm run lint
npm run format
```

## Database Migrations

```bash
# Create migration
npx prisma migrate dev --name <migration_name>

# Apply migrations
npx prisma migrate deploy
```

## License

MIT
