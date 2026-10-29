import { today, validateParticipant, metrics, leaderboard, recordWeight, parseImport, mergeImport, recordHealth } from './model.js';
const $ = id => document.getElementById(id);
const key = 'biggest-loser:v1';
let people = [];
let selected = null;
let storageBlocked = false;
let hasSavedData = false;
function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').className = error ? 'error' : '';
  $('notice').hidden = false;
}
try {
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    hasSavedData = true;
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
const number = value => value.toLocaleString('ms-MY', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render() {
  const visible = people.filter(p => (p.category || 'Dewasa') === $('category').value);
  const ranked = leaderboard(visible);
  $('podium').replaceChildren();
  ranked.slice(0, 5).forEach((person, index) => {
    const m = metrics(person), row = element('li', undefined, 'leader-row');
    const info = element('div', undefined, 'leader-info');
    info.append(element('h3', person.name), element('p', `${number(m.initial)} kg → ${number(m.current)} kg`));
    const score = element('div', undefined, 'leader-score');
    score.append(element('strong', `${number(m.percent)}%`), element('small', m.lost >= 0 ? `Turun ${number(m.lost)} kg` : `Naik ${number(-m.lost)} kg`));
    row.append(element('span', String(index + 1), 'place'), info, score);
    $('podium').append(row);
  });
  const lastDate = visible.flatMap(p => p.entries.map(e => e.date)).sort().at(-1);
  $('latest-record').textContent = lastDate ? `Rekod berat terkini: ${lastDate}` : 'Belum ada rekod berat.';
  $('total').textContent = visible.length;
  const data = visible.map(metrics);
  $('source-note').textContent = visible.some(p => p.source) ? 'TEFOC 2020 · 1 November–15 Disember 2020. Ringkasan mengikut kategori dipilih.' : 'Ringkasan mengikut kategori dipilih.';
  $('loss').replaceChildren(document.createTextNode(`${number(data.reduce((sum, p) => sum + p.lost, 0))} `), element('small', 'kg'));
  $('average').replaceChildren(document.createTextNode(number(data.length ? data.reduce((sum, p) => sum + p.percent, 0) / data.length : 0)), element('small', '%'));
  $('empty').hidden = visible.length > 0;
  $('rank-table').hidden = visible.length === 0;
  $('export').disabled = people.length === 0;
  $('rankings').replaceChildren();
  const slots = Math.max(8, ...visible.map(p => p.entries.length - 1));
  $('progress-head').replaceChildren(...['Peserta', 'Berat Awal', 'Terkini', ...Array.from({ length: slots }, (_, i) => `M${i + 1}`), 'Jumlah Turun'].map(label => element('th', label)));
  const previous = $('participant').value;
  $('participant').replaceChildren(new Option('Pilih peserta', ''));
  visible.forEach(p => $('participant').add(new Option(p.name, p.id)));
  if (people.some(p => p.id === previous)) $('participant').value = previous;
  $('health-participant').replaceChildren(new Option('Pilih peserta', ''));
  visible.forEach(p => $('health-participant').add(new Option(p.name, p.id)));
  if (visible.some(p => p.id === selected)) $('health-participant').value = selected;
  leaderboard(visible).forEach((p, i) => {
    const m = metrics(p), row = element('tr'), name = element('td');
    const button = element('button', p.name, 'person');
    button.type = 'button';
    button.addEventListener('click', () => { selected = p.id; $('health-form').reset(); $('health-date').value = today(); $('participant').value = p.id; renderWeekOptions(); $('health-participant').value = p.id; renderHistory(); $('rekod').scrollIntoView({ block: 'start' }); });
    name.append(element('span', String(i + 1).padStart(2, '0'), 'rank'), button);
    const datedCell = entry => {
      const cell = element('td', entry ? `${number(entry.weight)} kg` : '—');
      if (entry) cell.append(element('small', entry.date));
      return cell;
    };
    row.append(name, datedCell(p.entries[0]), datedCell(p.entries.at(-1)));
    for (let index = 1; index <= slots; index++) row.append(datedCell(p.entries[index]));
    row.append(element('td', `${m.lost < 0 ? '+' : '−'}${number(Math.abs(m.lost))} kg`, m.lost >= 0 ? 'positive' : 'negative'));
    $('rankings').append(row);
  });
  renderHistory();
  renderWeekOptions();
}
function renderHistory() {
  const person = people.find(p => p.id === selected), root = $('history');
  root.replaceChildren(); root.hidden = !person;
  renderHealth(person);
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
for (const id of ['start-date', 'record-date', 'health-date']) { $(id).value = today(); $(id).max = today(); }
$('participant-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('name').value.trim(), weight = Number($('initial').value), date = $('start-date').value;
  const person = { id: crypto.randomUUID(), name, category: $('new-category').value, entries: [{ date, weight }] };
  if (!validateParticipant(person)) { notice('Isi nama, tarikh sah dan berat antara 20 hingga 500 kg.', true); return; }
  if (people.some(p => p.name.toLocaleLowerCase('ms') === name.toLocaleLowerCase('ms'))) { notice('Nama ini sudah didaftarkan. Gunakan nama yang berbeza.', true); return; }
  $('category').value = person.category;
  if (save([...people, person])) {
    $('participant-form').reset(); $('start-date').value = today(); $('participant').value = person.id; renderWeekOptions();
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

$('category').addEventListener('change', () => { selected = null; render(); });
$('import-data').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('Fail terlalu besar (maksimum 5 MB).');
    const incoming = parseImport(JSON.parse(await file.text()));
    if (save(mergeImport(people, incoming))) notice(`${incoming.length} peserta berjaya diimport. Pilih kategori Dewasa atau Junior untuk melihat rekod.`);
  } catch (error) { notice(error.message, true); }
  event.target.value = '';
});
if (!hasSavedData && !storageBlocked) {
  try {
    const response = await fetch('/tefoc-data.json');
    if (response.ok) {
      const incoming = parseImport(await response.json());
      if (save(mergeImport(people, incoming))) notice('Data TEFOC 2020 dimuatkan: 17 dewasa dan 4 Junior. Rekod mingguan sehingga 15 Disember 2020.');
    }
  } catch { notice('Data TEFOC tidak dapat dimuatkan. Cuba muat semula atau import fail JSON.', true); }
}

function renderHealth(person) {
  const log = $('health-log');
  log.replaceChildren();
  if (!person) { log.append(element('p', 'Pilih peserta untuk melihat sejarah dan mencatat kesihatan.', 'hint')); return; }
  if (!person.health?.length) { log.append(element('p', 'Belum ada catatan kesihatan. Rekod berat terdahulu dipaparkan di atas.', 'hint')); return; }
  [...person.health].sort((a, b) => b.date.localeCompare(a.date)).forEach(entry => {
    const card = element('article', undefined, 'health-entry');
    card.append(element('h3', entry.date));
    const details = [];
    if (entry.sleep !== null) details.push(`Tidur: ${number(entry.sleep)} jam`);
    if (entry.activity !== null) details.push(`Aktiviti: ${entry.activity} minit`);
    if (entry.water !== null) details.push(`Air: ${number(entry.water)} liter`);
    if (details.length) card.append(element('p', details.join(' · ')));
    if (entry.notes) card.append(element('p', entry.notes));
    const edit = element('button', 'Sunting rekod', 'secondary'); edit.type = 'button';
    edit.addEventListener('click', () => {
      $('health-date').value = entry.date;
      for (const id of ['sleep', 'activity', 'water']) $(id).value = entry[id] ?? '';
      $('health-notes').value = entry.notes;
      $('health-date').focus();
    });
    card.append(edit); log.append(card);
  });
}
$('health-participant').addEventListener('change', () => {
  selected = $('health-participant').value || null;
  $('participant').value = selected || '';
  $('health-form').reset(); $('health-date').value = today();
  renderHistory();
});
$('health-form').addEventListener('submit', event => {
  event.preventDefault();
  const person = people.find(p => p.id === $('health-participant').value);
  if (!person) { notice('Pilih peserta untuk rekod kesihatan dahulu.', true); return; }
  const entry = { date: $('health-date').value, notes: $('health-notes').value.trim() };
  for (const id of ['sleep', 'activity', 'water']) entry[id] = $(id).value === '' ? null : Number($(id).value);
  try {
    const next = recordHealth(person, entry);
    if (save(people.map(p => p.id === person.id ? next : p))) {
      $('health-form').reset(); $('health-date').value = today();
      notice(`Rekod kesihatan ${person.name} berjaya disimpan.`);
    }
  } catch (error) { notice(error.message, true); }
});

function renderWeekOptions() {
  const person = people.find(p => p.id === $('participant').value);
  $('record-week').replaceChildren(new Option('Pilih tarikh secara manual', ''));
  if (!person) return;
  for (let week = 1; week <= Math.max(8, person.entries.length - 1); week++) {
    let date = person.entries[week]?.date;
    if (!date) {
      const start = new Date(`${person.entries[0].date}T12:00:00Z`);
      start.setUTCDate(start.getUTCDate() + week * 7);
      date = start.toISOString().slice(0, 10);
    }
    const option = new Option(`M${week} · ${date}${person.entries[week] ? ' (sunting)' : ''}`, date);
    option.disabled = date > today();
    $('record-week').add(option);
  }
}
$('participant').addEventListener('change', renderWeekOptions);
$('record-week').addEventListener('change', () => {
  if (!$('record-week').value) return;
  $('record-date').value = $('record-week').value;
  const person = people.find(p => p.id === $('participant').value);
  $('weight').value = person?.entries.find(e => e.date === $('record-week').value)?.weight ?? '';
});
$('record-date').addEventListener('input', () => { $('record-week').value = ''; });
