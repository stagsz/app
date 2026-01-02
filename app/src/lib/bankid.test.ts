/**
 * BankID Integration Tests
 * Test suite for Swedish electronic ID verification
 */

import {
  extractAndValidatePersonalNumber,
  hashPersonalNumber,
  formatBankIDErrorMessage,
  isBankIDError,
} from './bankid';

describe('BankID Integration', () => {
  describe('hashPersonalNumber', () => {
    it('should hash a personal number', () => {
      const number = '197603021234';
      const hash = hashPersonalNumber(number);

      // Should return SHA-256 hash (64 hex characters)
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should produce consistent hashes', () => {
      const number = '197603021234';
      const hash1 = hashPersonalNumber(number);
      const hash2 = hashPersonalNumber(number);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different numbers', () => {
      const hash1 = hashPersonalNumber('197603021234');
      const hash2 = hashPersonalNumber('197603021235');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('extractAndValidatePersonalNumber', () => {
    it('should validate a correct 12-digit personal number', () => {
      const result = extractAndValidatePersonalNumber('197603021234');

      expect(result.valid).toBe(true);
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.error).toBeUndefined();
    });

    it('should validate multiple correct numbers', () => {
      const result = extractAndValidatePersonalNumber('197603021234');

      expect(result.valid).toBe(true);
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should accept numbers with hyphens', () => {
      const result = extractAndValidatePersonalNumber('1976-03-02-1234');

      // Should strip hyphens and validate
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reject invalid format', () => {
      const result = extractAndValidatePersonalNumber('invalid');

      expect(result.valid).toBe(false);
      expect(result.hash).toBe('');
      expect(result.error).toBeDefined();
    });

    it('should reject wrong length', () => {
      const result = extractAndValidatePersonalNumber('12345');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Invalid Swedish personal number format/);
    });

    it('should reject numbers with invalid checksum', () => {
      // Using an invalid checksum
      const result = extractAndValidatePersonalNumber('197603029999');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/checksum/i);
    });
  });

  describe('isBankIDError', () => {
    it('should identify BankID errors', () => {
      const error = {
        errorCode: 'INVALID_PARAMETERS',
        details: 'Invalid parameters',
      };

      expect(isBankIDError(error)).toBe(true);
    });

    it('should reject non-error objects', () => {
      const response = {
        status: 'complete',
        orderRef: 'abc123',
      };

      expect(isBankIDError(response)).toBe(false);
    });
  });

  describe('formatBankIDErrorMessage', () => {
    it('should format INVALID_PARAMETERS error', () => {
      const error = {
        errorCode: 'INVALID_PARAMETERS',
        details: 'Bad params',
      };

      const message = formatBankIDErrorMessage(error);
      expect(message).toBe('Invalid authentication parameters');
    });

    it('should format USER_CANCEL error', () => {
      const error = {
        errorCode: 'USER_CANCEL',
        details: 'User cancelled',
      };

      const message = formatBankIDErrorMessage(error);
      expect(message).toBe('You cancelled the authentication');
    });

    it('should fall back to details for unknown errors', () => {
      const error = {
        errorCode: 'UNKNOWN_ERROR',
        details: 'Something went wrong',
      };

      const message = formatBankIDErrorMessage(error);
      expect(message).toBe('Something went wrong');
    });

    it('should handle empty details', () => {
      const error = {
        errorCode: 'GENERAL_ERROR',
        details: '',
      };

      const message = formatBankIDErrorMessage(error);
      expect(message).toBe('BankID service error');
    });
  });
});
