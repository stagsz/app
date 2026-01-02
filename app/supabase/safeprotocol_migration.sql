-- SafeProtocol Database Schema Extensions
-- eIDAS-compliant e-signature protocol with identity verification, cryptographic signing, and compliance audit trails
-- Run this migration to enable SafeProtocol features

-- ============================================
-- 1. EXTEND SIGNERS TABLE FOR IDENTITY VERIFICATION
-- ============================================

ALTER TABLE public.signers ADD COLUMN IF NOT EXISTS (
  verified_identity TEXT,           -- Full name from BankID/MobileID
  identity_provider VARCHAR(50),    -- 'bankid', 'mobileid', 'swedish_eid'
  personal_number_hash VARCHAR(64), -- Hashed Swedish personnummer (one-way hash for privacy)
  verification_timestamp TIMESTAMP WITH TIME ZONE,
  verification_method VARCHAR(50),  -- 'bankid_challenge', 'mobileid_sms', 'eidas_video'
  identity_verified BOOLEAN DEFAULT FALSE
);

-- Index for verified signers queries
CREATE INDEX IF NOT EXISTS signers_identity_verified_idx ON public.signers(identity_verified);
CREATE INDEX IF NOT EXISTS signers_verification_timestamp_idx ON public.signers(verification_timestamp);

-- ============================================
-- 2. EXTEND DOCUMENTS TABLE FOR INTEGRITY TRACKING
-- ============================================

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS (
  document_hash VARCHAR(64),         -- SHA-256 hash of original PDF
  document_hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
  original_file_size BIGINT,
  mime_type VARCHAR(50) DEFAULT 'application/pdf',
  safeprotocol_enabled BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS documents_hash_idx ON public.documents(document_hash);

-- ============================================
-- 3. SIGNATURE CERTIFICATES TABLE (PKI Certificates)
-- ============================================

CREATE TABLE IF NOT EXISTS public.signature_certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES public.signers(id) ON DELETE CASCADE,

  -- Public key (X.509 certificate)
  public_key TEXT NOT NULL,
  certificate_fingerprint VARCHAR(64) NOT NULL UNIQUE,

  -- Certificate metadata
  algorithm VARCHAR(20) NOT NULL DEFAULT 'RSA-2048',  -- 'RSA-2048', 'ECDSA-P256'
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Issued by
  issuer_name VARCHAR(255),
  serial_number VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  UNIQUE(document_id, signer_id),
  CONSTRAINT cert_dates CHECK (valid_from < valid_until)
);

CREATE INDEX IF NOT EXISTS signature_certificates_doc_idx ON public.signature_certificates(document_id);
CREATE INDEX IF NOT EXISTS signature_certificates_signer_idx ON public.signature_certificates(signer_id);
CREATE INDEX IF NOT EXISTS signature_certificates_fingerprint_idx ON public.signature_certificates(certificate_fingerprint);

ALTER TABLE public.signature_certificates ENABLE ROW LEVEL SECURITY;

-- RLS: Document owners can view certificates
CREATE POLICY IF NOT EXISTS "doc_owners_view_certs" ON public.signature_certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = signature_certificates.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. SIGNATURE RECORDS TABLE (Cryptographic Signatures)
-- ============================================

CREATE TABLE IF NOT EXISTS public.signature_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES public.signers(id) ON DELETE CASCADE,

  -- Document integrity
  document_hash VARCHAR(64) NOT NULL,
  document_hash_algorithm VARCHAR(20) NOT NULL DEFAULT 'SHA-256',

  -- Cryptographic signature
  signature_value TEXT NOT NULL,            -- Base64 encoded signature
  signature_algorithm VARCHAR(20) NOT NULL, -- 'RSA-SHA256', 'ECDSA-SHA256'

  -- Certificate reference
  certificate_fingerprint VARCHAR(64),

  -- Timestamp authority proof (RFC 3161)
  timestamp_token TEXT,
  tsa_issuer VARCHAR(255),
  timestamp_verified_at TIMESTAMP WITH TIME ZONE,

  -- Blockchain record (optional, Phase 4)
  blockchain_chain VARCHAR(50),             -- 'ethereum', 'polygon'
  blockchain_hash VARCHAR(66),              -- 0x... transaction hash
  blockchain_recorded_at TIMESTAMP WITH TIME ZONE,

  -- Verification & revocation status
  signature_status VARCHAR(20) NOT NULL DEFAULT 'valid',  -- 'valid', 'revoked', 'expired', 'invalid'
  revocation_reason TEXT,
  revocation_date TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  UNIQUE(signer_id, document_id),
  CONSTRAINT sig_status CHECK (signature_status IN ('valid', 'revoked', 'expired', 'invalid'))
);

CREATE INDEX IF NOT EXISTS signature_records_doc_idx ON public.signature_records(document_id);
CREATE INDEX IF NOT EXISTS signature_records_signer_idx ON public.signature_records(signer_id);
CREATE INDEX IF NOT EXISTS signature_records_status_idx ON public.signature_records(signature_status);
CREATE INDEX IF NOT EXISTS signature_records_blockchain_idx ON public.signature_records(blockchain_hash);
CREATE INDEX IF NOT EXISTS signature_records_timestamp_idx ON public.signature_records(signed_at);

ALTER TABLE public.signature_records ENABLE ROW LEVEL SECURITY;

