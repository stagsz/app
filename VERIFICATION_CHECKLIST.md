# SafeProtocol Phase 1: Verification Checklist

**Purpose**: Confirm SafeProtocol Phase 1 is properly deployed and functioning.

**Estimated Time**: 30-45 minutes

---

## Pre-Deployment Checklist

### Environment Setup
- [ ] `.env.local` contains `BANKID_ENVIRONMENT=test`
- [ ] Dev server runs without errors: `npm run dev`
- [ ] Supabase project accessible
- [ ] Git status clean (no untracked files breaking build)

### Files in Place
- [ ] `supabase/safeprotocol_migration.sql` exists
- [ ] `lib/bankid.ts` exists
- [ ] `lib/safeprotocol.ts` exists
- [ ] `components/BankIDVerification.tsx` exists
- [ ] `components/ConsentModal.tsx` exists
- [ ] `app/api/safeprotocol/` directory with endpoints exists
- [ ] `SAFEPROTOCOL.md` documentation exists
- [ ] `TESTING_GUIDE.md` exists

---

## Deployment Checklist

### Step 1: Database Migration

**Action**: Run `supabase/safeprotocol_migration.sql` in Supabase SQL Editor

Verification:
- [ ] No SQL errors
- [ ] Message shows "Query executed successfully"
- [ ] Migration completes within 5 seconds

### Step 2: Verify Tables Created

**Action**: Open Supabase **Table Editor**

Verification:
- [ ] `signature_certificates` table exists
- [ ] `signature_records` table exists
- [ ] `compliance_consent` table exists
- [ ] `compliance_audit` table exists
- [ ] `certificate_revocation` table exists

### Step 3: Verify Column Extensions

**Action**: Open `signers` table in **Table Editor**

Verification - New columns:
- [ ] `identity_verified` (boolean, default: false)
- [ ] `verified_identity` (text, nullable)
- [ ] `personal_number_hash` (varchar(64), nullable)
- [ ] `verification_timestamp` (timestamp, nullable)
- [ ] `verification_method` (varchar(50), nullable)

**Action**: Open `documents` table in **Table Editor**

Verification - New columns:
- [ ] `document_hash` (varchar(64), nullable)
- [ ] `document_hash_algorithm` (varchar(20), nullable)
- [ ] `original_file_size` (bigint, nullable)
- [ ] `mime_type` (varchar(50), nullable)
- [ ] `safeprotocol_enabled` (boolean, default: true)

### Step 4: Verify Row Level Security

**Action**: For each SafeProtocol table, click **RLS** tab

Verification:
- [ ] RLS is **Enabled** on `signature_certificates`
- [ ] RLS is **Enabled** on `signature_records`
- [ ] RLS is **Enabled** on `compliance_consent`
- [ ] RLS is **Enabled** on `compliance_audit`
- [ ] RLS is **Enabled** on `certificate_revocation`

---

## Unit Tests Checklist

### Run Tests
```bash
cd app
npm test
```

Verification:
- [ ] No test failures
- [ ] All BankID tests pass
- [ ] All SafeProtocol tests pass
- [ ] All API tests pass
- [ ] Test summary shows ✅ Pass

---

## Manual Testing Checklist

### Create Test Document

1. Go to http://localhost:3000/dashboard
2. Upload a PDF file
3. Name: "SafeProtocol-Test"
4. Create document

Verification:
- [ ] Document created successfully
- [ ] Can see document in dashboard
- [ ] Document detail page loads

### Add Signer

1. On document detail page, click "Lägg till signatär"
2. Email: `test@example.com`
3. Name: `Test User`
4. Add signer

Verification:
- [ ] Signer appears in list
- [ ] Signer status is "pending"
- [ ] `identity_verified` is false (check in Supabase)

### Place Signature Field

1. Click document to edit fields
2. Click on PDF to place signature
3. Confirm placement

Verification:
- [ ] Field placed correctly on PDF
- [ ] Field appears in field list
- [ ] Can save document

### Send for Signing

1. Click "Skicka för signering"
2. Confirm and send

Verification:
- [ ] Email notification sent (check logs if email provider connected)
- [ ] Signing URL generated
- [ ] Document status changed to "pending"

### Open Signing Page

1. Copy signing URL
2. Open in new private browser window
3. Verify email loaded correctly

Verification:
- [ ] Page loads without errors
- [ ] PDF visible
- [ ] **BankID modal appears** ✅ (Most important!)
- [ ] "Start BankID-verifiering" button clickable

