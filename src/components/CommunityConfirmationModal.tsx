import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '@/lib/types';

export function CommunityConfirmationModal({
  profile,
  onComplete
}: {
  profile: Profile;
  onComplete: (isMember: boolean) => void;
}) {
  const [isCommunityMember, setIsCommunityMember] = useState<boolean | null>(null);
  const [isAlly, setIsAlly] = useState(false);
  const [showAllyModal, setShowAllyModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (isCommunityMember === null) return;
    if (isCommunityMember === false && !isAlly) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_community_member: isCommunityMember
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      onComplete(isCommunityMember);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" />
      {showAllyModal ? (
        <div className="card relative z-10 w-full max-w-sm animate-scale-in p-6 shadow-2xl ring-1 ring-gold-hairline border-t border-t-white">
          <h3 className="font-display text-xl font-semibold text-ink-base mb-4">Merveilleux !</h3>
          <p className="text-ink-muted text-sm mb-6">
            En tant qu'allié·e, vous êtes le·la bienvenu·e sur la plateforme. Nous vous demandons simplement d'être particulièrement attentif·ve et respectueux·se des identités et vécus des membres de la communauté.
          </p>
          <button 
            onClick={() => { setShowAllyModal(false); setIsAlly(true); }}
            className="btn-primary w-full bg-patina-deep hover:bg-patina-deep/90 text-white shadow-md border border-patina-deep/50 py-3"
          >
            J'ai compris
          </button>
        </div>
      ) : (
        <div className="card relative z-10 w-full max-w-md animate-scale-in p-6 shadow-2xl ring-1 ring-gold-hairline border-t border-t-white">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-paper-base border border-gold-hairline shadow-sm text-patina-deep">
              <Heart size={22} fill="currentColor" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-ink-base">Appartenance à la communauté</h2>
            <p className="mt-2 text-sm text-ink-muted">Pour mieux comprendre les besoins de nos membres, merci de confirmer votre appartenance.</p>
          </div>
          
          <div className="space-y-4">
            <label className="label">Faites-vous partie de la communauté LGBTQIA+ ?</label>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={() => { setIsCommunityMember(true); setIsAlly(false); }} 
                className={cn("flex-1 py-3 rounded-xl border transition-all font-medium", isCommunityMember === true ? "bg-paper-base border-patina-deep text-patina-deep ring-2 ring-patina-deep/20" : "bg-white/80 border-gold-hairline hover:bg-paper-base")}
              >
                Oui
              </button>
              <button 
                type="button" 
                onClick={() => setIsCommunityMember(false)} 
                className={cn("flex-1 py-3 rounded-xl border transition-all font-medium", isCommunityMember === false ? "bg-paper-base border-patina-deep text-patina-deep ring-2 ring-patina-deep/20" : "bg-white/80 border-gold-hairline hover:bg-paper-base")}
              >
                Non
              </button>
            </div>
            
            {isCommunityMember === false && (
              <div className="mt-4 p-4 rounded-2xl border border-gold-hairline bg-white/60">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAlly} 
                    onChange={(e) => {
                      if (e.target.checked) setShowAllyModal(true);
                      else setIsAlly(false);
                    }} 
                    className="mt-1 h-4 w-4 rounded border-gold-hairline text-patina-deep" 
                  />
                  <span className="text-sm font-medium text-ink-base">Je suis un·e allié·e (Gay Friendly)</span>
                </label>
              </div>
            )}
          </div>
          
          <div className="mt-8">
            <button 
              onClick={submit}
              disabled={loading || isCommunityMember === null || (isCommunityMember === false && !isAlly)}
              className="btn-primary w-full bg-patina-deep hover:bg-patina-deep/90 text-white shadow-md border border-patina-deep/50 py-3 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
