export type SourceTrustLevel = "official" | "verified" | "osint" | "unknown";
export type VerificationStatus = "official" | "verified" | "multiple_sources" | "osint_unconfirmed" | "unknown";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type NewsCategory =
  | "drones" | "critical_infrastructure" | "cyber" | "it_outage" | "power_outage"
  | "telecom_outage" | "drinking_water" | "flood" | "heavy_rain" | "storm"
  | "extreme_heat" | "wildfire" | "earthquake" | "volcano" | "tsunami"
  | "severe_weather" | "evacuation" | "major_fire" | "chemical_incident"
  | "hazmat" | "radiological" | "transport_outage" | "supply_disruption"
  | "civil_protection" | "official_warning" | "international_security";

export interface SourceConfig {
  id: string;
  slug: string;
  name: string;
  source_type: "rest_api" | "rss" | "atom" | "json_feed" | "cap";
  adapter_key: string;
  trust_level: SourceTrustLevel;
  allowed_hosts: string[];
  polling_interval_seconds: number;
  config: { endpoint?: string; canonical_url?: string };
}

export interface NormalizedNewsItem {
  externalId: string;
  title: string;
  summary: string;
  category: NewsCategory;
  severity: Severity;
  verificationStatus: VerificationStatus;
  sourceTrustLevel: SourceTrustLevel;
  sourceName: string;
  sourceUrl: string;
  canonicalUrl: string;
  publishedAt: string;
  fetchedAt: string;
  country: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  geographicScope?: string;
  affectedRadiusKm?: number;
  expiresAt?: string;
  organizations: string[];
  tags: string[];
  rawPayload?: unknown;
}

export interface NewsSourceAdapter {
  readonly key: string;
  fetch(source: SourceConfig): Promise<NormalizedNewsItem[]>;
}

export interface UserContext {
  country: string;
  region?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}