### Test BankID Verification

1. Click "Start BankID-verifiering"
2. Wait for BankID to initialize

Verification:
- [ ] Modal shows loading state
- [ ] After 2-3 seconds, reference number appears
- [ ] Reference number is displayed correctly
- [ ] "Copy" button works
- [ ] Modal says "Väntar på BankID-bekräftelse..."

### Authenticate with BankID

1. Visit https://www.bankid.com/en/testing-bankid
2. Use test personnummer: `197603021234`
3. Complete authentication
4. Return to signing page

Verification:
- [ ] Modal updates to show "complete"
- [ ] Shows verified name
- [ ] Shows green checkmark
- [ ] "Fortsätt" button appears
- [ ] No error messages

### Accept Consent

1. Click "Fortsätt" button
2. Consent modal appears

Verification:
- [ ] Modal shows eIDAS section (blue)
- [ ] Modal shows GDPR section (green)
- [ ] Both sections have checkboxes (unchecked)
- [ ] "Acceptera och fortsätt" button is disabled initially

### Complete Consent

1. Read both sections
2. Check both checkboxes
3. Click "Acceptera och fortsätt"

Verification:
- [ ] Checkboxes can be checked
- [ ] Button becomes enabled after checking both
- [ ] No errors submitting consent
- [ ] Modal closes
- [ ] Returned to signing page

### Sign Document

1. Click on signature field
2. Draw signature
3. Click "Spara"
4. Click "Signera dokument"

Verification:
- [ ] Signature modal opens
- [ ] Can draw signature
- [ ] Signature saved
- [ ] Document signs successfully
- [ ] Success message appears ✅

---

## Audit Trail Verification Checklist

### Check Audit Log Entries

1. Go to Supabase **Table Editor**
2. Select `compliance_audit` table
3. Look for recent entries

Verification - Should see entries with:
- [ ] `identity_verification_initiated`
- [ ] `identity_verification_success`
- [ ] `consent_accepted`
- [ ] `document_signed` (optional, from existing system)

### Verify Event Details

For `identity_verification_initiated` entry:
- [ ] `event_status` = "pending"
- [ ] `signer_id` = your test signer UUID
- [ ] `ip_address` = populated (not NULL)
- [ ] `user_agent` = populated (not NULL)
- [ ] `metadata` contains `orderRef`

For `identity_verification_success` entry:
- [ ] `event_status` = "success"
- [ ] `event_type` = "identity_verification_success"
- [ ] `ip_address` = populated
- [ ] `metadata` contains verified name

For `consent_accepted` entry:
- [ ] `event_status` = "success"
- [ ] `event_type` = "consent_accepted"
- [ ] `ip_address` = populated
- [ ] `metadata` contains `consentTypes` array

### Verify Signer Update

1. Go to `signers` table
2. Find your test signer
3. Check record after verification

Verification:
- [ ] `identity_verified` = true
- [ ] `verified_identity` = "Test User" (or your test name)
- [ ] `personal_number_hash` = 64-character hex string (SHA-256)
- [ ] `verification_timestamp` = recent timestamp
- [ ] `verification_method` = "bankid_challenge"

### Verify Consent Records

1. Go to `compliance_consent` table
2. Find records for your test signer

Verification - Should have 2 entries (eIDAS + GDPR):
- [ ] `consent_type` = "eidas_advanced_signature"
- [ ] `consent_type` = "gdpr_data_processing"
- [ ] Both have `consent_accepted` = true
- [ ] Both have `consent_timestamp` = recent
- [ ] Both have `ip_address` populated
- [ ] Both have `user_agent` populated

---

## Security Verification Checklist

### Personal Number Privacy

```sql
-- Run in Supabase SQL Editor to verify
SELECT COUNT(*) as count_with_hash FROM signers
WHERE personal_number_hash IS NOT NULL AND identity_verified = true;
```

Verification:
- [ ] COUNT = number of verified signers (1 after test)
- [ ] No plain text personal numbers in `personal_number_hash`
- [ ] All hashes are 64 characters (SHA-256)

### Hash Format Verification

```sql
-- Verify all hashes are valid SHA-256 format
SELECT DISTINCT LENGTH(personal_number_hash) FROM signers
WHERE personal_number_hash IS NOT NULL;
```

Verification:
- [ ] Only result: 64 (SHA-256 length)
- [ ] No partial hashes or invalid formats

### Data Retention Configuration

```sql
-- Verify audit logs have retention dates
SELECT COUNT(*) FROM compliance_audit WHERE retained_until IS NOT NULL;
```

