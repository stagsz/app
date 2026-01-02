/**
 * BankID Verification Modal Component
 * Handles Swedish electronic identity verification
 */

'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import {
  initiateBankIDVerification,
  pollBankIDVerification,
} from '@/lib/safeprotocol';

interface BankIDVerificationProps {
  signerId: string;
  signerName?: string;
  signerEmail?: string;
  onVerified: (verifiedName: string) => void;
  onCancel: () => void;
}

export function BankIDVerification({
  signerId,
  signerName,
  signerEmail,
  onVerified,
  onCancel,
}: BankIDVerificationProps) {
  const [status, setStatus] = useState<'idle' | 'initiating' | 'waiting' | 'complete' | 'failed'>(
    'idle'
  );
  const [orderRef, setOrderRef] = useState<string>('');
  const [autoStartToken, setAutoStartToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [verifiedName, setVerifiedName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const maxPollAttempts = 30; // ~5 minutes of polling (10 second intervals)

  // Copy reference number to clipboard
  const handleCopyReference = async () => {
    await navigator.clipboard.writeText(orderRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Start BankID verification
  const handleStartVerification = async () => {
    setStatus('initiating');
    setError('');

    const result = await initiateBankIDVerification(signerId);

    if (result.status === 'failed') {
      setError(result.error || 'Failed to initiate BankID verification');
      setStatus('failed');
      return;
    }

    setOrderRef(result.orderRef || '');
    setAutoStartToken(result.autoStartToken || '');
    setStatus('waiting');
    setPollCount(0);
  };

  // Poll BankID status
  useEffect(() => {
    if (status !== 'waiting' || !orderRef) return;

    const interval = setInterval(async () => {
      setPollCount(prev => prev + 1);

      const result = await pollBankIDVerification(orderRef, signerId);

      if (result.status === 'complete') {
        setVerifiedName(result.verifiedName || 'User');
        setStatus('complete');
        onVerified(result.verifiedName || 'User');
      } else if (result.status === 'failed') {
        setError(result.error || 'BankID verification failed');
        setStatus('failed');
      } else if (pollCount >= maxPollAttempts) {
        setError('BankID verification timed out. Please try again.');
        setStatus('failed');
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [status, orderRef, signerId, pollCount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0A0B] p-6 shadow-xl mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">BankID-verifiering</h3>
        </div>

        <p className="text-gray-400 mb-6">
          För att underteckna detta dokument juridiskt bindande måste din identitet verifieras genom
          BankID.
        </p>

        {status === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="text-sm text-blue-300">
                <strong>Du verifieras som:</strong>
                <br />
                {signerName || signerEmail || 'Unknown'}
              </p>
            </div>

            <button
              onClick={handleStartVerification}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-medium text-white hover:opacity-90 transition"
            >
              Start BankID-verifiering
            </button>

            <button
              onClick={onCancel}
              className="w-full rounded-lg border border-white/10 px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Avbryt
            </button>
          </div>
        )}

        {status === 'initiating' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-center text-white/60">Initierar BankID...</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="text-sm text-white mb-3">
                <strong>1. Öppna BankID-appen på din enhet</strong>
              </p>
              <p className="text-sm text-white/70">
                BankID bör öppnas automatiskt. Om det inte gör det, kan du ange följande referensnummer
                manuellt:
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded bg-black/30 px-3 py-2 text-sm font-mono text-blue-300 break-all">
                  {orderRef}
                </code>
                <button
                  onClick={handleCopyReference}
                  className="p-2 hover:bg-white/10 rounded transition"
                  title="Kopiera referensnummer"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-white/60" />
                  )}
                </button>
              </div>

              <p className="text-sm text-white mt-4">
                <strong>2. Bekräfta verifieringen i BankID-appen</strong>
              </p>
              <p className="text-sm text-white/70 mt-2">
                Vi väntar på att du bekräftar verifieringen i din BankID-app...
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <p className="text-sm text-white/60">Väntar på BankID-bekräftelse...</p>
            </div>

            <button
              onClick={() => {
                setStatus('idle');
                setOrderRef('');
                setError('');
              }}
              className="w-full rounded-lg border border-white/10 px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Avbryt
            </button>
          </div>
        )}

        {status === 'complete' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <p className="text-center text-white">
                <strong>Identitet verifierad!</strong>
                <br />
                <span className="text-sm text-white/70 mt-1 block">{verifiedName}</span>
              </p>
            </div>

            <p className="text-sm text-white/60 text-center">
              Du kan nu fortsätta att underteckna dokumentet.
            </p>

            <button
              onClick={() => setStatus('idle')}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 font-medium text-white hover:opacity-90 transition"
            >
              <CheckCircle className="h-5 w-5" />
              Fortsätt
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">Verifiering misslyckades</p>
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartVerification}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-medium text-white hover:opacity-90 transition"
            >
              Försök igen
            </button>

            <button
              onClick={onCancel}
              className="w-full rounded-lg border border-white/10 px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
