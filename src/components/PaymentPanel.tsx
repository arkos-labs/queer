import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CreditCard, Hourglass, ShieldCheck } from 'lucide-react';
import { supabase, edgeFunctionErrorMessage, invokeEdgeFunction } from '@/lib/supabase';
import { useRealtimeRevision } from '@/lib/realtime';
import { useAuth } from '@/lib/auth';
import { PayoutReminderModal } from '@/components/PayoutReminderModal';
import { formatCents, PLATFORM_FEE_RATE, type Payment } from '@/lib/payments';
import { CardPaymentModal } from '@/components/CardPaymentModal';
import type { Connection } from '@/lib/types';

interface Props {
  connection: Connection;
  meId: string;
  otherName: string;
  /** Accepter la mission (passe la connexion en « acceptée »). */
  onAccept: () => Promise<void>;
}

/**
 * Prix, acceptation et paiement d'une prestation, branchés sur les Edge Functions
 * existantes : stripe-request-payment → stripe-create-payment
 * → stripe-manage-payment (capture à la fin de la prestation / annulation).
 */
export function PaymentPanel({ connection, meId, otherName, onAccept }: Props) {
  const { profile } = useAuth();
  const revision = useRealtimeRevision('payments', 'connections');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<'idle' | 'propose'>('idle');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  // Rôle choisi pour une nouvelle demande : le prestataire reçoit, le client paie.
  const [proposeRole, setProposeRole] = useState<'payer' | 'payee' | null>(null);

  // Qui paie et qui reçoit vient du paiement en cours ; avant, du choix fait ci-dessous
  // (et non de qui a écrit en premier dans la conversation).
  const hasPayment = !!payment && ['pending', 'authorized', 'captured'].includes(payment.status);
  const iAmPayer = hasPayment ? payment!.payer_id === meId : proposeRole === 'payer';

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPayment((data ?? null) as Payment | null);
    setLoaded(true);
  }, [connection.id]);

  useEffect(() => { load(); }, [load, revision, connection.status]);

  // Filet de sécurité : si la carte a été saisie mais que le webhook Stripe est en retard (ou rejeté),
  // on relit l'état du paiement directement chez Stripe, tant qu'il est « non finalisé ».
  const syncFromStripe = useCallback(async () => {
    const { data } = await invokeEdgeFunction<{ synced?: boolean }>('stripe-sync-payment', { connection_id: connection.id });
    if (data?.synced) await load();
  }, [connection.id, load]);

  const waitingForStripe = !!payment && payment.status === 'pending' && !!payment.stripe_payment_intent_id;
  useEffect(() => {
    if (!waitingForStripe) return;
    void syncFromStripe();
    const timer = window.setInterval(() => { void syncFromStripe(); }, 8000);
    return () => window.clearInterval(timer);
  }, [waitingForStripe, syncFromStripe]);

  const call = async (name: string, body: Record<string, unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    const { data, error: fnError } = await invokeEdgeFunction<Record<string, unknown>>(name, body);
    setBusy(false);
    if (fnError) {
      setError(await edgeFunctionErrorMessage(fnError, fallback));
      return null;
    }
    return data ?? {};
  };

  const cents = Math.round(Number(amount.replace(',', '.')) * 100);
  const amountValid = Number.isFinite(cents) && cents >= 100 && cents <= 500000;

  const submitPrice = async () => {
    if (!amountValid) return;
    const res =
      await call('stripe-request-payment', { connection_id: connection.id, amount: cents, description: description.trim() || undefined, role: iAmPayer ? 'payer' : 'payee' }, 'Impossible d’envoyer la demande de prix.');
    if (!res) return;
    setMode('idle');
    setProposeRole(null);
    setAmount('');
    setDescription('');
    await load();
  };

  const startCardPayment = async () => {
    const res = await call('stripe-create-payment', { connection_id: connection.id }, 'Impossible de lancer le paiement.');
    if (res?.client_secret) setClientSecret(res.client_secret as string);
  };

  const manage = async (action: 'capture' | 'cancel') => {
    if (action === 'capture' && !window.confirm('Confirmer que la prestation est terminée ? Votre carte sera débitée et le prestataire payé.')) return;
    if (action === 'cancel' && !window.confirm('Annuler ce paiement ?')) return;
    const res = await call('stripe-manage-payment', { connection_id: connection.id, action }, 'Action impossible.');
    if (res) await load();
  };

  if (!loaded) return null;

  const active = payment && (payment.status === 'pending' || payment.status === 'authorized');
  const myTurn = !!payment && payment.proposed_by !== meId;
  // Le client paie exactement le prix affiché ; les frais sont retenus sur la part du prestataire.
  const total = payment ? payment.amount : 0;
  const netForPayee = payment ? payment.amount - payment.platform_fee_amount : 0;

  const priceForm = (
    <div className="space-y-2">
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="input"
        placeholder="Prix de la prestation en € (ex. 45)"
        aria-label="Prix en euros"
      />
      {amountValid && (
        <p className="text-xs font-medium text-ink-base">
          Montant : {formatCents(cents)}{cents >= 50000 ? ' (montant élevé, vérifiez)' : ''}
        </p>
      )}
      {amountValid && !iAmPayer && (
        <p className="text-xs text-ink-muted">
          Frais de service ({(PLATFORM_FEE_RATE * 100).toFixed(1).replace('.', ',')} %) : {formatCents(Math.round(cents * PLATFORM_FEE_RATE))}. Vous recevrez {formatCents(cents - Math.round(cents * PLATFORM_FEE_RATE))}.
        </p>
      )}
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="input"
        placeholder="Description (facultatif)"
        aria-label="Description de la prestation"
        maxLength={200}
      />
      <div className="flex gap-2">
        <button onClick={submitPrice} disabled={!amountValid || busy} className="btn-primary btn-sm">{busy ? 'Envoi…' : iAmPayer ? 'Envoyer le prix' : 'Envoyer la demande de paiement'}</button>
        <button onClick={() => { setMode('idle'); setProposeRole(null); }} className="btn-ghost btn-sm">Annuler</button>
      </div>
    </div>
  );

  return (
    <div className="border-t border-gold-hairline bg-white/60 px-4 py-3 text-sm">
      {clientSecret && (
        <CardPaymentModal
          clientSecret={clientSecret}
          totalLabel={formatCents(total)}
          onClose={() => setClientSecret(null)}
          onPaid={() => {
            setClientSecret(null);
            load();
            void syncFromStripe();
            window.setTimeout(() => { void syncFromStripe(); }, 2500);
          }}
        />
      )}

      {payment?.status === 'captured' && (
        <p className="flex items-center gap-1.5 font-medium text-success-700"><BadgeCheck size={16} /> {iAmPayer ? `Payé : ${formatCents(payment.amount)} versés à ${otherName}.` : `Payé : vous recevez ${formatCents(payment.amount - payment.platform_fee_amount)} (après frais de service).`}</p>
      )}

      {active && payment!.status === 'authorized' && (
        iAmPayer ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 font-medium text-primary-700"><ShieldCheck size={16} /> Carte réservée : {formatCents(total)}. Débit à la fin de la prestation.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => manage('capture')} disabled={busy} className="btn-primary btn-sm"><BadgeCheck size={14} /> Prestation terminée, payer</button>
              <button onClick={() => manage('cancel')} disabled={busy} className="btn-ghost btn-sm text-error-600">Annuler</button>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 font-medium text-primary-700"><ShieldCheck size={16} /> {formatCents(netForPayee)} sécurisés (après frais de service). Vous serez payé·e quand {otherName} confirmera la fin de la prestation.</p>
        )
      )}

      {active && payment!.status === 'pending' && !payment!.stripe_payment_intent_id && (
        (
          <div className="space-y-2">
            <p className="font-medium text-ink-base">
              {myTurn ? `${otherName} propose` : 'Vous proposez'} <strong>{formatCents(payment!.amount)}</strong>
              {payment!.description ? ` — ${payment!.description}` : ''}
            </p>
            {payment!.platform_fee_amount > 0 && !iAmPayer && (
              <p className="text-xs text-ink-muted">Frais de service : {formatCents(payment!.platform_fee_amount)}. Vous recevrez {formatCents(netForPayee)}.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {connection.status === 'accepted' && iAmPayer && (
                <button onClick={startCardPayment} disabled={busy} className="btn-primary btn-sm"><CreditCard size={14} /> Payer {formatCents(total)}</button>
              )}
              {connection.status !== 'accepted' && myTurn && (
                <button onClick={onAccept} disabled={busy} className="btn-primary btn-sm">Accepter ce prix</button>
              )}
              {connection.status !== 'accepted' && !myTurn && (
                <span className="flex items-center gap-1 text-xs text-ink-muted"><Hourglass size={13} /> En attente de la réponse de {otherName}…</span>
              )}
              <button onClick={() => manage('cancel')} disabled={busy} className="btn-ghost btn-sm text-error-600">{myTurn ? 'Refuser' : 'Retirer'}</button>
            </div>
          </div>
        )
      )}

      {active && payment!.status === 'pending' && payment!.stripe_payment_intent_id && (
        <div className="space-y-2">
          <p className="text-ink-muted">Paiement non finalisé.</p>
          <button onClick={() => manage('cancel')} disabled={busy} className="btn-ghost btn-sm text-error-600">Annuler et recommencer</button>
        </div>
      )}

      {!active && payment?.status !== 'captured' && (
mode === 'propose' ? priceForm : (
          <div className="space-y-2">
            <p className="text-xs text-ink-muted">Qui êtes-vous dans cette prestation ?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => {
                  if (!profile?.stripe_charges_enabled) { setVerifyOpen(true); return; }
                  setProposeRole('payee');
                  setMode('propose');
                }}
                className="btn-primary btn-sm justify-center"
              >
                <CreditCard size={14} /> Je suis le prestataire : demander le paiement
              </button>
              <button
                onClick={() => { setProposeRole('payer'); setMode('propose'); }}
                className="btn-outline btn-sm justify-center"
              >
                Je suis le client : payer {otherName}
              </button>
            </div>
            {!profile?.stripe_charges_enabled && (
              <p className="text-[11px] text-ink-muted">
                Pour être payé·e, vous devez d'abord vérifier votre compte (identité et compte bancaire). Le client, lui, n'a rien à vérifier.
              </p>
            )}
          </div>
        )
      )}

      {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
      {verifyOpen && <PayoutReminderModal onClose={() => setVerifyOpen(false)} />}
    </div>
  );
}