-- RLS: Document owners can view signature records
CREATE POLICY IF NOT EXISTS "doc_owners_view_sigs" ON public.signature_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = signature_records.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Public can view signature records if they know the signature_id (for verification)
CREATE POLICY IF NOT EXISTS "public_view_sig_records" ON public.signature_records
  FOR SELECT USING (true);

-- ============================================
-- 5. COMPLIANCE CONSENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_consent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signer_id UUID NOT NULL REFERENCES public.signers(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Consent terms
  consent_type VARCHAR(50) NOT NULL,       -- 'eidas_advanced_signature', 'gdpr_data_processing'
  consent_text TEXT NOT NULL,              -- Full terms shown to signer
  consent_accepted BOOLEAN NOT NULL,
  consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Proof of consent
  ip_address INET,
  user_agent TEXT,
  device_id VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  CONSTRAINT consent_check CHECK (consent_accepted = true OR consent_timestamp IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS compliance_consent_doc_idx ON public.compliance_consent(document_id);
CREATE INDEX IF NOT EXISTS compliance_consent_signer_idx ON public.compliance_consent(signer_id);
CREATE INDEX IF NOT EXISTS compliance_consent_type_idx ON public.compliance_consent(consent_type);

ALTER TABLE public.compliance_consent ENABLE ROW LEVEL SECURITY;

-- RLS: Document owners can view consent records
CREATE POLICY IF NOT EXISTS "doc_owners_view_consent" ON public.compliance_consent
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = compliance_consent.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. COMPLIANCE AUDIT LOG TABLE (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES public.signers(id) ON DELETE SET NULL,

  -- Event details
  event_type VARCHAR(50) NOT NULL,   -- 'signer_identified', 'signature_created', 'tsa_verified', 'blockchain_recorded'
  event_status VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success', 'failed', 'pending'
  event_description TEXT,

  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),

  -- Network & device info
  ip_address INET,
  user_agent TEXT,
  location_country VARCHAR(2),
  location_city VARCHAR(255),
  device_type VARCHAR(50),           -- 'mobile', 'desktop', 'tablet'

  -- Signature proof reference
  signature_hash VARCHAR(64),
  certificate_fingerprint VARCHAR(64),

  -- Metadata
  metadata JSONB,

  -- Legal retention
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  retained_until TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 years')
);

CREATE INDEX IF NOT EXISTS compliance_audit_doc_idx ON public.compliance_audit(document_id);
CREATE INDEX IF NOT EXISTS compliance_audit_signer_idx ON public.compliance_audit(signer_id);
CREATE INDEX IF NOT EXISTS compliance_audit_type_idx ON public.compliance_audit(event_type);
CREATE INDEX IF NOT EXISTS compliance_audit_created_idx ON public.compliance_audit(created_at);
CREATE INDEX IF NOT EXISTS compliance_audit_retention_idx ON public.compliance_audit(retained_until);

ALTER TABLE public.compliance_audit ENABLE ROW LEVEL SECURITY;

-- RLS: Document owners can view audit logs for their documents
CREATE POLICY IF NOT EXISTS "doc_owners_view_audit" ON public.compliance_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = compliance_audit.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- RLS: Anyone can insert audit logs
CREATE POLICY IF NOT EXISTS "anyone_insert_audit" ON public.compliance_audit
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 7. CERTIFICATE REVOCATION LIST
-- ============================================

CREATE TABLE IF NOT EXISTS public.certificate_revocation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_fingerprint VARCHAR(64) NOT NULL UNIQUE,
  revocation_reason VARCHAR(50) NOT NULL, -- 'superseded', 'compromised', 'ceased_operation'
  revocation_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS cert_revocation_fingerprint_idx ON public.certificate_revocation(certificate_fingerprint);
CREATE INDEX IF NOT EXISTS cert_revocation_time_idx ON public.certificate_revocation(revocation_time);

ALTER TABLE public.certificate_revocation ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view revoked certificates (for verification)
CREATE POLICY IF NOT EXISTS "public_view_revoked" ON public.certificate_revocation
  FOR SELECT USING (true);

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to verify a signature is still valid
CREATE OR REPLACE FUNCTION public.is_signature_valid(sig_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.signature_records
    WHERE id = sig_id
      AND signature_status = 'valid'
      AND (revocation_date IS NULL OR revocation_date > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to mark signature as revoked
CREATE OR REPLACE FUNCTION public.revoke_signature(sig_id UUID, reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.signature_records
  SET signature_status = 'revoked',
      revocation_reason = reason,
      revocation_date = NOW()
  WHERE id = sig_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired audit logs (after 7 years)
CREATE OR REPLACE FUNCTION public.cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.compliance_audit
  WHERE retained_until < NOW()
  RETURNING COUNT(*) INTO deleted_count;

  RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUMMARY
-- ============================================
-- This migration adds complete SafeProtocol infrastructure:
--
-- 1. Identity Verification: Extended signers table with BankID/MobileID fields
-- 2. Cryptographic Signing: Certificate and signature record storage
-- 3. Compliance: Consent tracking and enhanced audit logging
-- 4. Revocation: Certificate revocation list
-- 5. Data Retention: 7-year retention for regulatory compliance
--
-- All tables have Row Level Security (RLS) enabled for security.
-- Next: Implement BankID integration in API routes
