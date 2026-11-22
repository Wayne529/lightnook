export type Preferences = { scene: string; minutes: number; budget: number; allergens: string[]; dislikes: string[]; workoutDays: number[] };
export const defaults: Preferences = { scene: 'mixed', minutes: 30, budget: 3000, allergens: [], dislikes: [], workoutDays: [1, 2, 4, 6, 0] };
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const weekStart = (date: string) => addDays(date, -((weekday(date) + 6) % 7));
export function isDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function eligible(meal: { kind: string; minutes: number; costCents: number; title: string; allergens: string[]; allergenKnown: boolean }, pref: Preferences, slot?: string, scene?: string) {
  if (pref.allergens.length && (!meal.allergenKnown || pref.allergens.some(a => meal.allergens.includes(a)))) return false;
  if (pref.dislikes.some(d => meal.title.includes(d))) return false;
  if (meal.minutes > pref.minutes || meal.costCents > pref.budget) return false;
  const target = scene || pref.scene;
  if (target === 'home' && meal.kind !== 'HOME') return false;
  if (target === 'outside' && meal.kind !== 'OUTSIDE') return false;
  return true;
}
export function stats(items: any[], records: any[]) {
  const active = records.filter(r => !r.revokedAt);
  const scheduled = items.filter(i => i.disposition === 'SCHEDULED');
  const completed = scheduled.filter(i => active.some(r => r.itemId === i.id)).length;
  return { completed, eligible: scheduled.length, excused: items.length - scheduled.length, percent: scheduled.length ? Math.round(completed / scheduled.length * 100) : null,
    meals: active.filter(r => r.type === 'MEAL').length, workouts: active.filter(r => r.type === 'WORKOUT').length,
    minutes: active.filter(r => r.type === 'WORKOUT').reduce((n, r) => n + Number(r.actual.minutes || 0), 0) };
}
export function groceries(items: any[]) {
  const map = new Map<string, any>();
  for (const item of items.filter(i => i.slot !== 'workout')) for (const ingredient of item.snapshot.ingredients || []) {
    const key = `${ingredient.name}|${ingredient.unit}|${ingredient.basis}`;
    const old = map.get(key);
    map.set(key, { ...ingredient, key, quantity: (old?.quantity || 0) + ingredient.quantity, checked: false, needsReview: false });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
export function reconcileGroceries(previous: any[], next: any[]) {
  return next.map(n => { const p = previous.find(p => p.key === n.key); return { ...n, checked: !!p?.checked, needsReview: !!p?.checked && n.quantity > p.quantity }; });
}
