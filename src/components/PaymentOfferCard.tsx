import { useState } from 'react';
import type { Connection, Payment } from '@/lib/types';
import { PriceInput } from '@/components/PriceInput';
import { CreditCard, Handshake, Clock, CheckCircle2, XCircle, AlertTriangle, Calendar } from 'lucide-react';

const formatEuros = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const formatScheduled = (iso: string) => {
  const d = new Date(iso);
  const hour = d.getHours();
  const slot = hour < 12 ? 'matin' : hour < 18 ? 'après-midi' : 'soir';
  return `${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} (${slot})`;
};

// A price offer rendered inline in the conversation, Vinted-style: shows
// the current proposed price and, depending on who's turn it is and
// where the deal stands, lets you accept it, counter with a different
// price, or pay. Deliberately a single evolving card (not one bubble per
// offer) — proposed_by tracks whose turn it is to respond.
export function PaymentOfferCard({
  payment,
  connectionStatus,
  currentUserId,
  otherName,
  isPayer,
  statusLoading,
  payNowLoading,
  onAccept,
  onRefuse,
  onPayNow,
  onCompleteAndPay,
  onCounter,
  onCancelPayment,
  cancelLoading,
}: {
  payment: Payment;
  connectionStatus: Connection['status'];
  currentUserId: string;
  otherName: string;
  isPayer: boolean;
  statusLoading: boolean;
  payNowLoading: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onPayNow: () => void;
  onCompleteAndPay: () => void;
  onCounter: (amountCents: number) => Promise<string | null>;
  onCancelPayment: () => void;
  cancelLoading: boolean;
}) {
  const [countering, setCountering] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);

  const isProposer = payment.proposed_by === currentUserId;
  const noPI = !payment.stripe_payment_intent_id;

  const submitCounter = async () => {
    const val = Number(counterPrice.replace(',', '.'));
    if (!Number.isFinite(val) || val < 1) {
      setCounterError('Indiquez un prix valide.');
      return;
    }
    setCounterLoading(true);
    setCounterError(null);
    const err = await onCounter(Math.round(val * 100));
    setCounterLoading(false);
    if (err) {
      setCounterError(err);
      return;
    }
    setCountering(false);
    setCounterPrice('');
  };

  return (
    <div className="flex justify-center py-1">
      <div className="w-full max-w-sm rounded-2xl border border-primary-100 bg-primary-50/60 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary-600">
          <Handshake size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Proposition de prix</span>
        </div>

        <p className="mt-2 text-2xl font-bold text-neutral-900">{formatEuros(payment.amount)}</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          + {formatEuros(payment.platform_fee_amount)} de frais de service à la charge du client, soit{' '}
          <span className="font-medium text-neutral-900">
            {formatEuros(payment.amount + payment.platform_fee_amount)} au total
          </span>
        </p>
        {payment.description && <p className="mt-1.5 text-sm text-neutral-500">{payment.description}</p>}
        {payment.scheduled_at && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
            <Calendar size={13} /> {formatScheduled(payment.scheduled_at)}
          </p>
        )}

        {/* Negotiation: mission not yet accepted */}
        {connectionStatus === 'pending' && payment.status === 'pending' && noPI && (
          isProposer ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <Clock size={13} /> En attente de la réponse de {otherName}
            </p>
          ) : countering ? (
            <div className="mt-3 space-y-2">
              <label htmlFor="counter-price" className="sr-only">Nouveau prix</label>
              <PriceInput id="counter-price" value={counterPrice} onChange={setCounterPrice} placeholder="Nouveau prix" autoFocus />
              {counterError && (
                <p className="flex items-start gap-1.5 text-xs text-error-700">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {counterError}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setCountering(false)} className="btn-ghost btn-sm">Annuler</button>
                <button onClick={submitCounter} disabled={counterLoading} className="btn-primary btn-sm">
                  {counterLoading ? 'Envoi…' : 'Envoyer la contre-offre'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={onAccept} disabled={statusLoading} className="btn-primary btn-sm">
                <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Accepter ce prix'}
              </button>
              <button onClick={() => setCountering(true)} className="btn-outline btn-sm">
                Proposer un autre prix
              </button>
              <button onClick={onRefuse} disabled={cancelLoading} className="btn-ghost btn-sm text-neutral-500 hover:text-error-700 hover:bg-error-50">
                <XCircle size={14} /> {cancelLoading ? 'Traitement…' : 'Refuser'}
              </button>
            </div>
          )
        )}

        {/* Mission accepted, price agreed, not yet paid */}
        {connectionStatus === 'accepted' && payment.status === 'pending' && noPI && (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success-700">
              <CheckCircle2 size={13} /> Proposition de prix acceptée — en attente de paiement
            </p>
            {isPayer ? (
              <button onClick={onPayNow} disabled={payNowLoading} className="mt-2 btn-primary btn-sm">
                <CreditCard size={14} /> {payNowLoading ? 'Préparation…' : 'Payer maintenant'}
              </button>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <Clock size={13} /> En attente que le client règle le paiement
              </p>
            )}
          </div>
        )}

        {payment.status === 'pending' && !noPI && (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <Clock size={13} /> Paiement en cours de confirmation…
            </p>
            {isPayer && (
              <button onClick={onCancelPayment} disabled={cancelLoading} className="mt-2 text-xs font-medium text-neutral-400 underline hover:text-neutral-500">
                {cancelLoading ? 'Annulation…' : "La saisie de carte a échoué ou a été abandonnée ? Annuler cette demande"}
              </button>
            )}
          </div>
        )}

        {payment.status === 'authorized' && (
          isPayer ? (
            <button onClick={onCompleteAndPay} disabled={statusLoading} className="mt-3 btn-primary btn-sm">
              <CheckCircle2 size={14} /> {statusLoading ? 'Traitement…' : 'Confirmer la fin & payer'}
            </button>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <Clock size={13} /> Carte autorisée — en attente que le client confirme la fin de la prestation
            </p>
          )
        )}

        {payment.status === 'captured' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-success-700">
            <CheckCircle2 size={13} /> Payé
          </p>
        )}
        {payment.status === 'canceled' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
            <XCircle size={13} /> Paiement annulé
          </p>
        )}
        {payment.status === 'failed' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-error-700">
            <AlertTriangle size={13} /> Paiement échoué
          </p>
        )}
        {payment.status === 'refunded' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
            <XCircle size={13} /> Remboursé
          </p>
        )}
      </div>
    </div>
  );
}
