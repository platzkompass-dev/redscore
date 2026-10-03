import type { NewsSourceAdapter } from "../types.ts";
import { dwdAdapter } from "./dwd.ts";
import { gdacsAdapter } from "./gdacs.ts";
import { gdeltAdapter } from "./gdelt.ts";
import { eonetAdapter } from "./eonet.ts";
import { nwsAdapter } from "./nws.ts";
import { rssAdapter } from "./rss.ts";
import { usgsAdapter } from "./usgs.ts";

const adapters = new Map<string, NewsSourceAdapter>([
  [dwdAdapter.key, dwdAdapter],
  [gdacsAdapter.key, gdacsAdapter],
  [gdeltAdapter.key, gdeltAdapter],
  [eonetAdapter.key, eonetAdapter],
  [nwsAdapter.key, nwsAdapter],
  [rssAdapter.key, rssAdapter],
  [usgsAdapter.key, usgsAdapter],
]);

export function adapterFor(key: string): NewsSourceAdapter {
  const adapter = adapters.get(key);
  if (!adapter) throw new Error(`No adapter registered for ${key}`);
  return adapter;
}
