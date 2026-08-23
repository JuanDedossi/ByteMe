/**
 * Shared helpers for accent/case-insensitive search across list entities.
 *
 * `normalizeForSearch` lowercases, applies Unicode NFD decomposition, and
 * strips combining marks so `Azúcar` collapses to `azucar`.
 *
 * `escapeRegExp` escapes regex metacharacters so user-supplied input is
 * treated as a literal by MongoDB `$regex`.
 *
 * `buildAccentInsensitiveRegex` combines both and additionally expands each
 * Latin letter in the normalized input into a character class that also
 * matches its accented variants, so a query of `azucar` matches a stored
 * `Azúcar`. Non-letter characters fall through `escapeRegExp` so regex
 * injection is still blocked.
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Latin letters mapped to their accented variants seen across Spanish,
 * Portuguese, and common loanwords. Used by `buildAccentInsensitiveRegex` to
 * turn each letter of a normalized query into a matching character class.
 */
const ACCENT_MAP: Record<string, string> = {
  a: 'aáàäâãåāăą',
  c: 'cçćĉċč',
  e: 'eéèëêěēĕėę',
  i: 'iíìïîǐĭīĩį',
  n: 'nńñņṅṇ',
  o: 'oóòöôõǒōŏő',
  s: 'sśŝşšṣ',
  u: 'uúùüûǔūŭůűų',
  y: 'yýỳÿŷỹ',
  z: 'zźżž',
};

export function buildAccentInsensitiveRegex(input: string): string {
  const normalized = normalizeForSearch(input).trim();
  if (!normalized) return '';
  return [...normalized]
    .map((char) => {
      const variants = ACCENT_MAP[char];
      if (variants) return `[${variants}]`;
      return escapeRegExp(char);
    })
    .join('');
}