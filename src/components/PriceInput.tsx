import { cn } from '@/lib/utils';

// Reusable numeric price field for the whole app. The € sign is a fixed
// visual element (not part of the editable value) so it's always shown
// and can never be typed over or deleted — anywhere the site asks for a
// price/budget amount, this is what renders it.
export function PriceInput({
  value,
  onChange,
  placeholder,
  id,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200', className)}>
      <span className="shrink-0 text-base md:text-sm font-semibold text-neutral-400 select-none" aria-hidden="true">€</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base md:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0"
      />
    </div>
  );
}
