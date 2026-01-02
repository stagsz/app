# SafeProtocol Phase 1: Quick Start Deployment

**⏱️ Time Required: 10 minutes**

## 1️⃣ Run Database Migration (5 min)

### In Supabase Dashboard:

1. Go to **SQL Editor** → **New Query**
2. Copy entire contents of: `app/supabase/safeprotocol_migration.sql`
3. Paste into editor
4. Click **Run**
5. ✅ You should see "Query executed successfully"

**That's it!** All tables and columns are now created.

---

## 2️⃣ Configure Environment (2 min)

Add to `app/.env.local`:

```bash
BANKID_ENVIRONMENT=test
```

Restart your dev server (`npm run dev`)

---

## 3️⃣ Test It Works (3 min)

### Quick Test:

1. **Create a test document:**
   - Go to http://localhost:3000/dashboard
   - Upload a PDF
   - Add test signer (any email)
   - Send for signing

2. **Visit signing link:**
   - You'll see the BankID modal
   - ✅ If you see "Start BankID-verifiering" button → Deployment successful!

3. **Verify Database:**
   - In Supabase, go to **Table Editor**
   - Look for new tables:
     - `signature_certificates`
     - `signature_records`
     - `compliance_consent`
     - `compliance_audit`
   - ✅ All should exist

---

## What Gets Deployed

### New Tables (5)
- `signature_certificates` - PKI certificates
- `signature_records` - Cryptographic signatures
- `compliance_consent` - Consent records
- `compliance_audit` - 7-year audit trail
- `certificate_revocation` - Revoked certificates

### Updated Tables (2)
- `signers` - Added 5 new columns for identity verification
- `documents` - Added 4 new columns for document integrity

### Helper Functions (3)
- `is_signature_valid()` - Check if signature is valid
- `revoke_signature()` - Revoke a signature
- `cleanup_expired_audit_logs()` - Clean up old logs

### Row Level Security (RLS)
- All new tables have RLS enabled
- Policies allow document owners to view/manage their data

---

## Next: Test with BankID

Once deployed, test the full flow:

1. **Get test credentials:**
   - Visit: https://www.bankid.com/en/testing-bankid
   - Use: `197603021234` (test personnummer)

2. **Test signing:**
   - Open signing link
   - Click "Start BankID-verifiering"
   - Copy reference number
   - Go to BankID test site and authenticate
   - Return to signing page
   - Identity should verify! ✅
   - Accept consent terms
   - Sign document

3. **Check audit trail:**
   - In Supabase, open `compliance_audit` table
   - You should see events logged:
     - `identity_verification_initiated`
     - `identity_verification_success`
     - `consent_accepted`

---

## That's It! 🎉

Phase 1 is now live!

### What You Have Now:
✅ BankID identity verification
✅ Consent tracking (eIDAS + GDPR)
✅ 7-year compliance audit trail
✅ Legal compliance framework

### Coming Next (Optional):
- Phase 2: Cryptographic signing (RSA-2048)
- Phase 3: Time Stamp Authority (TSA)
- Phase 4: Blockchain recording

---

## Troubleshooting

**BankID modal doesn't appear?**
- Check `BANKID_ENVIRONMENT=test` in `.env.local`
- Restart dev server
- Check browser console for errors

**Can't verify identity?**
- Use test personnummer: `197603021234`
- Make sure you're in BankID test environment
- Check Supabase logs for errors

**Audit trail not recording?**
- Verify `compliance_audit` table exists
- Check browser network tab for `/api/safeprotocol` requests
- Verify RLS policies aren't blocking inserts

---

## Files Added/Modified

**New Files:**
- `supabase/safeprotocol_migration.sql` - Database migration
- `lib/bankid.ts` - BankID integration
- `lib/safeprotocol.ts` - SafeProtocol API
- `lib/ip-utils.ts` - IP utilities
- `components/BankIDVerification.tsx` - ID modal
- `components/ConsentModal.tsx` - Consent modal
- `app/api/safeprotocol/` - API endpoints (3 routes)
- `SAFEPROTOCOL.md` - Full documentation
- `DEPLOY_SAFEPROTOCOL.md` - Deployment guide

**Modified Files:**
- `app/src/app/sign/[token]/page.tsx` - Added SafeProtocol flow
- `app/src/app/api/sign/[token]/route.ts` - Added identity_verified field
- `CLAUDE.md` - Added SafeProtocol section

---

## Support Resources

- **Full Documentation**: `SAFEPROTOCOL.md`
- **Deployment Guide**: `DEPLOY_SAFEPROTOCOL.md`
- **BankID Docs**: https://www.bankid.com/en/developer
- **eIDAS Info**: https://www.eid.as/

---

**Status**: ✅ Ready to Deploy
**Estimated Deployment Time**: 10 minutes
**Difficulty**: Easy (just run one SQL query)

Good luck! 🚀
