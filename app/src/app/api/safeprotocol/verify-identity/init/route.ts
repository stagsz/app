/**
 * POST /api/safeprotocol/verify-identity/init
 *
 * Initiate BankID authentication for a signer
 * Called when signer visits the signing page to verify their identity
 *
 * Body:
 * - signerId: UUID of the signer
 * - ipAddress: IP address of the requester
 * - personalNumber?: Optional Swedish personal number (for pre-filled auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { initiateBankIDAuth } from '@/lib/bankid';
import { getClientIp } from '@/lib/ip-utils';

const RequestSchema = z.object({
  signerId: z.string().uuid('Invalid signer ID'),
  personalNumber: z.string().optional(),
  challenge: z.string().optional(), // Optional challenge for additional security
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { signerId, personalNumber } = RequestSchema.parse(body);

    // Get client IP address for BankID authentication
    const ipAddress = getClientIp(request) || '127.0.0.1';

    // Get signer details from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: signer, error: signerError } = await supabase
      .from('signers')
      .select('id, document_id, email, name, status, identity_verified')
      .eq('id', signerId)
      .single();

    if (signerError || !signer) {
      return NextResponse.json(
        { error: 'Signer not found' },
        { status: 404 }
      );
    }

    // Check if signer is already verified
    if (signer.identity_verified) {
      return NextResponse.json(
        {
          error: 'Signer identity already verified',
          alreadyVerified: true,
        },
        { status: 400 }
      );
    }

    // Check if signer has already started authentication (prevent duplicate requests)
    // In production, you'd check for recent auth attempts
    const recentAuth = await checkRecentAuthAttempt(supabase, signerId);
    if (recentAuth) {
      return NextResponse.json(
        {
          error: 'Authentication already in progress',
          orderRef: recentAuth.orderRef,
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Initiate BankID authentication
    const bankidResponse = await initiateBankIDAuth({
      ipAddress,
      personalNumber,
      endUserMessage: `Please authenticate with BankID to sign "${signer.name || 'the document'}"`,
    });

    // Check if BankID returned an error
    if ('errorCode' in bankidResponse) {
      console.error('BankID authentication failed:', bankidResponse);
      return NextResponse.json(
        { error: bankidResponse.details },
        { status: 400 }
      );
    }

    // Store authentication attempt in database for tracking
    const { error: auditError } = await supabase.from('compliance_audit').insert({
      signer_id: signerId,
      document_id: signer.document_id,
      event_type: 'identity_verification_initiated',
      event_status: 'pending',
      ip_address: ipAddress,
      user_agent: request.headers.get('user-agent'),
      metadata: {
        orderRef: bankidResponse.orderRef,
        autoStartToken: bankidResponse.autoStartToken,
      },
    });

    if (auditError) {
      console.error('Failed to log audit trail:', auditError);
      // Continue anyway - audit failure shouldn't block authentication
    }

    // Return BankID tokens to client
    return NextResponse.json({
      success: true,
      orderRef: bankidResponse.orderRef,
      autoStartToken: bankidResponse.autoStartToken,
      signerId,
      message: 'BankID authentication initiated. Complete the authentication on your device.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('BankID init endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate BankID authentication' },
      { status: 500 }
    );
  }
}

/**
 * Check if there's a recent authentication attempt for this signer
 * Prevents spam/duplicate requests within a time window
 */
async function checkRecentAuthAttempt(
  supabase: ReturnType<typeof createClient>,
  signerId: string,
  windowMinutes = 5
): Promise<{ orderRef: string } | null> {
  const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);

  const { data } = await supabase
    .from('compliance_audit')
    .select('metadata')
    .eq('signer_id', signerId)
    .eq('event_type', 'identity_verification_initiated')
    .eq('event_status', 'pending')
    .gte('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (data?.metadata && typeof data.metadata === 'object' && 'orderRef' in data.metadata) {
    return { orderRef: (data.metadata as any).orderRef };
  }

  return null;
}
