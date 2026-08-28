import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({
  value,
  size = 16,
  onChange,
  className,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(onChange && 'cursor-pointer transition hover:scale-110', !onChange && 'cursor-default')}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={cn(
              n <= Math.round(value) ? 'fill-accent-400 text-accent-400' : 'fill-neutral-200 text-neutral-400',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function AverageStars({ value, count, size = 16 }: { value: number; count: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <StarRating value={value} size={size} />
      <span className="text-sm font-medium text-neutral-500">
        {value > 0 ? value.toFixed(1) : '—'}
        {count > 0 && <span className="text-neutral-400"> ({count})</span>}
      </span>
    </div>
  );
}
