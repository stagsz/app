/**
 * Consent Modal Component
 * Shows eIDAS and GDPR consent before signing
 */

'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { submitConsent } from '@/lib/safeprotocol';

interface ConsentModalProps {
  signerId: string;
  verifiedName: string;
  onConsentGiven: () => void;
  onCancel: () => void;
}

export function ConsentModal({
  signerId,
  verifiedName,
  onConsentGiven,
  onCancel,
}: ConsentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [eidasChecked, setEidasChecked] = useState(false);
  const [gdprChecked, setGdprChecked] = useState(false);

  const handleSubmit = async () => {
    if (!eidasChecked || !gdprChecked) {
      setError('Du måste acceptera både villkoren för eIDAS och GDPR');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await submitConsent(signerId, [
      'eidas_advanced_signature',
      'gdpr_data_processing',
    ]);

    if (!result.success) {
      setError(result.error || 'Failed to record consent');
      setSubmitting(false);
      return;
    }

    onConsentGiven();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0A0B] p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Juridisk överenskommelse</h3>
        </div>

        <p className="text-gray-400 mb-6">
          Innan du kan underteckna detta dokument måste du acceptera följande villkor:
        </p>

        {/* eIDAS Consent */}
        <div className="mb-6 space-y-3">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
            <h4 className="font-medium text-white mb-2">eIDAS Avancerad elektronisk signatur</h4>
            <p className="text-sm text-white/70 mb-3">
              Du är på väg att skapa en juridiskt bindande elektronisk signatur enligt eIDAS-förordningen.
            </p>
            <p className="text-sm text-white/70 mb-4">
              Denna signatur är lika gällande som en handskriven signatur och kan inte enkelt ankäras senare.
              Genom att klicka &quot;Acceptera&quot; bekräftar du att du är den person som identifierades via BankID
              ({verifiedName}) och att du är medveten om innebörden av att signera detta dokument.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={eidasChecked}
                onChange={e => setEidasChecked(e.target.checked)}
                className="h-4 w-4 rounded border border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 cursor-pointer"
              />
              <span className="text-sm text-white">Jag accepterar eIDAS-villkoren</span>
            </label>
          </div>
        </div>

        {/* GDPR Consent */}
        <div className="mb-6 space-y-3">
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <h4 className="font-medium text-white mb-2">GDPR Dataskydd</h4>
            <p className="text-sm text-white/70 mb-3">
              Din identitet har verifierats genom BankID och din personliga identifieringsnummer (personnummer)
              lagras i krypterad form för revisionsändamål enligt lagkrav.
            </p>
            <p className="text-sm text-white/70 mb-4">
              Denna data behandlas enligt GDPR och lagras i högst 7 år för juridisk compliance och möjlig
              tvistlösning. Vi delar aldrig denna information med tredje part utan ditt tillstånd.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gdprChecked}
                onChange={e => setGdprChecked(e.target.checked)}
                className="h-4 w-4 rounded border border-white/20 bg-white/5 checked:bg-green-500 checked:border-green-500 cursor-pointer"
              />
              <span className="text-sm text-white">Jag accepterar GDPR-villkoren</span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg border border-white/10 px-4 py-3 font-medium text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !eidasChecked || !gdprChecked}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-medium text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Behandlar...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Acceptera och fortsätt
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-white/40 text-center mt-4">
          Genom att acceptera bekräftar du att du har läst och förstått samtliga villkor.
        </p>
      </div>
    </div>
  );
}
