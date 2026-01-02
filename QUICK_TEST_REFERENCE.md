# SafeProtocol Phase 1: Quick Test Reference

**TL;DR Testing Guide** - Complete all tests in 45 minutes

---

## 🚀 Quick Setup (5 min)

```bash
# 1. Ensure migration is done
✅ Check Supabase SQL - should see 5 new tables

# 2. Set environment
✅ Add to .env.local: BANKID_ENVIRONMENT=test

# 3. Start server
✅ cd app && npm run dev
```

---

## 🧪 Run Tests (5 min)

```bash
# Terminal 1 - Keep dev server running
npm run dev

# Terminal 2 - Run tests
npm test

# Expected: All tests ✅ PASS
# Coverage: 93%+
```

---

## 🔄 Manual Test Flow (30 min)

### 1️⃣ Create Document (2 min)
```
Dashboard → New Document → Upload PDF → Add Signer → Add Fields → Send
```
**Expected**: Get signing URL ✅

### 2️⃣ Test BankID Modal (5 min)
```
Open signing URL → See BankID modal → Click "Start BankID-verifiering"
```
**Expected**: Reference number appears ✅

### 3️⃣ Authenticate (3 min)
```
Go to https://www.bankid.com/en/testing-bankid
Use: 197603021234
Return to signing page
```
**Expected**: Identity verifies ✅

### 4️⃣ Accept Consent (3 min)
```
Consent modal appears → Check both boxes → Click "Acceptera och fortsätt"
```
**Expected**: Modal closes, can sign ✅

### 5️⃣ Complete Signing (2 min)
```
Draw signature → Click "Signera dokument" → See success message
```
**Expected**: Document signed ✅

### 6️⃣ Verify Audit Trail (5 min)
```
Supabase → Table Editor → compliance_audit
Look for 3 events:
- identity_verification_initiated
- identity_verification_success
- consent_accepted
```
**Expected**: All 3 events logged ✅

### 7️⃣ Verify Security (5 min)
```
Supabase → signers table → Find your test signer
Check:
- identity_verified: true
- personal_number_hash: 64 chars (SHA-256)
- NOT plaintext personal number
```
**Expected**: Personal number is hashed, not plaintext ✅

---

## ✅ Success Checklist

After running all tests, you should have:

- [ ] Unit tests passing (npm test)
- [ ] BankID modal appears on signing page
- [ ] Can authenticate with test credentials
- [ ] Consent modal works
- [ ] Can complete signing
- [ ] 3 events in compliance_audit table
- [ ] Signer record updated with verified identity
- [ ] Personal number hashed (not plaintext)
- [ ] No console errors
- [ ] API responses < 500ms

---

## 🐛 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| BankID modal doesn't appear | Check `BANKID_ENVIRONMENT=test` in .env, restart server |
| Tests fail | Run `npm install`, check Node version (18+) |
| Audit trail empty | Go to Supabase, check `compliance_audit` table directly |
| Personal number not hashing | Verify it's 12 digits, format: YYYYMMDDNNNN |
| Rate limit error | Wait 1 minute, then retry |

---

## 📊 Testing Summary

| Test | Time | Status | Expected |
|------|------|--------|----------|
| Unit Tests | 2 min | ✅ | All pass |
| BankID Modal | 3 min | ✅ | Appears |
| Identity Verify | 3 min | ✅ | Succeeds |
| Consent | 3 min | ✅ | Both checked |
| Signing | 2 min | ✅ | Completes |
| Audit Trail | 5 min | ✅ | 3 events |
| Security Check | 5 min | ✅ | Hash verified |
| Database Check | 5 min | ✅ | All tables exist |
| **TOTAL** | **≈35 min** | **✅** | **All pass** |

---

## 🎯 Test Data

### Test Personnummer
```
197603021234
Format: YYYYMMDDNNNN (12 digits)
Valid for all Swedish tests
```

### Test Email
```
test@example.com
(Real email not needed for testing)
```

### Test Signer
```
Name: Test Signer
Email: test@example.com
```

---

## 📁 Key Files

```
Testing:
├── lib/bankid.test.ts              (8 tests)
├── lib/safeprotocol.test.ts        (7 tests)
└── api/safeprotocol/safeprotocol.test.ts  (20 tests)

Documentation:
├── TESTING_GUIDE.md                (Detailed guide)
├── VERIFICATION_CHECKLIST.md       (Sign-off checklist)
├── TEST_SUMMARY.md                 (Comprehensive report)
└── QUICK_TEST_REFERENCE.md         (This file)
```

---

## 🚀 After Testing

✅ All tests pass?
→ **Phase 1 is READY FOR PRODUCTION**

⚠️ Found issues?
→ Document in GitHub issues with test case

📚 Need more details?
→ Read `TESTING_GUIDE.md` for comprehensive guide

🔄 Ready for Phase 2?
→ Start cryptographic signing implementation

---

## 🎓 Test Scenarios Quick Reference

### ✅ Happy Path: Complete Signing
1. Create doc
2. Add signer
3. Send for signing
4. Authenticate with BankID
5. Accept consent
6. Sign document
7. Success ✅

### ❌ Error Path: User Cancels
1. Start BankID
2. User cancels in BankID app
3. Error modal appears
4. "Försök igen" button shown
5. Can restart ✅

### ❌ Error Path: Reject Consent
1. Identity verified
2. Consent modal appears
3. Don't check boxes
4. Button disabled
5. Must check both ✅

### 🔒 Security Path: Verify Hashing
1. Complete signing
2. Check signers table
3. Find personal_number_hash
4. Verify: 64 hex chars (SHA-256)
5. NOT plaintext ✅

---

## 💡 Pro Tips

1. **Speed up testing**: Create one document, use multiple signers
2. **Multiple browsers**: Test Chrome, Firefox, Safari
3. **Mobile**: Test on phone/tablet for responsive UI
4. **Network throttling**: Test with slow connection (DevTools)
5. **Accessibility**: Test with keyboard only (no mouse)

---

## 📞 Need Help?

- **Detailed testing**: See `TESTING_GUIDE.md`
- **Verification**: See `VERIFICATION_CHECKLIST.md`
- **Technical**: See `SAFEPROTOCOL.md`
- **Quick reference**: You're reading it! 👋

---

**Estimated Total Time**: 45 minutes
**Difficulty**: Easy
**Result**: Phase 1 Verified ✅

**Let's go! 🚀**
