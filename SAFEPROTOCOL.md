# SafeProtocol: eIDAS-Compliant e-Signature System

SafeProtocol is an advanced security protocol integrated into SimpleSign that provides legally binding, compliant e-signatures for small business owners in Sweden and the EU.

## Overview

SafeProtocol adds the following security features to SimpleSign:

### 1. **Identity Verification (BankID)**
- Swedish electronic ID verification via BankID
- Non-repudiation: Signers cannot deny they signed
- Stores verified identity with hashed personal number
- Legal compliance with eIDAS Article 25

### 2. **Consent Tracking**
- eIDAS Advanced Electronic Signature consent
- GDPR data processing consent
- Records when and where consent was given
- Maintains 7-year audit trail for disputes

### 3. **Compliance & Audit Trail**
- Complete audit logging of all signature events
- IP address, device, and location tracking
- Legally admissible proof of signing
- 7-year retention for compliance

### 4. **Cryptographic Foundation** (Future Phases)
- RSA-2048 signature generation per signer
- Qualified timestamping (TSA)
- Blockchain immutability (optional)
- Certificate revocation lists

---

## Phase 1: Identity Verification (Currently Implemented)

### Components

#### Database Schema
- `signers` table extended with:
  - `identity_verified` - Boolean flag
  - `verified_identity` - Full name from BankID
  - `personal_number_hash` - One-way hash of personnummer
  - `verification_timestamp` - When verified
  - `verification_method` - 'bankid_challenge'

- New tables:
  - `signature_certificates` - PKI certificates
  - `signature_records` - Cryptographic signatures
  - `compliance_consent` - Consent records
  - `compliance_audit` - Audit trail
  - `certificate_revocation` - Revoked certificates

#### API Endpoints

**`POST /api/safeprotocol/verify-identity/init`**
- Initiates BankID authentication
- Returns order reference and auto-start token
- Rate limited to prevent spam

**`POST /api/safeprotocol/verify-identity/collect`**
- Polls BankID for completion
- Returns verified identity on success
- Updates signer record with verified data

**`POST /api/safeprotocol/consent/submit`**
- Records signer consent before signing
- Supports eIDAS and GDPR consent types
- Logs IP, device, user-agent for audit trail

#### Components

**`BankIDVerification.tsx`**
- Modal for BankID authentication
- Shows reference number for manual entry
- Polls for completion with visual feedback
- Swedish UI with clear instructions

**`ConsentModal.tsx`**
- Shows eIDAS and GDPR consent terms
- Requires explicit acceptance of both terms
- Records consent with timestamp

#### Modules

**`lib/bankid.ts`**
- BankID API integration
- Personal number validation (Swedish format)
- Certificate validation helpers
- Error message formatting

**`lib/safeprotocol.ts`**
- High-level SafeProtocol functions
- BankID verification flow
- Consent submission
- State management helpers

**`lib/ip-utils.ts`**
- Extracts client IP from proxy headers
- Validates IPv4/IPv6 addresses
- Optional geolocation lookup

---

## Deployment & Setup

### 1. Database Migration

Run the migration to add SafeProtocol tables:

```sql
-- In Supabase SQL Editor, run:
-- app/supabase/safeprotocol_migration.sql
```

**Or via CLI:**
```bash
supabase migration add add_safeprotocol
supabase db push
```

### 2. Environment Variables

Add to `.env.local`:

```bash
# BankID Configuration
BANKID_ENVIRONMENT=test  # 'test' or 'production'
BANKID_CERT_PATH=/certs/bankid.pem  # Optional: path to client certificate

# Optional: Geolocation service
MAXMIND_LICENSE_KEY=your_key  # For IP geolocation in audit trail
```

### 3. BankID Integration

**For Development (Test Environment):**
- BankID provides free test credentials
- Test environment URL: `https://appapi2.test.bankid.com/rp/v6.0`
- Swedish test personnummer available

**For Production:**
- Register with BankID via their partner portal
- Obtain client certificate (mTLS)
- Configure production environment variables
- Production URL: `https://appapi2.bankid.com/rp/v6.0`

### 4. Security Considerations

**HTTPS Required**
- BankID requires HTTPS for all callbacks
- All authentication tokens must be transmitted over HTTPS

