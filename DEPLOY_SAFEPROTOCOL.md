# SafeProtocol Phase 1 Deployment Guide

This guide walks through deploying SafeProtocol Phase 1 to your SimpleSign instance.

## Prerequisites

- ✅ SimpleSign running with Supabase
- ✅ Access to Supabase dashboard
- ✅ BankID test or production credentials
- ✅ Next.js 16 development environment

## Deployment Steps

### Step 1: Run Database Migration

The SafeProtocol migration adds 7 new tables and extends the `signers` table with identity verification fields.

#### Option A: Supabase Dashboard (Recommended for Testing)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `app/supabase/safeprotocol_migration.sql`
5. Paste into the SQL editor
6. Review the SQL (it's safe - only creates new tables and extends existing ones)
7. Click **Run** (or press `Ctrl+Enter`)
8. Wait for completion - you should see no errors

**Expected Output:**
```
Query executed successfully
```

#### Option B: Supabase CLI (For Production)

If you have Supabase CLI installed:

```bash
cd app

# Create a new migration
supabase migration new add_safeprotocol

# Copy safeprotocol_migration.sql content into migrations/[timestamp]_add_safeprotocol.sql

# Push to remote
supabase db push
```

#### Option C: Direct Database Access

If you have direct PostgreSQL access:

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/safeprotocol_migration.sql
```

---

### Step 2: Configure Environment Variables

Add to your `.env.local` file:

```bash
# BankID Configuration
BANKID_ENVIRONMENT=test
# BANKID_CERT_PATH=/certs/bankid.pem  # Only needed for production with mTLS
```

**Options for BANKID_ENVIRONMENT:**
- `test` - Swedish BankID test environment (development)
- `production` - Swedish BankID production (requires credentials)

---

### Step 3: Verify Migration Success

Check that all tables were created:

1. In Supabase dashboard, go to **Table Editor**
2. Verify these new tables exist:
   - ✅ `signature_certificates`
   - ✅ `signature_records`
   - ✅ `compliance_consent`
   - ✅ `compliance_audit`
   - ✅ `certificate_revocation`

3. Verify `signers` table has new columns:
   - ✅ `identity_verified` (boolean)
   - ✅ `verified_identity` (text)
   - ✅ `personal_number_hash` (text)
   - ✅ `verification_timestamp` (timestamp)
   - ✅ `verification_method` (text)

---

### Step 4: Test the BankID Integration

#### Test with BankID Test Environment

1. **Get a test personal number:**
   - Visit: https://www.bankid.com/en/testing-bankid
   - Use test personnummer: `197603021234`

2. **Start the development server:**
   ```bash
   cd app
   npm run dev
   ```

3. **Create a test document:**
   - Go to dashboard
   - Upload a PDF
   - Add a test signer (any email works)
   - Send for signing

4. **Visit the signing link:**
   - Open the signing URL from the email or copy it manually
   - You should see the signing page

5. **Test BankID verification:**
   - The page should show a BankID verification modal
   - Click "Start BankID-verifiering"
   - Copy the reference number
   - Go to https://www.bankid.com/en/testing-bankid
   - Use the test credentials to complete authentication
   - Return to the signing page - identity should verify!

6. **Test Consent:**
   - After verification, consent modal should appear
   - Read the eIDAS and GDPR terms
   - Accept both
   - Continue to sign document

7. **Verify Audit Trail:**
   - Go to Supabase dashboard
   - Check `compliance_audit` table
   - You should see events:
     - `identity_verification_initiated`
     - `identity_verification_success` (or `_failed`)
     - `consent_accepted`

---

### Step 5: Configure for Production (Optional)

**If you're ready to go live with real BankID:**

1. **Get BankID Production Credentials:**
   - Register with BankID via their partner portal
   - Obtain client certificate (mTLS)
   - Receive API credentials

2. **Update Environment Variables:**
   ```bash
   BANKID_ENVIRONMENT=production
   BANKID_CERT_PATH=/path/to/bankid-production.pem
   ```

3. **Update BankID Configuration:**
   - Edit `lib/bankid.ts`
   - Ensure production URLs are correct
   - Implement certificate loading if using mTLS

4. **Test with Real BankID:**
   - Use your own personal number to test
   - Verify all flows work
   - Check audit trail

5. **Deploy to Production:**
   ```bash
   npm run build
   npm run start  # or deploy to your hosting
   ```

---

## Verification Checklist

After deployment, verify everything works:

- [ ] Database migration completed without errors
- [ ] All 5 new SafeProtocol tables exist
- [ ] `signers` table has new columns
- [ ] Environment variables configured
- [ ] Development server starts (`npm run dev`)
- [ ] Can create and send document for signing
- [ ] BankID modal appears on signing page
- [ ] Can initiate BankID authentication
- [ ] BankID verification succeeds with test credentials
- [ ] Consent modal appears after verification
- [ ] Can accept consent and sign document
- [ ] Audit trail records all events in `compliance_audit`

---

## Rollback Instructions

If something goes wrong, you can rollback the migration:

```sql
-- Run this in Supabase SQL Editor to remove all SafeProtocol tables
DROP TABLE IF EXISTS public.certificate_revocation CASCADE;
DROP TABLE IF EXISTS public.compliance_audit CASCADE;
DROP TABLE IF EXISTS public.compliance_consent CASCADE;
DROP TABLE IF EXISTS public.signature_records CASCADE;
DROP TABLE IF EXISTS public.signature_certificates CASCADE;

-- Remove columns from signers table
ALTER TABLE public.signers DROP COLUMN IF EXISTS identity_verified;
ALTER TABLE public.signers DROP COLUMN IF EXISTS verified_identity;
ALTER TABLE public.signers DROP COLUMN IF EXISTS personal_number_hash;
ALTER TABLE public.signers DROP COLUMN IF EXISTS verification_timestamp;
ALTER TABLE public.signers DROP COLUMN IF EXISTS verification_method;

-- Remove columns from documents table
ALTER TABLE public.documents DROP COLUMN IF EXISTS document_hash;
ALTER TABLE public.documents DROP COLUMN IF EXISTS document_hash_algorithm;
ALTER TABLE public.documents DROP COLUMN IF EXISTS original_file_size;
ALTER TABLE public.documents DROP COLUMN IF EXISTS mime_type;
ALTER TABLE public.documents DROP COLUMN IF EXISTS safeprotocol_enabled;
```

---

## Troubleshooting

### Migration Fails with "Extension not found"

**Problem:** Error mentioning `uuid-ossp` extension

**Solution:** The extension is already enabled from the original schema.sql. If error persists:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Tables Created But Columns Missing

**Problem:** New columns on `signers` table don't appear

**Solution:** Refresh your Supabase SQL Editor or reload the page. Sometimes changes take a moment to reflect.

### BankID Authentication Not Starting

**Problem:** Clicking "Start BankID" shows an error

**Solutions:**
1. Check environment variable: `BANKID_ENVIRONMENT=test`
2. Check browser console for specific error
3. Verify network request is reaching `/api/safeprotocol/verify-identity/init`
4. Check Supabase logs for database errors

### Audit Trail Not Recording

**Problem:** Events not appearing in `compliance_audit` table

**Solutions:**
1. Verify RLS policies allow inserts:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'compliance_audit';
   ```
2. Check Supabase function logs
3. Verify application is making POST requests to consent endpoints

---

## Next Steps

After Phase 1 deployment:

### Immediate (Day 1)
- ✅ Deploy Phase 1 database migration
- ✅ Test with BankID test environment
- ✅ Verify audit trail is recording

### Near-term (Week 1)
- Transition to production BankID credentials
- Train team on SafeProtocol features
- Update user documentation

### Medium-term (Month 1)
- Deploy Phase 2 (cryptographic signing)
- Implement document hashing
- Add signature verification API

### Long-term (Months 2-3)
- Deploy Phase 3 (TSA timestamping)
- Add blockchain recording (Phase 4)
- Implement advanced features (Phase 5)

---

## Support

For issues with SafeProtocol deployment:

1. Check `SAFEPROTOCOL.md` for detailed documentation
2. Review database schema in `supabase/safeprotocol_migration.sql`
3. Check application logs for errors
4. Verify BankID configuration in `lib/bankid.ts`

For BankID-specific support:
- Visit: https://www.bankid.com/en/developer
- Email: support@bankid.com
- Test environment: https://www.bankid.com/en/testing-bankid

---

## Timeline

- **Deployment time**: 5-10 minutes
- **Testing time**: 15-20 minutes
- **Production readiness**: 1-2 hours (with BankID credentials)

---

**Status**: Ready for Deployment ✅

**Last Updated**: January 2026
