// Until a mission is accepted (the client has chosen who does it), phone
// numbers, e-mails and street addresses must not be exchanged in messages:
// they are replaced by asterisks. The same rule is enforced in the database
// (see the mask_contact_before_accept migration).
// No regex lookbehind: unsupported on older iOS WebViews.

const STREET = "(?:rue|avenue|av\\.?|boulevard|bd|impasse|all[ée]e|chemin|quai)";
const STREET_NEEDS_NUMBER = "(?:place|route|cours|square|passage|villa|r[ée]sidence)";
const WORD = "[\\p{L}0-9'’\\-]+";
const END = "(?=[\\s,.;:!?)]|$)";

const RE_PHONE = /\+?\d(?:[\s.\-]?\d){8,}/g;
const RE_EMAIL = /[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+/g;
const RE_STREET = new RegExp(
  `(^|[^\\p{L}0-9])((?:\\d{1,4}\\s*(?:bis|ter)?\\s*,?\\s*)?${STREET}${END}(?:\\s+${WORD}){1,4})`,
  'giu',
);
const RE_STREET_NUM = new RegExp(
  `(^|[^\\p{L}0-9])(\\d{1,4}\\s*(?:bis|ter)?\\s*,?\\s+${STREET_NEEDS_NUMBER}${END}(?:\\s+${WORD}){1,4})`,
  'giu',
);

const stars = (s: string) => s.replace(/\S/g, '*');

export function maskContactInfo(text: string): string {
  if (!text) return text;
  return text
    .replace(RE_EMAIL, stars)
    .replace(RE_PHONE, stars)
    .replace(RE_STREET, (_m, pre: string, body: string) => pre + stars(body))
    .replace(RE_STREET_NUM, (_m, pre: string, body: string) => pre + stars(body));
}
