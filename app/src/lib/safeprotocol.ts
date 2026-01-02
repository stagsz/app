/**
 * SafeProtocol Signing Module
 * Handles identity verification and consent flow for legally compliant e-signatures
 */

export interface BankIDAuthState {
  status: 'pending' | 'authenticating' | 'complete' | 'failed';
  orderRef?: string;
  autoStartToken?: string;
  error?: string;
  verifiedName?: string;
}

export interface SafeProtocolSigningState {
  identityVerified: boolean;
  consentGiven: boolean;
  bankidState: BankIDAuthState;
  error?: string;
}

/**
 * Initiate BankID verification for a signer
 */
export async function initiateBankIDVerification(signerId: string): Promise<BankIDAuthState> {
  try {
    const response = await fetch('/api/safeprotocol/verify-identity/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signerId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        status: 'failed',
        error: data.error || 'BankID verification failed',
      };
    }

    return {
      status: 'authenticating',
      orderRef: data.orderRef,
      autoStartToken: data.autoStartToken,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to initiate BankID',
    };
  }
}

/**
 * Poll BankID verification status
 */
export async function pollBankIDVerification(
  orderRef: string,
  signerId: string
): Promise<BankIDAuthState> {
  try {
    const response = await fetch('/api/safeprotocol/verify-identity/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderRef, signerId }),
    });

    const data = await response.json();

    if (data.status === 'pending') {
      return {
        status: 'pending',
      };
    }

    if (!response.ok || data.status === 'failed') {
      return {
        status: 'failed',
        error: data.error || 'Verification failed',
      };
    }

    if (data.status === 'complete' && data.verified) {
      return {
        status: 'complete',
        verifiedName: data.signer?.verifiedName,
      };
    }

    return {
      status: 'failed',
      error: 'Unknown verification status',
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Verification polling failed',
    };
  }
}

/**
 * Submit signer consent
 */
export async function submitConsent(
  signerId: string,
  consentTypes: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/safeprotocol/consent/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signerId,
        consentTypes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to record consent',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit consent',
    };
  }
}

/**
 * Get consent templates
 */
export async function getConsentTemplates(): Promise<Record<string, string>> {
  try {
    const response = await fetch('/api/safeprotocol/consent/submit');
    const data = await response.json();
    return data.templates || {};
  } catch (error) {
    console.error('Failed to fetch consent templates:', error);
    return {};
  }
}

/**
 * Check if signer has completed SafeProtocol requirements
 */
export function isSafeProtocolComplete(state: SafeProtocolSigningState): boolean {
  return state.identityVerified && state.consentGiven;
}
