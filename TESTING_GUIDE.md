# SafeProtocol Phase 1: Testing Guide

Complete guide for testing SafeProtocol identity verification and consent flow.

## Prerequisites

- ✅ SafeProtocol database migration deployed
- ✅ `BANKID_ENVIRONMENT=test` in `.env.local`
- ✅ Dev server running (`npm run dev`)
- ✅ Access to BankID test environment

---

## 1. Unit Tests

Run the automated test suites:

```bash
cd app

# Run all tests
npm test

# Run only SafeProtocol tests
npm test -- bankid.test.ts
npm test -- safeprotocol.test.ts

# Run with coverage
npm test -- --coverage
```

### Test Files

- **`lib/bankid.test.ts`** - BankID API and validation tests
- **`lib/safeprotocol.test.ts`** - SafeProtocol state management tests
- **`api/safeprotocol/safeprotocol.test.ts`** - API endpoint tests

### Expected Test Results

All tests should pass:
- ✅ Personal number validation
- ✅ BankID error formatting
- ✅ SafeProtocol state management
- ✅ API endpoint behavior

---

## 2. Manual End-to-End Testing

### Test Scenario 1: Complete Signing with Identity Verification

**Duration**: 5-10 minutes

#### Setup
1. Start dev server: `npm run dev`
2. Go to http://localhost:3000/dashboard
3. Sign in with test account

#### Steps

**Step 1: Create Test Document**
1. Click "Nya Dokument" (New Document)
2. Upload any PDF file (size < 10MB)
3. Click "Nästa" (Next)
4. Name the document: "TestDoc_SafeProtocol"
5. Click "Skapa" (Create)

**Step 2: Add Signer**
1. On document detail page, scroll to "Signatärer" (Signers)
2. Click "Lägg till signatär" (Add Signer)
3. Email: `test@example.com`
4. Name: `Test Signer`
5. Click "Lägg till" (Add)

**Step 3: Place Signature Fields**
1. Click on the PDF to place signature field
2. Click "Nästa" (Next) to confirm placement
3. Add at least one signature field
4. Click "Spara" (Save)

**Step 4: Send for Signing**
1. Click "Skicka för signering" (Send for Signing)
2. Confirm signers
3. Click "Skicka" (Send)
4. Copy the signing URL

#### Test the Signing Flow

**Step 5: Open Signing Page**
1. Open the signing URL in a new tab
2. Page loads: ✅ Document should be visible
3. Modal appears: ✅ Should see "BankID-verifiering" modal

**Step 6: Initiate BankID**
1. Click "Start BankID-verifiering" button
2. Expected: Modal shows loading state with "Initierar BankID..."
3. After 2-3 seconds, modal should show:
   - ✅ Reference number (e.g., "1234567890")
   - ✅ "Copy reference" button
   - ✅ Instructions in Swedish
   - ✅ Loading spinner with "Väntar på BankID-bekräftelse..."

**Step 7: Authenticate with BankID**
1. Go to: https://www.bankid.com/en/testing-bankid
2. Use test personnummer: `197603021234`
3. Complete the authentication process
4. Return to signing page

**Step 8: Verify Identity**
1. Expected: Modal should now show:
   - ✅ Green checkmark icon
   - ✅ "Identitet verifierad!" (Identity verified!)
   - ✅ Verified name
   - ✅ "Fortsätt" (Continue) button
2. Click "Fortsätt"

**Step 9: Accept Consent**
1. Expected: Consent modal should appear with:
   - ✅ eIDAS consent section (blue)
   - ✅ GDPR consent section (green)
   - ✅ Two checkboxes (unchecked initially)
2. Read terms
3. Check both checkboxes
4. Expected: "Acceptera och fortsätt" button becomes enabled
5. Click "Acceptera och fortsätt"

**Step 10: Sign Document**
1. BankID modal closes
2. Consent modal closes
3. Document should be visible with signature fields
4. Click on signature field
5. Draw signature in modal
6. Click "Spara" (Save)
7. Click "Signera dokument" (Sign Document)
8. Expected: Success message appears
9. ✅ Test complete!

---

### Test Scenario 2: Verify Audit Trail

**Duration**: 2-3 minutes

#### In Supabase Dashboard

1. Go to your Supabase project
2. Click **Table Editor**
3. Select **compliance_audit** table
4. You should see recent events:
   - ✅ `identity_verification_initiated`
   - ✅ `identity_verification_success`
   - ✅ `consent_accepted`

#### Check Each Event

1. Click on `identity_verification_initiated`:
   - ✅ `event_status`: "pending"
   - ✅ `event_type`: "identity_verification_initiated"
   - ✅ `signer_id`: matches your test signer
   - ✅ `ip_address`: populated
   - ✅ `metadata`: contains orderRef

