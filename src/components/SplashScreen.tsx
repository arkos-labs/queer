export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#ede9fe] px-8"
      role="status"
      aria-live="polite"
      aria-label="Chargement de Queer Services"
    >
      <div className="splash-glow absolute h-72 w-72 rounded-full bg-violet-300/40 blur-3xl" aria-hidden />
      <img
        src="/logo.png"
        alt=""
        className="splash-logo relative h-28 w-28 object-contain drop-shadow-[0_12px_28px_rgba(109,40,217,0.35)]"
      />
      <h1 className="relative mt-6 font-display text-[26px] font-extrabold tracking-tight text-neutral-900">
        Queer Services
      </h1>
      <p className="relative mt-1 text-sm font-medium text-violet-700/80">Entraide & bonnes adresses</p>
      <div className="relative mt-9 h-1.5 w-44 overflow-hidden rounded-full bg-white/70">
        <div className="splash-bar h-full w-1/2 rounded-full bg-rainbow" />
      </div>
    </div>
  );
}
