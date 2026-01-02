# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

All commands run from the `app/` directory:

```bash
cd app
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

## Architecture Overview

SimpleSign is a Swedish e-signature platform (DocuSign alternative) built with Next.js 16 App Router.

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth with cookie-based sessions
- **PDF**: pdf-lib (manipulation), pdfjs-dist (rendering), Fabric.js (canvas)
- **Email**: Resend
- **Payments**: Stripe

### Project Structure (app/src/)

```
app/                    # Next.js App Router
├── (marketing)/        # Public marketing pages
├── api/                # API routes
├── auth/               # Login, signup, callback, signout
├── dashboard/          # User dashboard
├── documents/          # Document management (new, [id])
└── sign/[token]/       # Public signing page (token-based access)

components/             # React components
lib/
├── supabase/          # client.ts (browser), server.ts (server), middleware.ts
├── email.ts           # Resend email service
└── pdf.ts             # PDF utilities
types/database.ts      # Supabase type definitions
```

### Database Schema (supabase/schema.sql)

Key tables with RLS enabled:
- **users**: Plan tier (free/starter/pro/business), document limits
- **documents**: Status: draft → pending → completed/declined/expired
- **signers**: Recipients with unique access tokens
- **signature_fields**: Field placement (signature/initial/date/text/checkbox)
- **audit_logs**: Complete signing history

### Authentication Flow

- Middleware protects: `/dashboard`, `/documents`, `/settings`
- Public signing via token: `/sign/[token]`
- Supabase client: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server)

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## SafeProtocol: eIDAS-Compliant e-Signatures

SafeProtocol is a legally binding e-signature system with:
- **BankID Identity Verification**: Swedish electronic ID verification
- **Consent Tracking**: eIDAS and GDPR compliance recording
- **Audit Trail**: 7-year compliance logging
- **Future Phases**: Cryptographic signing, TSA timestamping, blockchain recording

**Key Files**:
- `SAFEPROTOCOL.md` - Complete SafeProtocol documentation
- `lib/bankid.ts` - BankID API integration
- `lib/safeprotocol.ts` - SafeProtocol high-level API
- `components/BankIDVerification.tsx` - Identity verification modal
- `components/ConsentModal.tsx` - Consent recording modal
- `api/safeprotocol/` - SafeProtocol API endpoints
- `supabase/safeprotocol_migration.sql` - Database schema

**Implementation Status**: Phase 1 Complete
- ✅ BankID integration
- ✅ Identity verification flow
- ✅ Consent tracking
- ✅ Compliance audit logging
- ⏳ Phase 2-4: Cryptographic signing, timestamping, blockchain (planned)

## Key Patterns

- All UI text is in Swedish
- Server Components by default, Client Components for interactivity
- Zod for API input validation
- PDF files stored in Supabase Storage
- SafeProtocol required for legally compliant e-signatures
- BankID for Swedish identity verification
- RLS (Row Level Security) on all SafeProtocol tables
