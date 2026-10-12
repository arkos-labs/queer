import { Plus, Trash2 } from 'lucide-react';
import type { Category, ProService, Subcategory } from '@/lib/types';

const OTHER = '__other';

// Un service par ligne : liste déroulante (ou « Autre » en texte libre) + tarif
// facultatif. Le bouton « Ajouter un service » ajoute autant de lignes que voulu.
export function ProServicesEditor({
  categories,
  subcategories,
  value,
  onChange,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  value: ProService[];
  onChange: (next: ProService[]) => void;
}) {
  const update = (index: number, patch: Partial<ProService>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const selectValue = (row: ProService) =>
    row.other ? OTHER : row.subcategory_id ?? '';

  const onSelect = (index: number, picked: string) => {
    if (picked === OTHER) update(index, { other: true, subcategory_id: null, label: '' });
    else if (!picked) update(index, { other: false, subcategory_id: null, label: '' });
    else {
      const sub = subcategories.find((s) => s.id === picked);
      update(index, { other: false, subcategory_id: picked, label: sub?.label ?? '' });
    }
  };

  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <div key={index} className="rounded-2xl border border-gold-hairline bg-white/80 p-3 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <select
                value={selectValue(row)}
                onChange={(e) => onSelect(index, e.target.value)}
                className="input"
                aria-label="Service proposé"
              >
                <option value="">Choisir un service…</option>
                {categories.map((cat) => {
                  const subs = subcategories.filter((s) => s.category_id === cat.id);
                  if (!subs.length) return null;
                  return (
                    <optgroup key={cat.id} label={cat.label}>
                      {subs.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </optgroup>
                  );
                })}
                <option value={OTHER}>Autre service…</option>
              </select>
              {row.other && (
                <input
                  value={row.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  className="input"
                  placeholder="Nom du service"
                  maxLength={80}
                />
              )}
              <input
                value={row.price}
                onChange={(e) => update(index, { price: e.target.value })}
                className="input"
                placeholder="Tarif (facultatif) — ex. 40 € / heure"
                maxLength={60}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label="Supprimer ce service"
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-hairline bg-white text-ink-muted hover:text-error-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { subcategory_id: null, label: '', price: '' }])}
        className="btn-outline w-full"
      >
        <Plus size={16} /> Ajouter un service
      </button>
    </div>
  );
}
