/** Title line packing shared by the classic renderer and the premium engine. */

function splitTitleParts(text: string): string[] {
  const parts: string[] = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (ch === "、" || ch === "，") {
      parts.push(buf);
      buf = "";
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

function splitEvenChars(text: string, n: number): string[] {
  const chars = [...text];
  if (chars.length === 0) return [];
  const count = Math.min(Math.max(n, 1), chars.length);
  const size = Math.ceil(chars.length / count);
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const chunk = chars.slice(i * size, (i + 1) * size).join("");
    if (chunk) lines.push(chunk);
  }
  return lines;
}

function balanceParts(parts: string[], n: number): string[] {
  if (parts.length === 0) return [];
  if (parts.length === n) return parts;
  if (parts.length < n) {
    const buckets = [...parts];
    while (buckets.length < n) {
      let maxI = 0;
      for (let i = 1; i < buckets.length; i++) {
        if ([...buckets[i]!].length > [...buckets[maxI]!].length) maxI = i;
      }
      const chars = [...buckets[maxI]!];
      if (chars.length < 2) break;
      const mid = Math.ceil(chars.length / 2);
      buckets.splice(maxI, 1, chars.slice(0, mid).join(""), chars.slice(mid).join(""));
    }
    return buckets;
  }
  const lines: string[] = [];
  let i = 0;
  for (let k = 0; k < n && i < parts.length; k++) {
    const remainBuckets = n - k;
    const remainChars = parts.slice(i).reduce((s, p) => s + [...p].length, 0);
    const want = remainChars / remainBuckets;
    let acc = "";
    let accLen = 0;
    while (i < parts.length) {
      const nextLen = [...parts[i]!].length;
      if (k === n - 1) {
        acc += parts[i++];
        continue;
      }
      if (acc && accLen + nextLen > want * 1.2) break;
      acc += parts[i++];
      accLen += nextLen;
      if (accLen >= want * 0.8) break;
    }
    if (acc) lines.push(acc);
  }
  return lines;
}

/** Legacy automatic packing (pre-2026-10-29): only used to migrate saved single-string titles. */
export function legacyPackTitle(text: string, n: number): string[] {
  const t = text.trim();
  if (!t) return [];
  const count = Math.max(1, Math.min(3, Math.round(n) || 1));
  if (count === 1) return [t];
  const parts = splitTitleParts(t);
  if (parts.length === 1) return splitEvenChars(t, count);
  return balanceParts(parts, count);
}

/** Max 职务 inputs per guest. */
export const MAX_TITLES = 4;

const TRAILING_SEP = /[、，,;；\s]+$/;

/**
 * 职务 are entered one per input box and stored joined with "\n".
 * Each entry is one line (横排) / one column (竖排) — never auto-wrapped.
 */
export function splitTitles(text: string): string[] {
  return text.split("\n");
}

export function joinTitles(list: string[]): string {
  return list.join("\n");
}

/** Lines to render: one per non-empty 职务, dangling list separators dropped. */
export function packTitle(text: string, _legacyLines?: number): string[] {
  return splitTitles(text)
    .map((l) => l.trim().replace(TRAILING_SEP, ""))
    .filter((l) => l.length > 0)
    .slice(0, MAX_TITLES);
}

/** Old saved data: one string + titleLines → explicit lines. */
export function migrateTitle(title: string, titleLines?: number): string {
  if (title.includes("\n") || !titleLines || titleLines <= 1) return title;
  return joinTitles(legacyPackTitle(title, titleLines).map((l) => l.replace(TRAILING_SEP, "")));
}
