import { today, validateParticipant, metrics, leaderboard, recordWeight } from './model.js';
const $ = id => document.getElementById(id);
const key = 'biggest-loser:v1';
let people = [];
let selected = null;
let storageBlocked = false;
function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').className = error ? 'error' : '';
  $('notice').hidden = false;
}
try {
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(validateParticipant) || new Set(parsed.map(p => p.id)).size !== parsed.length) throw Error('Invalid data');
    people = parsed;
  }
} catch {
  storageBlocked = true;
  notice('Data tersimpan tidak dapat dibaca. Muat semula atau semak tetapan storan pelayar. Data asal tidak ditimpa.', true);
}
function save(next) {
  if (storageBlocked) { notice('Storan tidak tersedia. Selesaikan isu storan dan muat semula sebelum menyimpan.', true); return false; }
  try { localStorage.setItem(key, JSON.stringify(next)); people = next; render(); return true; }
  catch { notice('Gagal menyimpan. Semak ruang dan kebenaran storan pelayar; perubahan belum disimpan.', true); return false; }
}
const number = value => value.toLocaleString('ms-MY', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render() {
  $('total').textContent = people.length;
  const data = people.map(metrics);
  $('loss').replaceChildren(document.createTextNode(`${number(data.reduce((sum, p) => sum + p.lost, 0))} `), element('small', 'kg'));
  $('average').replaceChildren(document.createTextNode(number(data.length ? data.reduce((sum, p) => sum + p.percent, 0) / data.length : 0)), element('small', '%'));
  $('empty').hidden = people.length > 0;
  $('rank-table').hidden = people.length === 0;
  $('export').disabled = people.length === 0;
  $('rankings').replaceChildren();
  const previous = $('participant').value;
  $('participant').replaceChildren(new Option('Pilih peserta', ''));
  people.forEach(p => $('participant').add(new Option(p.name, p.id)));
  if (people.some(p => p.id === previous)) $('participant').value = previous;
  leaderboard(people).forEach((p, i) => {
    const m = metrics(p), row = element('tr'), name = element('td');
    const button = element('button', p.name, 'person');
    button.type = 'button';
    button.addEventListener('click', () => { selected = p.id; $('participant').value = p.id; renderHistory(); });
    name.append(element('span', String(i + 1).padStart(2, '0'), 'rank'), button);
    row.append(name, element('td', `${number(m.initial)} kg`), element('td', `${number(m.current)} kg`),
      element('td', `${m.lost < 0 ? '+' : '−'}${number(Math.abs(m.lost))} kg`, m.lost >= 0 ? 'positive' : 'negative'),
      element('td', `${number(m.percent)}%`, m.percent >= 0 ? 'positive' : 'negative'));
    $('rankings').append(row);
  });
  renderHistory();
}
function renderHistory() {
  const person = people.find(p => p.id === selected), root = $('history');
  root.replaceChildren(); root.hidden = !person;
  if (!person) return;
  root.append(element('h3', `Sejarah · ${person.name}`));
  const table = element('table'), head = element('tr');
  head.append(element('th', 'Tarikh'), element('th', 'Berat'));
  const thead = element('thead'); thead.append(head); table.append(thead);
  const body = element('tbody');
  [...person.entries].reverse().forEach(entry => {
    const row = element('tr'); row.append(element('td', entry.date), element('td', `${number(entry.weight)} kg`)); body.append(row);
  });
  table.append(body); root.append(table);
  const remove = element('button', 'Padam peserta dan semua rekod', 'secondary danger');
  remove.type = 'button';
  remove.addEventListener('click', () => {
    if (confirm(`Padam ${person.name} dan semua rekod berat? Tindakan ini tidak boleh dipulihkan.`)) {
      if (save(people.filter(p => p.id !== person.id))) notice('Peserta telah dipadam.');
    }
  });
  root.append(remove);
}
for (const id of ['start-date', 'record-date']) { $(id).value = today(); $(id).max = today(); }
$('participant-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('name').value.trim(), weight = Number($('initial').value), date = $('start-date').value;
  const person = { id: crypto.randomUUID(), name, entries: [{ date, weight }] };
  if (!validateParticipant(person)) { notice('Isi nama, tarikh sah dan berat antara 20 hingga 500 kg.', true); return; }
  if (people.some(p => p.name.toLocaleLowerCase('ms') === name.toLocaleLowerCase('ms'))) { notice('Nama ini sudah didaftarkan. Gunakan nama yang berbeza.', true); return; }
  if (save([...people, person])) {
    $('participant-form').reset(); $('start-date').value = today(); $('participant').value = person.id;
    notice(`${name} berjaya didaftarkan.`);
  }
});
$('weight-form').addEventListener('submit', event => {
  event.preventDefault();
  const person = people.find(p => p.id === $('participant').value);
  if (!person) { notice('Pilih peserta dahulu.', true); return; }
  try {
    const next = recordWeight(person, $('record-date').value, Number($('weight').value));
    if (save(people.map(p => p.id === person.id ? next : p))) {
      $('weight').value = ''; notice(`Rekod ${person.name} berjaya disimpan.`);
    }
  } catch (error) { notice(error.message, true); }
});
$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(people, null, 2)], { type: 'application/json' }));
  const a = element('a'); a.href = url; a.download = `biggest-loser-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();
