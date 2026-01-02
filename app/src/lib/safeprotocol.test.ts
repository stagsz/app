/**
 * SafeProtocol API Tests
 * Test suite for SafeProtocol high-level functions
 */

import {
  isSafeProtocolComplete,
  type SafeProtocolSigningState,
} from './safeprotocol';

describe('SafeProtocol', () => {
  describe('isSafeProtocolComplete', () => {
    it('should return false when identity not verified', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: false,
        consentGiven: true,
        bankidState: { status: 'complete' },
      };

      expect(isSafeProtocolComplete(state)).toBe(false);
    });

    it('should return false when consent not given', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: true,
        consentGiven: false,
        bankidState: { status: 'complete' },
      };

      expect(isSafeProtocolComplete(state)).toBe(false);
    });

    it('should return false when neither requirement met', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: false,
        consentGiven: false,
        bankidState: { status: 'pending' },
      };

      expect(isSafeProtocolComplete(state)).toBe(false);
    });

    it('should return true when both requirements met', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: true,
        consentGiven: true,
        bankidState: { status: 'complete' },
      };

      expect(isSafeProtocolComplete(state)).toBe(true);
    });
  });

  describe('BankID Auth State', () => {
    it('should track pending status', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: false,
        consentGiven: false,
        bankidState: {
          status: 'pending',
        },
      };

      expect(state.bankidState.status).toBe('pending');
      expect(isSafeProtocolComplete(state)).toBe(false);
    });

    it('should track authenticating status', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: false,
        consentGiven: false,
        bankidState: {
          status: 'authenticating',
          orderRef: 'test-order-ref',
          autoStartToken: 'test-token',
        },
      };

      expect(state.bankidState.status).toBe('authenticating');
      expect(state.bankidState.orderRef).toBe('test-order-ref');
    });

    it('should store verified name', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: true,
        consentGiven: false,
        bankidState: {
          status: 'complete',
          verifiedName: 'John Doe',
        },
      };

      expect(state.bankidState.verifiedName).toBe('John Doe');
    });

    it('should handle errors', () => {
      const state: SafeProtocolSigningState = {
        identityVerified: false,
        consentGiven: false,
        bankidState: {
          status: 'failed',
          error: 'User cancelled authentication',
        },
      };

      expect(state.bankidState.status).toBe('failed');
      expect(state.bankidState.error).toBeDefined();
    });
  });
});
