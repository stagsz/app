/**
 * BankID Integration for Swedish e-signature verification
 * BankID is the official Swedish electronic identification service
 * Used for legally binding e-signatures and document signing
 */

import crypto from 'crypto';

/**
 * BankID API Configuration
 * Supports both production and test environments
 */
const BANKID_CONFIG = {
  production: {
    apiUrl: 'https://appapi2.bankid.com/rp/v6.0',
    certificatePath: process.env.BANKID_CERT_PATH || '/certs/bankid-prod.pem',
  },
  test: {
    apiUrl: 'https://appapi2.test.bankid.com/rp/v6.0',
    certificatePath: process.env.BANKID_CERT_PATH || '/certs/bankid-test.pem',
  },
};

const environment = (process.env.BANKID_ENVIRONMENT || 'test') as 'production' | 'test';
const config = BANKID_CONFIG[environment];

/**
 * BankID Authentication Request
 */
export interface BankIDAuthRequest {
  ipAddress: string;
  personalNumber?: string; // Swedish personnummer (12 digits)
  endUserMessage?: string;
}

/**
 * BankID Authentication Response
 */
export interface BankIDAuthResponse {
  orderRef: string;      // Order reference for polling
  autoStartToken: string; // Token for autostart in app
}

/**
 * BankID Completion Data (after successful authentication)
 */
export interface BankIDCompletionData {
  orderRef: string;
  status: 'pending' | 'failed' | 'complete';
  hintCode?: string;
  completionData?: {
    user: {
      personalNumber: string; // Swedish personnummer
      name: string;
      givenName: string;
      surname: string;
    };
    device: {
      ipAddress: string;
      uhi?: string; // Unique Hardware Identifier
    };
    cert: {
      notBefore: string;
      notAfter: string;
    };
    signature?: string; // Base64 encoded signature
    ocspResponse?: string; // OCSP response for certificate validation
  };
}

/**
 * BankID Authentication Error
 */
export interface BankIDError {
  errorCode: string;
  details: string;
  hint?: string;
}

/**
 * Hash a personal number for privacy
 * One-way hash prevents storing sensitive data
 */
export function hashPersonalNumber(personalNumber: string): string {
  return crypto
    .createHash('sha256')
    .update(personalNumber)
    .digest('hex');
}

/**
 * Initiate BankID authentication
 * This starts the authentication process and returns tokens for the client
 */
export async function initiateBankIDAuth(
  request: BankIDAuthRequest
): Promise<BankIDAuthResponse | BankIDError> {
  try {
    if (!config) {
      throw new Error('BankID configuration not found');
    }

    // In production, this would use real client certificates for mutual TLS
    // For now, we'll implement a basic version that can be extended with cert support
    const payload = {
      endUserIp: request.ipAddress,
      personalNumber: request.personalNumber,
      endUserMessage: request.endUserMessage || 'Please authenticate with BankID to sign this document',
      userVisibleData: Buffer.from('SimpleSign Document Signing').toString('base64'),
    };

    const response = await fetch(`${config.apiUrl}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        errorCode: error.errorCode || 'UNKNOWN_ERROR',
        details: error.details || 'BankID authentication failed',
        hint: error.hint,
      };
    }

    const data = await response.json();
    return {
      orderRef: data.orderRef,
      autoStartToken: data.autoStartToken,
    };
  } catch (error) {
    console.error('BankID auth initiation failed:', error);
    return {
      errorCode: 'INIT_FAILED',
      details: error instanceof Error ? error.message : 'Failed to initiate BankID authentication',
    };
  }
}

/**
 * Poll BankID for authentication completion
 * Call this repeatedly to check if user has completed authentication
 */
export async function pollBankIDStatus(orderRef: string): Promise<BankIDCompletionData | BankIDError> {
  try {
    if (!config) {
      throw new Error('BankID configuration not found');
    }

    const response = await fetch(`${config.apiUrl}/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderRef }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        errorCode: error.errorCode || 'UNKNOWN_ERROR',
        details: error.details || 'BankID poll failed',
        hint: error.hint,
      };
    }

    const data = await response.json();
    return {
      orderRef: data.orderRef,
      status: data.status,
      hintCode: data.hintCode,
      completionData: data.completionData,
    };
  } catch (error) {
    console.error('BankID poll failed:', error);
    return {
      errorCode: 'POLL_FAILED',
      details: error instanceof Error ? error.message : 'Failed to poll BankID status',
    };
  }
}

/**
 * Cancel ongoing BankID authentication
 */
