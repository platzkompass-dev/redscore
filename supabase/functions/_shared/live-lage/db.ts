export class DatabaseClient {
  constructor(private readonly url: string, private readonly serviceRoleKey: string) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.serviceRoleKey,
        authorization: `Bearer ${this.serviceRoleKey}`,
        "content-type": "application/json",
        ...(init.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`Database request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  select<T>(path: string): Promise<T> { return this.request<T>(path); }

  insert<T>(table: string, body: unknown): Promise<T> {
    return this.request<T>(table, {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(body),
    });
  }

  upsert<T>(table: string, body: unknown, onConflict: string): Promise<T> {
    return this.request<T>(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(body),
    });
  }

  update<T>(tableAndFilter: string, body: unknown): Promise<T> {
    return this.request<T>(tableAndFilter, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(body),
    });
  }
}