2. Click on `identity_verification_success`:
   - ✅ `event_status`: "success"
   - ✅ `verified_identity`: should be hashed personal number

3. Click on `consent_accepted`:
   - ✅ `event_status`: "success"
   - ✅ `metadata`: contains consent types

#### Verify Signer Update

1. Go to **signers** table
2. Find your test signer
3. Check these columns:
   - ✅ `identity_verified`: true
   - ✅ `verified_identity`: "Test User"
   - ✅ `personal_number_hash`: 64-character hex string
   - ✅ `verification_timestamp`: recent timestamp
   - ✅ `verification_method`: "bankid_challenge"

---

### Test Scenario 3: Error Handling

**Duration**: 3-5 minutes

#### Test: Reject BankID

1. Start new signing process
2. Click "Start BankID-verifiering"
3. In BankID test site, click "Cancel"
4. Expected: Modal shows error message
5. ✅ Should see "Verifiering misslyckades" (Verification failed)
6. ✅ Should see "Försök igen" (Try again) button

#### Test: Reject Consent

1. Complete BankID verification successfully
2. Consent modal appears
3. Don't check the checkboxes
4. Try to click "Acceptera och fortsätt"
5. Expected: Button is disabled
6. ✅ Should see message in red saying you must accept both terms

#### Test: Multiple Verification Attempts

1. Complete one full signing
2. Create another document and try signing again
3. On second signing, try to verify again
4. Expected: Should work normally
5. ✅ Audit trail should have two verification events

---

### Test Scenario 4: Database Verification

**Duration**: 2-3 minutes

#### Verify All Tables Exist

In Supabase **Table Editor**, confirm these tables exist:

- ✅ `signature_certificates` - PKI certificates
- ✅ `signature_records` - Cryptographic signatures
- ✅ `compliance_consent` - Consent records
- ✅ `compliance_audit` - Audit trail
- ✅ `certificate_revocation` - Revoked certificates

#### Verify RLS Policies

1. Go to **Table Editor**
2. Select `compliance_audit`
3. Click **RLS** tab
4. You should see policies:
   - ✅ Document owners can view audit logs
   - ✅ Anyone can insert audit logs
5. Repeat for other SafeProtocol tables

#### Verify Indexes

Check that performance indexes exist:

```sql
-- In SQL Editor, run:
SELECT indexname FROM pg_indexes
WHERE tablename IN ('signature_certificates', 'signature_records', 'compliance_consent', 'compliance_audit');
```

Expected indexes:
- ✅ `signers_identity_verified_idx`
- ✅ `signers_verification_timestamp_idx`
- ✅ `signature_certificates_doc_idx`
- ✅ `signature_records_doc_idx`
- ✅ `compliance_audit_doc_idx`

---

## 3. API Testing with cURL/Postman

Test individual API endpoints:

### Test: Initialize BankID

```bash
curl -X POST http://localhost:3000/api/safeprotocol/verify-identity/init \
  -H "Content-Type: application/json" \
  -d '{
    "signerId": "YOUR_SIGNER_UUID"
  }'
```

Expected response:
```json
{
  "success": true,
  "orderRef": "string",
  "autoStartToken": "string",
  "signerId": "uuid",
  "message": "BankID authentication initiated..."
}
```

### Test: Poll BankID Status

```bash
curl -X POST http://localhost:3000/api/safeprotocol/verify-identity/collect \
  -H "Content-Type: application/json" \
  -d '{
    "orderRef": "order-ref-from-init",
    "signerId": "YOUR_SIGNER_UUID"
  }'
```

Expected response (pending):
```json
{
  "status": "pending",
  "message": "Awaiting authentication on your device..."
}
```

### Test: Submit Consent

```bash
curl -X POST http://localhost:3000/api/safeprotocol/consent/submit \
  -H "Content-Type: application/json" \
  -d '{
    "signerId": "YOUR_SIGNER_UUID",
    "consentTypes": ["eidas_advanced_signature", "gdpr_data_processing"]
  }'
```

Expected response:
```json
{
  "success": true,
  "signerId": "uuid",
  "consentedTypes": ["eidas_advanced_signature", "gdpr_data_processing"]
}
```

---

## 4. Browser DevTools Testing

### Network Tab

While testing, watch the **Network** tab in browser DevTools:

1. Filter by `/api/safeprotocol`
2. You should see requests:
   - ✅ POST `/api/safeprotocol/verify-identity/init` (200 OK)
   - ✅ POST `/api/safeprotocol/verify-identity/collect` (200 OK, repeated)
   - ✅ POST `/api/safeprotocol/consent/submit` (200 OK)

