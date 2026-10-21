// Public anonymous tool: no account access, persistence or network requests.
export function waterPlan(people, days, rawStock = "0", bottleSize = 1.5) {
  const text = String(rawStock ?? "").trim();
  if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return null;
  const stock = Number(text.replace(",", "."));
  if (!Number.isInteger(people) || people < 1 || people > 100 || !Number.isInteger(days) || days < 1 || days > 30 || !Number.isFinite(stock) || stock > 100000 || ![0.5, 1, 1.5, 2, 5, 10].includes(bottleSize)) return null;
  const target = people * days * 2;
  const missing = Math.max(0, Math.round((target - stock) * 1000) / 1000);
  return { target, missing, bottles: Math.ceil(missing / bottleSize), bottleSize };
}
