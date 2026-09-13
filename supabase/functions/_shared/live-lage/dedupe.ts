import type { NormalizedNewsItem } from "./types.ts";

const STOP = new Set(["der","die","das","ein","eine","einer","und","oder","für","von","im","in","am","an","auf","the","a","of","to","and","near"]);

export function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9äöüß ]/g, " ").split(/\s+/).filter(word => word.length > 2 && !STOP.has(word)));
}

export function jaccard(left: Set<string>, right: Set<string>): number {
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection++;
  return intersection / union.size;
}

export function fingerprint(item: Pick<NormalizedNewsItem, "title" | "category" | "country" | "region" | "publishedAt">): string {
  const dayBucket = new Date(item.publishedAt).toISOString().slice(0, 13);
  return [item.category, item.country, item.region || "", [...tokens(item.title)].sort().slice(0, 8).join("-"), dayBucket].join("|").slice(0, 500);
}

export function isProbableDuplicate(item: NormalizedNewsItem, candidate: Record<string, unknown>): boolean {
  if (item.category !== candidate.category) return false;
  const published = new Date(String(candidate.published_at)).getTime();
  if (Math.abs(new Date(item.publishedAt).getTime() - published) > 12 * 60 * 60 * 1000) return false;
  const sameCountry = !item.country || !candidate.country || item.country.toLowerCase() === String(candidate.country).toLowerCase();
  if (!sameCountry) return false;
  const itemRegion = (item.region || "").toLowerCase();
  const candidateRegion = String(candidate.region || "").toLowerCase();
  if (itemRegion && candidateRegion && itemRegion !== candidateRegion) return false;
  const titleScore = jaccard(tokens(item.title), tokens(String(candidate.title || "")));
  const bodyScore = jaccard(tokens(item.title + " " + item.summary), tokens(String(candidate.title || "") + " " + String(candidate.summary || "")));
  const orgA = new Set(item.organizations.map(value => value.toLowerCase()));
  const orgB = new Set((candidate.organizations as string[] || []).map(value => value.toLowerCase()));
  const orgOverlap = [...orgA].some(value => orgB.has(value));
  return titleScore >= 0.55 || bodyScore >= 0.48 || (orgOverlap && titleScore >= 0.38);
}