**Rate Limiting**
- Signing endpoints have IP-based rate limiting
- BankID endpoints limited to prevent abuse
- Adjust `lib/rate-limit.ts` for production load

**Data Security**
- Personal numbers are hashed (SHA-256), never stored in plaintext
- Sensitive data stored in RLS-protected tables
- GDPR-compliant: right to erasure implemented
- 7-year retention for legal compliance

---

## User Flow

### Signing a Document with SafeProtocol

1. **User Visits Signing Page**
   - Accesses `/sign/[token]` with unique signer token

2. **Identity Verification (SafeProtocol Phase 1)**
   - System checks if identity is verified
   - If not, shows BankID verification modal
   - User authenticates with BankID on their device
   - System verifies identity and stores hashed personal number

3. **Consent Recording**
   - After verification, consent modal appears
   - User reviews eIDAS and GDPR terms
   - Must accept both to proceed
   - System records consent with timestamp and IP

4. **Document Signing**
   - User draws signatures and fills fields
   - Submits completed document
   - System creates signature records
   - Email notifications sent to all parties

5. **Audit Trail**
   - Complete history stored in `compliance_audit`
   - Includes verification, consent, signing events
   - Searchable by document, signer, or event type

---

## Testing SafeProtoceer

### Test Account

Use Swedish test personnummer in test environment:

- **BankID Test Site**: https://www.bankid.com/en/testing-bankid
- **Test Personnummer**: `197603021234` (format: YYYYMMDDNNNN)
- **Test Environment**: Set `BANKID_ENVIRONMENT=test`

### Manual Testing

1. Start signing process
2. When BankID modal appears, click "Start BankID"
3. Copy the reference number
4. Visit BankID test site and use test credentials
5. Complete authentication
6. Return to SimpleSign - identity should verify
7. Accept consent terms
8. Complete document signing

### Automated Testing

```typescript
// Example test
import { initiateBankIDVerification, pollBankIDVerification } from '@/lib/safeprotocol'

async function testBankIDFlow() {
  // 1. Initiate
  const init = await initiateBankIDVerification(signerId)
  expect(init.status).toBe('authenticating')

  // 2. Poll until complete (in test, happens instantly)
  let status = init.status
  while (status === 'pending' || status === 'authenticating') {
    const result = await pollBankIDVerification(init.orderRef, signerId)
    status = result.status
    if (status === 'complete') {
      console.log('Verified as:', result.verifiedName)
    }
  }
}
```

---

## Compliance & Legal

### eIDAS Directive Compliance

SafeProtocol implements:
- **Article 25**: Requirements for advanced electronic signatures
- **Article 28**: Qualified Timestamping Service (Phase 3)
- **Article 32**: Signature validation and verification
- **Recital 49**: Legal effect of electronic signatures

### GDPR Compliance

- **Data Minimization**: Only stores hashed personal number
- **Retention**: 7 years for legal compliance
- **Right to Erasure**: Personal data deletion on request
- **Processing Agreement**: Available on request
- **Data Security**: Encrypted at rest, HTTPS in transit

### Swedish Legal Framework

- **Bank Act (2004:297)**: BankID as approved electronic ID
- **E-Commerce Directive**: Electronic document authentication
- **Contract Law**: Electronic signatures are legally binding
- **Dispute Resolution**: 7-year audit trail enables resolution

---

## Future Phases

### Phase 2: Cryptographic Signing
- RSA-2048 keypair generation per signer
- Document hash (SHA-256) calculation
- Cryptographic signature on document hash
- Certificate management and validation
- Non-repudiation proof

### Phase 3: Timestamping & Certification
- Time Stamp Authority (TSA) integration
- RFC 3161 timestamp tokens
- Qualified signature certificates
- Certificate revocation checking
- Legal-grade timestamp proof

### Phase 4: Blockchain Recording
- Optional Ethereum/Polygon recording
- Immutable proof of signing
- Third-party verification capability
- Smart contract integration
- Dispute resolution automation

### Phase 5: Advanced Features
- Multi-signature workflows
- Threshold signing (M-of-N)
- Signature validation API
- Compliance report generation
- Integration with other eSignature systems

---

## Configuration Reference

### BankID Configuration