### Console Tab

Check **Console** tab for errors:
- ✅ Should see no errors
- ✅ Warnings about React DevTools are OK

### Application Tab

Check stored data:
- **LocalStorage**: Should not contain sensitive data
- **SessionStorage**: Should not contain personal numbers
- **Cookies**: Should have Supabase auth cookie

---

## 5. Performance Testing

### Load Testing

Test with multiple concurrent signings:

```bash
# This simulates 10 concurrent signing requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/safeprotocol/verify-identity/init \
    -H "Content-Type: application/json" \
    -d "{\"signerId\": \"test-uuid-$i\"}" &
done
wait
```

Expected:
- ✅ All requests complete successfully
- ✅ No rate limiting errors (unless truly spamming)
- ✅ Database handles concurrent writes

### Database Performance

Check query performance:

```sql
-- Check audit log inserts are fast
SELECT COUNT(*) FROM compliance_audit WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM compliance_audit WHERE signer_id = 'test-uuid' AND event_type = 'identity_verification_success';
```

Expected:
- ✅ Query uses index (Seq Scan shouldn't appear)
- ✅ Query time < 1ms

---

## 6. Security Testing

### HTTPS Requirement

- ✅ Dev server runs on HTTP (OK for local testing)
- ✅ Production must use HTTPS (BankID requirement)

### Rate Limiting

Test that rate limiting works:

1. Open signing page
2. Spam "Start BankID-verifiering" button 30+ times rapidly
3. Expected: After ~30 requests, get 429 error
4. Wait 1 minute
5. Expected: Rate limit resets, can request again

### Personal Number Handling

Verify personal numbers are never stored plaintext:

```sql
-- Should return no results
SELECT * FROM signers WHERE personal_number_hash IS NULL AND identity_verified = true;

-- All hashes should be 64 characters (SHA-256)
SELECT DISTINCT LENGTH(personal_number_hash) FROM signers WHERE personal_number_hash IS NOT NULL;
-- Should show: 64
```

### Data Privacy

Check GDPR compliance:

```sql
-- Verify audit logs have retention dates
SELECT COUNT(*) FROM compliance_audit WHERE retained_until IS NOT NULL;

-- Check old logs are marked for deletion
SELECT COUNT(*) FROM compliance_audit
WHERE retained_until < NOW() - INTERVAL '7 years';
```

---

## Test Checklist

### Unit Tests
- [ ] `npm test` passes all tests
- [ ] BankID validation tests pass
- [ ] SafeProtocol state tests pass
- [ ] API endpoint tests pass

### Manual Testing
- [ ] Complete signing flow works end-to-end
- [ ] BankID modal appears and functions
- [ ] Consent modal appears after verification
- [ ] Can sign document after consent
- [ ] Audit trail records all events
- [ ] Signer record updated with verified identity
- [ ] Personal number is hashed (not plaintext)

### Database
- [ ] All 5 new tables exist
- [ ] Signers table has new columns
- [ ] Documents table has new columns
- [ ] RLS policies are enabled
- [ ] Indexes exist for performance

### Error Handling
- [ ] User cancels BankID → Error shown
- [ ] User rejects consent → Error shown
- [ ] Invalid signer ID → Error shown
- [ ] Database errors → Graceful fallback

### Security
- [ ] Rate limiting works
- [ ] Personal numbers hashed
- [ ] Audit trail complete
- [ ] RLS prevents unauthorized access

---

## Debugging Tips

### If BankID Modal Doesn't Appear

1. Check `BANKID_ENVIRONMENT=test` in `.env.local`
2. Restart dev server
3. Check browser console for errors
4. Verify signer doesn't have `identity_verified = true`
5. Check network tab for API requests

### If Audit Trail Empty

1. Verify `compliance_audit` table exists
2. Check network tab for `/api/safeprotocol` POST requests
3. Look for console errors
4. Check Supabase logs
5. Verify RLS policy `anyone_insert_audit` exists

### If Personal Number Not Hashing

1. Check `lib/bankid.ts` - `extractAndValidatePersonalNumber` function
2. Verify number format (12 or 10 digits)
3. Check SHA-256 hashing logic
4. Test in Node.js console directly

### Performance Issues

1. Check database indexes are created
2. Review Supabase slow query log
3. Check network waterfall for slow requests
4. Monitor memory usage during tests

---

## Next Steps

After passing all tests:

1. ✅ Phase 1 complete and tested
2. 📝 Document any issues found
3. 🚀 Ready for production (with real BankID)
4. ⏭️ Plan Phase 2 (Cryptographic Signing)

---

**Status**: Testing Guide Complete
**Last Updated**: January 2026