Verification:
- [ ] Result > 0 (all records should have retention date)
- [ ] Retention dates are ~7 years in future

---

## Performance Verification Checklist

### API Response Times

Using browser DevTools **Network** tab:

Verification:
- [ ] `/api/safeprotocol/verify-identity/init` < 500ms
- [ ] `/api/safeprotocol/verify-identity/collect` < 500ms
- [ ] `/api/safeprotocol/consent/submit` < 500ms

### Database Performance

Check that indexes are used:

```sql
-- In SQL Editor, run this and check for "Index" in PLAN
EXPLAIN ANALYZE
SELECT * FROM compliance_audit
WHERE signer_id = 'test-uuid' AND event_type = 'identity_verification_success';
```

Verification:
- [ ] Query plan shows index usage (not Seq Scan)
- [ ] Execution time < 10ms

### Load Testing

Verify multiple concurrent requests work:

```bash
# Send 5 concurrent requests
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/safeprotocol/verify-identity/init \
    -H "Content-Type: application/json" \
    -d "{\"signerId\": \"test-uuid\"}" &
done
wait
```

Verification:
- [ ] All 5 requests complete successfully
- [ ] No 500 errors
- [ ] No database connection errors

---

## Error Handling Verification Checklist

### Test: Invalid Signer ID

1. Call API with invalid UUID
2. Expected: 400 error with validation message

Verification:
- [ ] Error response received
- [ ] Error message is user-friendly
- [ ] No 500 server error

### Test: Nonexistent Signer

1. Call API with valid UUID that doesn't exist
2. Expected: 404 error

Verification:
- [ ] 404 response
- [ ] Message: "Signer not found"

### Test: User Cancels BankID

1. Start BankID verification
2. Cancel in BankID test interface
3. Return to signing page

Verification:
- [ ] Error message appears
- [ ] "Försök igen" (Try again) button shows
- [ ] Can restart verification

### Test: Reject Consent Terms

1. Complete identity verification
2. Consent modal appears
3. Try to click "Acceptera och fortsätt" without checking boxes

Verification:
- [ ] Button is disabled
- [ ] Error message appears (if you force-click with DevTools)
- [ ] Can check boxes and continue

---

## Browser Compatibility Checklist

Test in different browsers:

### Chrome
- [ ] BankID modal appears
- [ ] All buttons clickable
- [ ] No console errors
- [ ] Audit trail recorded

### Firefox
- [ ] BankID modal appears
- [ ] All buttons clickable
- [ ] No console errors
- [ ] Audit trail recorded

### Safari
- [ ] BankID modal appears
- [ ] All buttons clickable
- [ ] No console errors
- [ ] Audit trail recorded

### Mobile Browser
- [ ] Responsive layout works
- [ ] BankID modal responsive
- [ ] Touch interaction works
- [ ] Can complete signing

---

## Documentation Verification Checklist

### SAFEPROTOCOL.md
- [ ] Complete documentation exists
- [ ] Architecture clearly explained
- [ ] Deployment instructions included
- [ ] API endpoints documented
- [ ] Troubleshooting section present

### TESTING_GUIDE.md
- [ ] Test scenarios documented
- [ ] Unit tests listed
- [ ] Manual testing steps clear
- [ ] Expected results specified
- [ ] Debugging tips included

### CLAUDE.md
- [ ] SafeProtocol section added
- [ ] File locations documented
- [ ] Status shows "Phase 1 Complete"

---

## Sign-Off Checklist

**By the user:**
- [ ] I have run the database migration
- [ ] All tables and columns created successfully
- [ ] Completed the full signing flow test
- [ ] Verified audit trail contains expected events
- [ ] Confirmed personal numbers are hashed (not plaintext)
- [ ] No errors in browser console
- [ ] All test scenarios passed

**Phase 1 Status:**
- [ ] ✅ Identity verification working
- [ ] ✅ Consent tracking working
- [ ] ✅ Audit trail recording
- [ ] ✅ Database secure
- [ ] ✅ Tests passing
- [ ] ✅ Documentation complete

---

## Next Steps

After verification:

1. ✅ Phase 1 complete and tested
2. 📝 Document any issues found in GitHub issues
3. 🚀 Ready for production deployment
4. ⏭️ Start Phase 2 (Cryptographic Signing)

---

**Checklist Version**: 1.0
**Last Updated**: January 2026
**Estimated Completion Time**: 30-45 minutes
