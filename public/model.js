export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export const validWeight = value => Number.isFinite(value) && value >= 20 && value <= 500;
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today();
}
export function validateParticipant(person) {
  if (person?.category !== undefined && !['Dewasa', 'Junior'].includes(person.category)) return false;
  if (!person || typeof person.id !== 'string' || !person.id || typeof person.name !== 'string' || !person.name.trim() || person.name.length > 80) return false;
  return Array.isArray(person.entries) && person.entries.length > 0 && person.entries.every((entry, i, entries) =>
    validWeight(entry.weight) && validDate(entry.date) && (i === 0 || entries[i - 1].date < entry.date));
}
export function metrics(person) {
  const initial = person.entries[0].weight;
  const current = person.entries.at(-1).weight;
  const lost = initial - current;
  return { initial, current, lost, percent: lost / initial * 100 };
}
export function leaderboard(people) {
  return [...people].sort((a, b) => metrics(b).percent - metrics(a).percent || a.name.localeCompare(b.name, 'ms'));
}
export function recordWeight(person, date, weight) {
  if (!validDate(date)) throw new Error('Pilih tarikh yang sah, sehingga hari ini.');
  if (!validWeight(weight)) throw new Error('Berat mestilah antara 20 hingga 500 kg.');
  if (date < person.entries[0].date) throw new Error('Tarikh rekod tidak boleh mendahului tarikh mula.');
  const entries = person.entries.filter(entry => entry.date !== date);
  entries.push({ date, weight });
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { ...person, entries };
}

export function parseImport(value) {
  if (!Array.isArray(value) || !value.length || !value.every(validateParticipant) || new Set(value.map(p => p.id)).size !== value.length || new Set(value.map(p => p.name.trim().toLocaleLowerCase('ms'))).size !== value.length) throw new Error('Fail data tidak sah atau mempunyai peserta berulang.');
  return value;
}
export function mergeImport(existing, incoming) {
  parseImport(incoming);
  const result = [...existing];
  for (const person of incoming) {
    const match = existing.find(p => p.id === person.id || p.name.trim().toLocaleLowerCase('ms') === person.name.trim().toLocaleLowerCase('ms'));
    if (match) throw new Error('Peserta sudah wujud: ' + person.name + '. Tiada data ditimpa.');
    result.push(person);
  }
  return result;
}
