/**
 * POST /api/safeprotocol/consent/submit
 *
 * Record signer's consent before signing
 * Captures that signer has read and accepted signing terms
 *
 * Body:
 * - signerId: UUID of the signer
 * - consentTypes: Array of consent types being accepted
 *   - 'eidas_advanced_signature': Consent to create legally binding e-signature
 *   - 'gdpr_data_processing': Consent to process identity data
 * - ipAddress: IP address (optional, will be extracted from request)
 * - deviceId: Optional device identifier
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getClientIp } from '@/lib/ip-utils';

const RequestSchema = z.object({
  signerId: z.string().uuid('Invalid signer ID'),
  consentTypes: z.array(
    z.enum(['eidas_advanced_signature', 'gdpr_data_processing']),
    { message: 'Invalid consent type' }
  ),
  deviceId: z.string().optional(),
});

export const runtime = 'nodejs';

// Consent text templates (in Swedish)
const CONSENT_TEMPLATES: Record<string, string> = {
  eidas_advanced_signature: `Du är på väg att skapa en juridiskt bindande elektronisk signatur enligt eIDAS-förordningen.
Denna signatur är lika gällande som en handskriven signatur och kan inte enkelt ankäras senare.
Genom att klicka "Acceptera" bekräftar du att du är den person som identifierades via BankID
och att du är medveten om innebörden av att signera detta dokument.`,

  gdpr_data_processing: `Din identitet har verifierats genom BankID och din personliga identifieringsnummer
(personnummer) lagras i krypterad form för revisionsändamål enligt lagkrav.
Denna data behandlas enligt GDPR och lagras i högst 7 år för juridisk compliance.
Genom att klicka "Acceptera" samtycker du till denna databehandling.`,
};

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { signerId, consentTypes, deviceId } = RequestSchema.parse(body);

    const ipAddress = getClientIp(request) || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get signer details
    const { data: signer, error: signerError } = await supabase
      .from('signers')
      .select('id, document_id, email, identity_verified')
      .eq('id', signerId)
      .single();

    if (signerError || !signer) {
      return NextResponse.json(
        { error: 'Signer not found' },
        { status: 404 }
      );
    }

    // Verify signer identity has been verified before allowing signing
    if (!signer.identity_verified) {
      return NextResponse.json(
        {
          error: 'Identity verification required before accepting consent',
          requiresIdentityVerification: true,
        },
        { status: 403 }
      );
    }

    // Record each consent type
    const consentRecords = consentTypes.map(consentType => ({
      signer_id: signerId,
      document_id: signer.document_id,
      consent_type: consentType,
      consent_text: CONSENT_TEMPLATES[consentType],
      consent_accepted: true,
      consent_timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      device_id: deviceId || null,
    }));

    const { error: insertError } = await supabase
      .from('compliance_consent')
      .insert(consentRecords);

    if (insertError) {
      console.error('Failed to record consent:', insertError);
      return NextResponse.json(
        { error: 'Failed to record consent' },
        { status: 500 }
      );
    }

    // Log consent submission to audit trail
    const { error: auditError } = await supabase.from('compliance_audit').insert({
      signer_id: signerId,
      document_id: signer.document_id,
      event_type: 'consent_accepted',
      event_status: 'success',
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        consentTypes,
        deviceId: deviceId || null,
      },
    });

    if (auditError) {
      console.error('Failed to log consent audit:', auditError);
      // Continue anyway
    }

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully. You may now proceed to sign the document.',
      signerId,
      consentedTypes: consentTypes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Consent submit endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/safeprotocol/consent/templates
 * Get consent text templates
 */
export async function GET(request: NextRequest) {
  const consentType = request.nextUrl.searchParams.get('type');

  if (consentType && consentType in CONSENT_TEMPLATES) {
    return NextResponse.json({
      consentType,
      text: CONSENT_TEMPLATES[consentType as keyof typeof CONSENT_TEMPLATES],
    });
  }

  // Return all templates
  return NextResponse.json({
    templates: CONSENT_TEMPLATES,
  });
}