```typescript
// lib/bankid.ts
const BANKID_CONFIG = {
  production: {
    apiUrl: 'https://appapi2.bankid.com/rp/v6.0',
    certificatePath: process.env.BANKID_CERT_PATH
  },
  test: {
    apiUrl: 'https://appapi2.test.bankid.com/rp/v6.0',
    certificatePath: process.env.BANKID_CERT_PATH
  }
}
```

### Rate Limiting

Edit `lib/rate-limit.ts` to adjust limits:

```typescript
// Current limits:
// - Sign token access: 30 requests/minute per IP
// - Sign submit: 10 requests/minute per IP
// - Waitlist: 5 requests/minute per IP
// - BankID: Rate limited by external service
```

### Consent Terms

Edit `api/safeprotocol/consent/submit/route.ts` to customize Swedish terms:

```typescript
const CONSENT_TEMPLATES: Record<string, string> = {
  eidas_advanced_signature: '...Swedish terms...',
  gdpr_data_processing: '...Swedish terms...'
}
```

---

## API Reference

### POST /api/safeprotocol/verify-identity/init

**Request:**
```json
{
  "signerId": "uuid",
  "personalNumber": "optional-personnummer",
  "challenge": "optional-challenge"
}
```

**Response (Success):**
```json
{
  "success": true,
  "orderRef": "string",
  "autoStartToken": "string",
  "signerId": "uuid",
  "message": "BankID authentication initiated..."
}
```

**Response (Error):**
```json
{
  "error": "error message",
  "errorCode": "INVALID_PARAMETERS|GENERAL_ERROR|..."
}
```

---

### POST /api/safeprotocol/verify-identity/collect

**Request:**
```json
{
  "orderRef": "string",
  "signerId": "uuid"
}
```

**Response (Pending):**
```json
{
  "status": "pending",
  "message": "Awaiting authentication on your device..."
}
```

**Response (Complete):**
```json
{
  "status": "complete",
  "verified": true,
  "signer": {
    "id": "uuid",
    "verifiedName": "John Doe",
    "verifiedEmail": "john@example.com"
  }
}
```

---

### POST /api/safeprotocol/consent/submit

**Request:**
```json
{
  "signerId": "uuid",
  "consentTypes": ["eidas_advanced_signature", "gdpr_data_processing"],
  "deviceId": "optional-device-id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "signerId": "uuid",
  "consentedTypes": ["eidas_advanced_signature", "gdpr_data_processing"]
}
```

---

## Troubleshooting

### BankID Connection Issues

**Problem**: "Failed to initiate BankID authentication"
- Check `BANKID_ENVIRONMENT` is set correctly ('test' or 'production')
- Verify network connectivity to BankID API
- Check if BankID service is operational

**Problem**: "User cancelled authentication"
- User clicked Cancel in BankID app
- Implementation correctly handles user cancellation
- Offer to retry

### Consent Modal Not Appearing

**Problem**: Consent modal doesn't show after verification
- Check browser console for errors
- Verify `handleBankIDVerified` is called with verified name
- Check React state management

### Audit Log Issues

**Problem**: Events not appearing in audit trail
- Verify Supabase RLS policies allow inserts
- Check database constraints
- Monitor application logs for errors

---

## Support & Questions

For questions about SafeProtocol:
1. Check this documentation
2. Review code comments in `lib/bankid.ts` and `lib/safeprotocol.ts`
3. Check Supabase RLS policies in `safeprotocol_migration.sql`
4. Review component implementations in `components/`

For BankID-specific issues:
- Visit https://www.bankid.com/en/for-developers
- Check BankID documentation: https://www.bankid.com/en/developer

---

## Version History

**Version 1.0.0** (Phase 1 - Current)
- BankID identity verification
- Consent tracking
- Compliance audit logging
- eIDAS compliance framework

**Planned: Version 2.0.0** (Phase 2)
- Cryptographic signing
- RSA-2048 signatures
- Document hashing

**Planned: Version 3.0.0** (Phase 3)
- TSA timestamping
- Qualified certificates
- Advanced validation

**Planned: Version 4.0.0** (Phase 4)
- Blockchain recording
- Third-party verification
- Immutable proof

---

**Last Updated**: January 2026
**Status**: Phase 1 Complete, Ready for Deployment
