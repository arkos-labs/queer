import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

const palette = [
  'from-primary-400 to-primary-600',
  'from-secondary-400 to-secondary-600',
  'from-accent-400 to-accent-600',
  'from-primary-500 to-secondary-500',
  'from-secondary-500 to-accent-500',
];

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function Avatar({
  name,
  src,
  size = 48,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number | string;
  className?: string;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const grad = palette[hashIndex(name, palette.length)];

  const isFull = size === 'full';
  const width = isFull ? '100%' : size;
  const height = isFull ? '100%' : size;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width, height }}
        className={cn('rounded-full object-cover ring-2 ring-white shadow-soft', className)}
      />
    );
  }
  return (
    <div
      style={{ width, height }}
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br text-white ring-2 ring-white shadow-soft',
        grad,
        className,
      )}
    >
      {initials || <User size={isFull ? '50%' : (typeof size === 'number' ? size * 0.5 : 24)} />}
    </div>
  );
}
