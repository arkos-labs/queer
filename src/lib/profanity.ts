// Masks insults with asterisks ("connard" -> "*******").
// Matching is accent-insensitive, ignores case, stretched letters
// ("puuuute") and simple plural / feminine endings. Whole words only, and
// no regex lookbehind (unsupported on older iOS WebViews).

const INSULTS = [
  // français
  'putain', 'pute', 'merde', 'connard', 'connasse', 'con', 'conne', 'salope', 'salaud',
  'enculé', 'encule', 'enculer', 'fdp', 'ntm', 'nique', 'niquer', 'batard', 'bâtard',
  'bordel', 'crevard', 'ordure', 'abruti', 'abrutie', 'débile', 'debile', 'crétin', 'cretin',
  'imbécile', 'imbecile', 'trouduc', 'couillon', 'pétasse', 'petasse', 'grognasse',
  'pd', 'pédé', 'pede', 'pédale', 'pedale', 'tapette', 'tarlouze', 'tarlouse', 'gouine', 'travelo',
  'sale race', 'négro', 'negro', 'bougnoule', 'youpin',
  // english
  'fuck', 'fucking', 'fucker', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'faggot', 'fag', 'dickhead', 'slut', 'whore', 'nigger', 'retard',
];

function key(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(.)\1+/g, '$1');
}

const SINGLE = new Set(INSULTS.filter((w) => !w.includes(' ')).map(key));
const PHRASES = INSULTS.filter((w) => w.includes(' '));

function isInsult(token: string): boolean {
  const k = key(token);
  if (SINGLE.has(k)) return true;
  if (k.endsWith('s') && SINGLE.has(k.slice(0, -1))) return true;
  if (k.length >= 5) {
    if (k.endsWith('es') && SINGLE.has(k.slice(0, -2))) return true;
    if (k.endsWith('e') && SINGLE.has(k.slice(0, -1))) return true;
  }
  return false;
}

export function censorInsults(text: string): string {
  if (!text) return text;
  let out = text.replace(/[\p{L}]+/gu, (token) => (isInsult(token) ? '*'.repeat(token.length) : token));
  for (const phrase of PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'giu');
    out = out.replace(re, (m) => m.replace(/[^\s]/g, '*'));
  }
  return out;
}
