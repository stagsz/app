/**
 * POST /api/safeprotocol/verify-identity/collect
 *
 * Poll BankID for authentication status
 * Called repeatedly by client to check if user has completed BankID authentication
 *
 * Body:
 * - orderRef: Order reference from BankID /init response
 * - signerId: UUID of the signer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  pollBankIDStatus,
  isBankIDError,
  extractAndValidatePersonalNumber,
  formatBankIDErrorMessage,
} from '@/lib/bankid';
import { getClientIp, getApproximateLocation } from '@/lib/ip-utils';

const RequestSchema = z.object({
  orderRef: z.string().min(1),
  signerId: z.string().uuid('Invalid signer ID'),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { orderRef, signerId } = RequestSchema.parse(body);

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
      .select('id, document_id, email, status')
      .eq('id', signerId)
      .single();

    if (signerError || !signer) {
      return NextResponse.json(
        { error: 'Signer not found' },
        { status: 404 }
      );
    }

    // Poll BankID for status
    const bankidResponse = await pollBankIDStatus(orderRef);

    // Handle BankID error
    if (isBankIDError(bankidResponse)) {
      // Log the failed attempt
      await supabase.from('compliance_audit').insert({
        signer_id: signerId,
        document_id: signer.document_id,
        event_type: 'identity_verification_failed',
        event_status: 'failed',
        error_message: bankidResponse.details,
        error_code: bankidResponse.errorCode,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return NextResponse.json(
        {
          status: 'failed',
          error: formatBankIDErrorMessage(bankidResponse),
          errorCode: bankidResponse.errorCode,
        },
        { status: 400 }
      );
    }

    // Return pending status
    if (bankidResponse.status === 'pending') {
      return NextResponse.json({
        status: 'pending',
        message: 'Awaiting authentication on your device...',
      });
    }

    // Handle authentication failure
    if (bankidResponse.status === 'failed') {
      await supabase.from('compliance_audit').insert({
        signer_id: signerId,
        document_id: signer.document_id,
        event_type: 'identity_verification_failed',
        event_status: 'failed',
        error_message: bankidResponse.hintCode || 'Authentication failed',
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return NextResponse.json(
        {
          status: 'failed',
          error: 'Authentication failed. Please try again.',
        },
        { status: 400 }
      );
    }

    // Authentication successful!
    if (bankidResponse.status === 'complete' && bankidResponse.completionData) {
      const completionData = bankidResponse.completionData;
      const user = completionData.user;

      // Validate and hash the personal number
      const personalNumberValidation = extractAndValidatePersonalNumber(user.personalNumber);
      if (!personalNumberValidation.valid) {
        await supabase.from('compliance_audit').insert({
          signer_id: signerId,
          document_id: signer.document_id,
          event_type: 'identity_verification_failed',
          event_status: 'failed',
          error_message: personalNumberValidation.error,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        return NextResponse.json(
          { error: 'Invalid identity information received from BankID' },
          { status: 400 }
        );
      }

      // Get approximate location for audit trail
      const location = await getApproximateLocation(ipAddress);

      // Update signer with verified identity
      const { error: updateError } = await supabase
        .from('signers')
        .update({
          verified_identity: user.name,
          identity_provider: 'bankid',
          personal_number_hash: personalNumberValidation.hash,
          verification_timestamp: new Date().toISOString(),
          verification_method: 'bankid_challenge',
          identity_verified: true,
        })
        .eq('id', signerId);

      if (updateError) {
        console.error('Failed to update signer identity:', updateError);
        return NextResponse.json(
          { error: 'Failed to save verified identity' },
          { status: 500 }
        );
      }

      // Log successful verification
      const { error: auditError } = await supabase.from('compliance_audit').insert({
        signer_id: signerId,
        document_id: signer.document_id,
        event_type: 'identity_verification_success',
        event_status: 'success',
        ip_address: ipAddress,
        user_agent: userAgent,
        location_country: location?.country,
        location_city: location?.city,
        metadata: {
          verifiedName: user.name,
          givenName: user.givenName,
          surname: user.surname,
          certNotBefore: completionData.cert.notBefore,
          certNotAfter: completionData.cert.notAfter,
        },
      });

      if (auditError) {
        console.error('Failed to log successful verification:', auditError);
      }

      return NextResponse.json({
        status: 'complete',
        verified: true,
        signer: {
          id: signerId,
          verifiedName: user.name,
          verifiedEmail: signer.email,
        },
        message: 'Identity verified successfully. You may now proceed to sign the document.',
      });
    }

    // Unknown status
    return NextResponse.json(
      { error: 'Unknown authentication status' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('BankID collect endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to check BankID status' },
      { status: 500 }
    );
  }
}
