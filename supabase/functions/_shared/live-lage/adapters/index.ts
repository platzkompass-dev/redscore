import type { NewsSourceAdapter } from "../types.ts";
import { dwdAdapter } from "./dwd.ts";
import { gdacsAdapter } from "./gdacs.ts";

const adapters = new Map<string, NewsSourceAdapter>([
  [dwdAdapter.key, dwdAdapter],
  [gdacsAdapter.key, gdacsAdapter],
]);

export function adapterFor(key: string): NewsSourceAdapter {
  const adapter = adapters.get(key);
  if (!adapter) throw new Error(`No adapter registered for ${key}`);
  return adapter;
}