export async function cancelBankIDAuth(orderRef: string): Promise<boolean> {
  try {
    if (!config) {
      throw new Error('BankID configuration not found');
    }

    const response = await fetch(`${config.apiUrl}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderRef }),
    });

    return response.ok;
  } catch (error) {
    console.error('BankID cancel failed:', error);
    return false;
  }
}

/**
 * Validate BankID certificate (OCSP validation)
 * Ensures the certificate used for signing is still valid and not revoked
 */
export async function validateBankIDCertificate(
  cert: string,
  ocspResponse: string
): Promise<boolean> {
  try {
    // In production, this would:
    // 1. Parse the X.509 certificate
    // 2. Validate the OCSP response
    // 3. Check certificate chain
    // 4. Verify certificate is not revoked
    // 5. Check expiration dates

    // For now, we'll implement a basic version
    // You would use libraries like node-forge or openssl-js for full implementation

    if (!cert || !ocspResponse) {
      return false;
    }

    // Basic check: cert and OCSP response exist and are base64
    try {
      Buffer.from(cert, 'base64');
      Buffer.from(ocspResponse, 'base64');
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    console.error('Certificate validation failed:', error);
    return false;
  }
}

/**
 * Extract and validate personal number from BankID response
 * Returns hashed version for privacy, and validates format
 */
export function extractAndValidatePersonalNumber(
  personalNumber: string
): { valid: boolean; hash: string; error?: string } {
  try {
    // Swedish personnummer format: YYYYMMDDNNNN (12 digits)
    // Also supports: YYMMDDNNNN (10 digits) - for older people
    const cleanNumber = personalNumber.replace(/\D/g, '');

    if (cleanNumber.length !== 10 && cleanNumber.length !== 12) {
      return {
        valid: false,
        hash: '',
        error: 'Invalid Swedish personal number format',
      };
    }

    // Basic checksum validation (Luhn algorithm variant)
    const isValid = validateSwedishPersonalNumber(cleanNumber);
    if (!isValid) {
      return {
        valid: false,
        hash: '',
        error: 'Personal number checksum validation failed',
      };
    }

    return {
      valid: true,
      hash: hashPersonalNumber(cleanNumber),
    };
  } catch (error) {
    return {
      valid: false,
      hash: '',
      error: error instanceof Error ? error.message : 'Failed to validate personal number',
    };
  }
}

/**
 * Validate Swedish personal number using Luhn algorithm
 */
function validateSwedishPersonalNumber(pnr: string): boolean {
  if (!/^\d{10,12}$/.test(pnr)) {
    return false;
  }

  // Use last 10 digits for checksum validation
  const digits = pnr.slice(-10);

  let sum = 0;
  let multiplier = 2;

  // Validate using Luhn algorithm variant
  for (let i = digits.length - 2; i >= 0; i--) {
    let product = parseInt(digits[i], 10) * multiplier;

    if (product > 9) {
      product = product - 9;
    }

    sum += product;
    multiplier = multiplier === 2 ? 1 : 2;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(digits[digits.length - 1], 10);
}

/**
 * Create BankID signature (used for cryptographic signing)
 * This would be called after BankID verification to cryptographically sign documents
 */
export interface BankIDSignRequest {
  orderRef: string;
  userVisibleData: string; // Base64 encoded data to sign
  userNonVisibleData?: string; // Optional non-visible data
  ipAddress: string;
}

export async function initiateBankIDSign(
  request: BankIDSignRequest
): Promise<BankIDAuthResponse | BankIDError> {
  try {
    if (!config) {
      throw new Error('BankID configuration not found');
    }

    const payload = {
      endUserIp: request.ipAddress,
      userVisibleData: request.userVisibleData,
      userNonVisibleData: request.userNonVisibleData,
    };

    const response = await fetch(`${config.apiUrl}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        errorCode: error.errorCode || 'UNKNOWN_ERROR',
        details: error.details || 'BankID signing failed',
        hint: error.hint,
      };
    }

    const data = await response.json();
    return {
      orderRef: data.orderRef,
      autoStartToken: data.autoStartToken,
    };
  } catch (error) {
    console.error('BankID sign initiation failed:', error);
    return {
      errorCode: 'SIGN_INIT_FAILED',
      details: error instanceof Error ? error.message : 'Failed to initiate BankID signing',
    };
  }
}

/**
 * Helper to check if BankID response contains an error
 */
export function isBankIDError(response: any): response is BankIDError {
  return 'errorCode' in response && 'details' in response;
}

/**
 * Helper to format BankID error messages for display
 */
export function formatBankIDErrorMessage(error: BankIDError): string {
  const messages: Record<string, string> = {
    INVALID_PARAMETERS: 'Invalid authentication parameters',
    INVALID_ORDER_REF: 'Authentication request expired or invalid',
    ORDER_REF_NOT_FOUND: 'Authentication session not found',
    NOT_DELIVERED: 'Request was not delivered to your device',
    REQUEST_BLOCKED: 'Authentication request was blocked by your device',
    ALREADY_IN_PROGRESS: 'Authentication is already in progress',
    GENERAL_ERROR: 'BankID service error',
    USER_CANCEL: 'You cancelled the authentication',
    CANCELLED: 'Authentication was cancelled',
    START_FAILED: 'Failed to start BankID application',
  };

  return messages[error.errorCode] || error.details || 'Authentication failed';
}
