import { ChevronRight } from 'lucide-react';

// Real <a href> trail, not just visual — mirrors the BreadcrumbList JSON-LD
// set in useDirectoryCategorySEO, and gives crawlers another path into
// category/city pages besides the homepage tiles.
export interface BreadcrumbItem {
  label: string;
  to?: string; // omitted on the last (current) item
}

export function Breadcrumbs({ items, navigate }: { items: BreadcrumbItem[]; navigate: (to: string) => void }) {
  return (
    <nav aria-label="Fil d'ariane" className="container-app flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 text-[12px] text-ink-muted no-scrollbar">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="shrink-0 opacity-50" />}
            {isLast || !item.to ? (
              <span className="font-semibold text-ink-base">{item.label}</span>
            ) : (
              <a
                href={item.to}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.to!);
                }}
                className="hover:text-patina-deep transition-colors"
              >
                {item.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}
