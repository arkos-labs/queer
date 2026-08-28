import { useState } from 'react';
import { Smartphone, Share, PlusSquare, MoreVertical, Download, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type OS = 'android' | 'ios';

interface Step {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const stepsAndroid: Step[] = [
  {
    icon: <Smartphone size={20} className="text-emerald-500" />,
    title: 'Ouvre Chrome sur ton Android',
    desc: 'Assure-toi d\'utiliser Google Chrome (navigateur par défaut sur Android).',
  },
  {
    icon: <MoreVertical size={20} className="text-emerald-500" />,
    title: 'Appuie sur les 3 points ⋮ en haut à droite',
    desc: 'C\'est le menu principal de Chrome, en haut à droite de l\'écran.',
  },
  {
    icon: <Download size={20} className="text-emerald-500" />,
    title: 'Sélectionne "Ajouter à l\'écran d\'accueil"',
    desc: 'Cette option apparaît dans le menu déroulant. Appuie dessus.',
  },
  {
    icon: <CheckCircle2 size={20} className="text-emerald-500" />,
    title: 'Confirme en appuyant sur "Ajouter"',
    desc: 'Une icône Queer Service apparaît sur ton écran d\'accueil. C\'est bon !',
  },
];

const stepsIOS: Step[] = [
  {
    icon: <Smartphone size={20} className="text-emerald-500" />,
    title: 'Ouvre Safari sur ton iPhone ou iPad',
    desc: 'Important : ça doit être Safari, pas Chrome ni Firefox, pour que ça fonctionne.',
  },
  {
    icon: <Share size={20} className="text-emerald-500" />,
    title: 'Appuie sur l\'icône Partager ⎙ en bas',
    desc: 'C\'est le carré avec une flèche vers le haut, dans la barre du bas de Safari.',
  },
  {
    icon: <PlusSquare size={20} className="text-emerald-500" />,
    title: 'Choisis "Sur l\'écran d\'accueil"',
    desc: 'Fais défiler le menu vers le bas pour trouver cette option, puis appuie.',
  },
  {
    icon: <CheckCircle2 size={20} className="text-emerald-500" />,
    title: 'Appuie sur "Ajouter" en haut à droite',
    desc: 'L\'icône Queer Service s\'installe sur ton écran d\'accueil comme une vraie app !',
  },
];

export function InstallGuidePage() {
  const [os, setOs] = useState<OS>('android');
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false]);

  const steps = os === 'android' ? stepsAndroid : stepsIOS;
  const allDone = checked.every(Boolean);

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const switchOs = (next: OS) => {
    setOs(next);
    setChecked([false, false, false, false]);
  };

  return (
    <div className="px-4 pb-32 pt-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
          <Download size={30} className="text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Installer l'app</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gratuit · Aucun store · Fonctionne comme une vraie app
        </p>
      </div>

      {/* OS Tabs */}
      <div className="mb-6 flex rounded-xl bg-neutral-100 p-1">
        {(['android', 'ios'] as OS[]).map((o) => (
          <button
            key={o}
            onClick={() => switchOs(o)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
              os === o
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900'
            )}
          >
            {o === 'android' ? '🤖 Android' : '🍎 iPhone / iPad'}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const done = checked[i];
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={cn(
                'w-full text-left rounded-2xl border-2 p-4 transition-all flex gap-4 items-start',
                done
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-200'
              )}
            >
              {/* Checkbox */}
              <div className="mt-0.5 shrink-0">
                {done
                  ? <CheckCircle2 size={24} className="text-emerald-500" />
                  : <Circle size={24} className="text-neutral-400" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className={cn('text-sm font-semibold', done ? 'text-emerald-800 line-through' : 'text-neutral-900')}>
                    {step.title}
                  </span>
                </div>
                <p className="text-[13px] text-neutral-500 pl-8">{step.desc}</p>
              </div>

              <div className="shrink-0 mt-0.5">{step.icon}</div>
            </button>
          );
        })}
      </div>

      {/* Success state */}
      {allDone && (
        <div className="mt-6 rounded-2xl bg-emerald-500 px-5 py-4 text-center text-white shadow-lg animate-slide-up">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-white" />
          <p className="font-display text-lg font-bold">C'est installé ! 🎉</p>
          <p className="mt-1 text-sm text-emerald-100">
            Queer Service est maintenant sur ton écran d'accueil comme une vraie app, gratuitement.
          </p>
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 rounded-2xl bg-neutral-100 border border-neutral-200 px-4 py-3">
        <p className="text-[13px] text-neutral-500 text-center">
          💡 Cette méthode est <strong className="text-neutral-900">100% gratuite</strong> et évite de passer par l'App Store ou le Play Store. L'app se met à jour automatiquement.
        </p>
      </div>
    </div>
  );
}
