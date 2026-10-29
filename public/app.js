import { prepareActivityImage } from './activity-image.js';
import { today, validateParticipant, metrics, leaderboard, recordWeight, parseImport, mergeImport, recordHealth, bmi, targetProgress, nextWeighIn } from './model.js';
const $ = id => document.getElementById(id);
const key = 'biggest-loser:v1';
let people = [];
let selected = null;
let storageBlocked = false;
let hasSavedData = false;
let pendingAttachments = [];
let attachmentsChanged = false;
let carouselIndex = 0;
let carouselTimer = null;
let activeArchiveId = null;
const labLabels = { glucose: 'Glukosa (mmol/L)', systolic: 'Sistolik (mmHg)', diastolic: 'Diastolik (mmHg)', totalCholesterol: 'Jumlah kolesterol (mmol/L)', hdl: 'HDL (mmol/L)', ldl: 'LDL (mmol/L)', uricAcid: 'Asid urik (µmol/L)', creatinine: 'Kreatinin (µmol/L)' };
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
  $('progress-head').replaceChildren(...['Peserta', 'Berat Awal', 'Terkini', 'BMI Semasa', 'Kategori BMI', ...Array.from({ length: slots }, (_, i) => `M${i + 1}`), 'Jumlah Turun'].map(label => element('th', label)));
  $('progress-person').replaceChildren(new Option('Pilih peserta', ''));
  people.forEach(p => $('progress-person').add(new Option(p.name, p.id)));
  if (people.some(p => p.id === selected)) $('progress-person').value = selected;
  const previous = $('participant').value;
  $('participant').replaceChildren(new Option('Pilih peserta', ''));
  visible.forEach(p => $('participant').add(new Option(p.name, p.id)));
  if (people.some(p => p.id === previous)) $('participant').value = previous;
  $('health-participant').replaceChildren(new Option('Pilih peserta', ''));
  visible.forEach(p => $('health-participant').add(new Option(p.name, p.id)));
  if (visible.some(p => p.id === selected)) $('health-participant').value = selected;
  const query = $('search').value.trim().toLocaleLowerCase('ms');
  const matches = ranked.filter(p => p.name.toLocaleLowerCase('ms').includes(query));
  $('search-count').textContent = `${matches.length} daripada ${visible.length} peserta`;
  matches.forEach(p => {
    const i = ranked.findIndex(person => person.id === p.id);
    const m = metrics(p), row = element('tr'), name = element('td');
    const button = element('button', p.name, 'person');
    button.type = 'button';
    button.addEventListener('click', () => { selected = p.id; pendingAttachments = []; attachmentsChanged = false; renderPendingFiles(); $('health-form').reset(); $('health-date').value = today(); $('participant').value = p.id; renderWeekOptions(); $('health-participant').value = p.id; renderHistory(); location.hash = 'progress'; });
    name.append(element('span', String(i + 1).padStart(2, '0'), 'rank'), button);
    const datedCell = entry => {
      const cell = element('td', entry ? `${number(entry.weight)} kg` : '—');
      if (entry) cell.append(element('small', entry.date));
      return cell;
    };
    const b = bmi(p);
    row.append(name, datedCell(p.entries[0]), datedCell(p.entries.at(-1)), element('td', b ? number(b.value) : 'Isi tinggi'), element('td', b?.category || 'Belum tersedia'));
    for (let index = 1; index <= slots; index++) row.append(datedCell(p.entries[index]));
    row.append(element('td', `${m.lost < 0 ? '+' : '−'}${number(Math.abs(m.lost))} kg`, m.lost >= 0 ? 'positive' : 'negative'));
    $('rankings').append(row);
  });
  renderHistory();
  renderWeekOptions();
  renderArchives();
  renderHome();
}
function renderHistory() {
  const person = people.find(p => p.id === selected), root = $('history');
  root.replaceChildren(); root.hidden = !person;
  renderHealth(person);
  renderWeightChart(person);
  renderBMI(person);
  if (!person) return;
  root.append(element('h3', `Sejarah · ${person.name}`));
  const table = element('table'), head = element('tr');
  head.append(element('th', 'Tarikh'), element('th', 'Berat'), element('th', 'BMI'), element('th', 'Kategori BMI'));
  const thead = element('thead'); thead.append(head); table.append(thead);
  const body = element('tbody');
  [...person.entries].reverse().forEach(entry => {
    const b = bmi(person, entry.weight);
    const row = element('tr'); row.append(element('td', entry.date), element('td', `${number(entry.weight)} kg`), element('td', b ? number(b.value) : 'Isi tinggi'), element('td', b?.category || 'Belum tersedia')); body.append(row);
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
showPage();

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
    for (const [key, value] of Object.entries(entry.labs || {})) card.append(element('p', `${labLabels[key]}: ${number(value)}`));
    if (entry.glucoseContext) card.append(element('p', `Glukosa: ${entry.glucoseContext}`));
    for (const file of entry.attachments || []) {
      const link = element('a', `Muat turun: ${file.name}`, 'attachment'); link.href = file.data; link.download = file.name; card.append(link);
    }
    if (entry.notes) card.append(element('p', entry.notes));
    const edit = element('button', 'Sunting rekod', 'secondary'); edit.type = 'button';
    edit.addEventListener('click', () => {
      $('health-date').value = entry.date;
      for (const id of ['sleep', 'activity', 'water']) $(id).value = entry[id] ?? '';
      for (const id of Object.keys(labLabels)) $(id).value = entry.labs?.[id] ?? '';
      $('glucose-context').value = entry.glucoseContext || '';
      pendingAttachments = [...(entry.attachments || [])]; attachmentsChanged = true; renderPendingFiles();
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
  pendingAttachments = []; attachmentsChanged = false; renderPendingFiles();
  renderHistory();
});
$('health-form').addEventListener('submit', event => {
  event.preventDefault();
  const person = people.find(p => p.id === $('health-participant').value);
  if (!person) { notice('Pilih peserta untuk rekod kesihatan dahulu.', true); return; }
  const existing = person.health?.find(e => e.date === $('health-date').value);
  const entry = { date: $('health-date').value, notes: $('health-notes').value.trim(), labs: {}, glucoseContext: $('glucose-context').value, attachments: attachmentsChanged ? [...pendingAttachments] : [...(existing?.attachments || [])] };
  for (const id of Object.keys(labLabels)) if ($(id).value !== '') entry.labs[id] = Number($(id).value);
  for (const id of ['sleep', 'activity', 'water']) entry[id] = $(id).value === '' ? null : Number($(id).value);
  try {
    const next = recordHealth(person, entry);
    if (save(people.map(p => p.id === person.id ? next : p))) {
      $('health-form').reset(); $('health-date').value = today();
      pendingAttachments = []; attachmentsChanged = false; renderPendingFiles();
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

$('search').addEventListener('input', render);
function renderWeightChart(person) {
  $('weight-chart').hidden = !person;
  $('chart-content').replaceChildren();
  if (person) $('chart-content').append(weightSVG(person));
}
function weightSVG(person) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svgElement = (tag, attrs, text) => {
    const node = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = svgElement('svg', { viewBox: '0 0 500 200', role: 'img', 'aria-label': `Graf berat ${person.name}: ${person.entries[0].weight} kg hingga ${person.entries.at(-1).weight} kg. Tarikh dan nilai penuh dalam jadual sejarah.` });
  const values = person.entries.map(e => e.weight);
  const low = Math.min(...values) - 1, high = Math.max(...values) + 1;
  const dates = person.entries.map(e => Date.parse(`${e.date}T12:00:00Z`));
  const range = dates.at(-1) - dates[0];
  const x = index => range ? 48 + (dates[index] - dates[0]) / range * 420 : 258;
  const y = value => 145 - (value - low) / (high - low) * 115;
  for (let i = 0; i < 3; i++) {
    const value = low + (high - low) * i / 2;
    const lineY = y(value);
    svg.append(svgElement('line', { x1: 44, x2: 474, y1: lineY, y2: lineY, stroke: '#e2e8f0' }), svgElement('text', { x: 0, y: lineY + 4, fill: '#64748b', 'font-size': 10 }, number(value)));
  }
  svg.append(svgElement('polyline', { points: person.entries.map((e, i) => `${x(i)},${y(e.weight)}`).join(' '), fill: 'none', stroke: '#0d9488', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
  person.entries.forEach((entry, i) => {
    const dot = svgElement('circle', { cx: x(i), cy: y(entry.weight), r: 4, fill: '#0f766e' });
    dot.append(svgElement('title', {}, `${entry.date}: ${number(entry.weight)} kg`)); svg.append(dot);
  });
  svg.append(svgElement('text', { x: 48, y: 180, fill: '#64748b', 'font-size': 10 }, person.entries[0].date), svgElement('text', { x: 468, y: 180, fill: '#64748b', 'font-size': 10, 'text-anchor': 'end' }, person.entries.at(-1).date));
  return svg;
}

function showPage() {
  const target = location.hash.slice(1);
  if (target === 'kandungan') return;
  const id = ['home','sponsor','profile','notifications','progress','overall','nutrition','health','past'].includes(target) ? target : 'home';
  document.querySelectorAll('[data-view]').forEach(view => { view.hidden = view.dataset.view !== id; });
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (id === 'home') requestAnimationFrame(()=>updateCarousel(true));
}
addEventListener('hashchange', showPage);
$('progress-person').addEventListener('change', () => {
  selected = $('progress-person').value || null;
  $('health-form').reset(); $('health-date').value = today(); pendingAttachments = []; attachmentsChanged = false; renderPendingFiles();
  const person = people.find(p => p.id === selected);
  if (person) $('category').value = person.category || 'Dewasa';
  render();
  $('participant').value = selected || ''; renderWeekOptions();
});
function renderBMI(person) {
  const root = $('bmi-status'); root.replaceChildren();
  $('personal-loss').textContent = person ? `${number(metrics(person).lost)} kg` : '—';
  $('personal-bmi').textContent = person && bmi(person) ? number(bmi(person).value) : '—';
  $('height').value = person?.height ?? '';
  if (!person) { root.textContent = 'Pilih peserta untuk melihat kemajuan dan BMI.'; return; }
  const result = bmi(person);
  root.append(element('strong', result ? `BMI ${number(result.value)}` : 'Tinggi belum diisi'), element('p', result?.category || 'Masukkan tinggi untuk mengira BMI semasa.'), element('p', `Berat terkini: ${number(metrics(person).current)} kg · ${person.entries.at(-1).date}`));
}
$('height-form').addEventListener('submit', event => {
  event.preventDefault();
  const height = Number($('height').value), person = people.find(p => p.id === selected);
  if (!person) { notice('Pilih peserta dahulu.', true); return; }
  if (height < 80 || height > 250 || !Number.isFinite(height)) { notice('Tinggi mestilah 80–250 cm.', true); return; }
  if (save(people.map(p => p.id === person.id ? { ...p, height } : p))) notice('Tinggi disimpan dan BMI dikemas kini.');
});
function renderPendingFiles() {
  $('pending-files').replaceChildren();
  pendingAttachments.forEach((file, index) => {
    const row = element('p', file.name + ' '), remove = element('button', 'Buang lampiran baharu', 'secondary'); remove.type = 'button';
    remove.addEventListener('click', () => { pendingAttachments.splice(index, 1); attachmentsChanged = true; renderPendingFiles(); }); row.append(remove); $('pending-files').append(row);
  });
}
$('lab-files').addEventListener('change', async event => {
  try {
    const files = [...event.target.files];
    if (files.length > 2) throw Error('Maksimum 2 fail setiap rekod.');
    const converted = [];
    for (const file of files) {
      if (file.size === 0 || file.size > 1048576 || !['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('Pilih PDF, PNG, JPG atau WEBP, maksimum 1 MB setiap fail.');
      const bytes = new Uint8Array(await file.slice(0,12).arrayBuffer());
      const starts = expected => expected.every((b,i) => bytes[i] === b);
      const valid = file.type === 'application/pdf' ? starts([37,80,68,70,45]) : file.type === 'image/png' ? starts([137,80,78,71,13,10,26,10]) : file.type === 'image/jpeg' ? starts([255,216,255]) : starts([82,73,70,70]) && bytes[8]===87 && bytes[9]===69 && bytes[10]===66 && bytes[11]===80;
      if (!valid) throw Error('Kandungan fail tidak sepadan dengan format PDF/gambar.');
      const data = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(Error('Gagal membaca fail.')); reader.readAsDataURL(file); });
      converted.push({ name:file.name, type:file.type, size:file.size, data });
    }
    pendingAttachments = converted; attachmentsChanged = true; renderPendingFiles();
  } catch(error) { notice(error.message,true); }
  event.target.value = '';
});
function archiveData() {
  const raw = localStorage.getItem('jom-kurus:archives:v1');
  if (!raw) return [];
  const archives = JSON.parse(raw);
  if (!Array.isArray(archives) || !archives.every(a => a && typeof a.id==='string' && typeof a.name==='string' && Array.isArray(a.people) && a.people.every(validateParticipant))) throw Error('Arkib tersimpan tidak sah. Data tidak ditimpa.');
  return archives;
}
function renderArchives() {
  const root = $('archive-list'); root.replaceChildren();
  try {
    const archives = archiveData();
    const tefoc = people.filter(p => p.id.startsWith('tefoc-2020-')).map(p => ({...p, entries: p.entries.filter(e=> e.date >= '2020-11-01' && e.date <= '2020-12-15')})).filter(p=>p.entries.length);
    if (tefoc.length) archives.unshift({id:'tefoc-source',name:'TEFOC 2020',end:'2020-12-15',people:tefoc});
    if (!archives.length) root.append(element('p','Belum ada cabaran diarkibkan.','hint'));
    for (const archive of archives) {
      const card = element('article',undefined,'archive-card'); card.append(element('h3',archive.name),element('p',`Tamat: ${archive.end} · ${archive.people.length} peserta${archive.id==='tefoc-source' ? ' · Berdasarkan rekod TEFOC yang tersedia' : ''}`));
      const view = element('button','Lihat keputusan','secondary'); view.type='button'; view.addEventListener('click',()=>showArchive(archive));
      const download = element('button','Eksport arkib','secondary'); download.type='button';download.addEventListener('click',()=>downloadJSON(archive,`arkib-${archive.id}.json`));
      card.append(view,download);root.append(card);
    }
    if (archives.length) showArchive(archives.find(a=>a.id===activeArchiveId) || archives[0]);
    else { $('archive-detail').hidden=true; $('archive-detail').replaceChildren(); activeArchiveId=null; }
  } catch(error) { root.append(element('p',error.message,'hint')); }
}
function downloadJSON(value, name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=element('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showArchive(archive) {
  activeArchiveId = archive.id;
  const root=$('archive-detail');root.hidden=false;root.replaceChildren(element('h3',archive.name));
  root.append(element('p',`Keputusan kategori ${$('past-category').value} · tamat ${archive.end}`,'hint'));
  const ranked=leaderboard(archive.people.filter(p=>(p.category||'Dewasa')===$('past-category').value));
  const podium=element('div',undefined,'past-podium');
  ranked.slice(0,3).forEach((person,index)=>{
    const card=element('article',undefined,`past-place past-place-${index+1}`);
    card.append(element('span',String(index+1),'medal'),element('h4',person.name),element('p',index===0?'Juara kategori':`Tempat ${index+1}`),element('strong',`${number(metrics(person).percent)}%`));podium.append(card);
  });
  root.append(podium,element('h4','Senarai penuh peserta','past-list-heading'),element('p','Klik nama untuk graf dan rekod mingguan.','hint'));
  if(!ranked.length){root.append(element('p','Tiada peserta dalam kategori ini.','hint'));return;}
  const wrapper=element('div',undefined,'archive-table-scroll'),table=element('table'),head=element('tr');
  ['Peserta','Berat awal','Berat akhir','Penurunan'].forEach(label=>head.append(element('th',label)));
  const thead=element('thead');thead.append(head);table.append(thead);const body=element('tbody');
  for(const person of ranked){
    const row=element('tr'),cell=element('td'),button=element('button',person.name,'person');button.type='button';button.addEventListener('click',()=>openPastChart(person,archive.name));cell.append(button);
    const m=metrics(person);row.append(cell,element('td',`${number(m.initial)} kg`),element('td',`${number(m.current)} kg`),element('td',`${number(m.lost)} kg · ${number(m.percent)}%`));body.append(row);
  }
  table.append(body);wrapper.append(table);root.append(wrapper);
}
function openPastChart(person, name) {
  $('past-chart-title').textContent=`${person.name} · ${name}`;
  const root=$('past-chart-content');root.replaceChildren(weightSVG(person));
  const wrapper=element('div',undefined,'archive-table-scroll'),table=element('table'),head=element('tr');head.append(element('th','Tarikh'),element('th','Berat (kg)'));table.append(head);
  person.entries.forEach(entry=>{const row=element('tr');row.append(element('td',entry.date),element('td',number(entry.weight)));table.append(row);});wrapper.append(table);root.append(wrapper);$('past-chart-dialog').showModal();
}
$('close-past-chart').addEventListener('click',()=>$('past-chart-dialog').close());
$('past-category').addEventListener('change',renderArchives);
$('archive-end').max=today();$('archive-end').value=today();
$('archive-form').addEventListener('submit',event=>{
  event.preventDefault();
  try {
    const name=$('archive-name').value.trim(),end=$('archive-end').value;
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end>today()) throw Error('Isi nama dan tarikh tamat yang sah.');
    const snapshot=people.map(p=>({...p,entries:p.entries.filter(e=>e.date<=end),health:(p.health||[]).filter(e=>e.date<=end)})).filter(p=>p.entries.length);
    if (!snapshot.length) throw Error('Tiada rekod untuk diarkibkan pada tarikh ini.');
    const archives=archiveData();archives.push({id:crypto.randomUUID(),name,end,people:JSON.parse(JSON.stringify(snapshot))});
    localStorage.setItem('jom-kurus:archives:v1',JSON.stringify(archives));renderArchives();notice('Keputusan cabaran disalin ke arkib. Rekod semasa dikekalkan.');
  } catch(error){notice(error.message,true);}
});

function readList(key) {
  const value = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(value)) throw Error('Data tersimpan tidak sah. Data asal tidak ditimpa.');
  return value;
}
function fillPeople(id, value = '') {
  $(id).replaceChildren(new Option('Pilih peserta', ''));
  people.forEach(p => $(id).add(new Option(p.name, p.id)));
  if (people.some(p => p.id === value)) $(id).value = value;
}
function currentSession() {
  try { return people.find(p => p.id === sessionStorage.getItem('jom-kurus:session')); } catch { return null; }
}
function renderHome() {
  $('home-category').value = $('category').value;
  const ranked = leaderboard(people.filter(p => (p.category || 'Dewasa') === $('home-category').value));
  $('home-podium').replaceChildren(...[...$('podium').children].map(node => node.cloneNode(true)));
  $('home-empty').hidden = ranked.length > 0;
  const session = currentSession();
  $('session-button').textContent = session ? 'Log Keluar' : 'Log Masuk';
  $('session-button').setAttribute('aria-label', session ? `Logout ${session.name}` : 'Login peserta');
  for (const id of ['activity-person','profile-person','login-person']) fillPeople(id, $(id).value || session?.id || '');
  renderProfile();
  renderSidebar();
  try { renderActivities(); } catch(error) { $('activity-gallery').replaceChildren(element('p',error.message,'hint')); }
  try { renderSponsors(); } catch(error) { $('sponsor-list').replaceChildren(element('p',error.message,'hint')); }
  const records = people.flatMap(person => person.entries.slice(1).map(entry => ({name:person.name,...entry}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  $('notification-count').textContent = records.length;
  $('notification-list').replaceChildren();
  if (!records.length) $('notification-list').append(element('p','Belum ada kemas kini berat.','hint'));
  records.forEach(record => {
    const card = element('article',undefined,'notification-card');
    card.append(element('h3',`${record.name} · rekod berat`),element('p',`${record.date} — ${number(record.weight)} kg`));
    $('notification-list').append(card);
  });
}
$('home-category').addEventListener('change',()=>{ $('category').value=$('home-category').value; selected=null; render(); });
$('session-button').addEventListener('click',()=>{
  if (currentSession()) { sessionStorage.removeItem('jom-kurus:session'); renderHome(); notice('Sesi profil ditamatkan. Data peranti dikekalkan.'); }
  else { fillPeople('login-person'); $('login-dialog').showModal(); }
});
$('close-login').addEventListener('click',()=>$('login-dialog').close());
$('login-form').addEventListener('submit',event=>{
  event.preventDefault();const person=people.find(p=>p.id===$('login-person').value);
  if(!person)return;
  try { sessionStorage.setItem('jom-kurus:session',person.id); $('login-dialog').close(); $('profile-person').value=person.id;renderHome();location.hash='profile';notice(`Selamat datang, ${person.name}. Sesi profil peranti ini aktif.`); }
  catch { notice('Pelayar tidak membenarkan penyimpanan sesi.',true); }
});
function renderProfile() {
  const person=people.find(p=>p.id===$('profile-person').value), root=$('profile-summary');root.replaceChildren();
  $('profile-name').value=person?.name||'';$('profile-height').value=person?.height??'';
  $('profile-target').value=person?.targetWeight??'';
  $('profile-target').disabled=!person || person.category==='Junior';
  $('profile-target-hint').textContent=person?.category==='Junior'?'Sasaran penurunan berat dewasa tidak digunakan untuk Junior.':'Sasaran peribadi dewasa; mestilah di bawah berat awal. Dapatkan panduan profesional jika perlu.';
  $('open-personal-progress').disabled=!person;
  if(!person){root.textContent='Pilih peserta atau gunakan Login untuk membuka profil.';return;}
  const m=metrics(person),result=bmi(person);
  const heading=element('div',undefined,'profile-heading'),avatar=element('span',person.name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toLocaleUpperCase('ms'),'profile-avatar');
  const identity=element('div');identity.append(element('strong',person.name),element('p',`${person.category||'Dewasa'} · ${person.entries.length} rekod berat`));heading.append(avatar,identity);root.append(heading);
  const stats=element('div',undefined,'profile-stat-grid');
  for(const [label,value] of [['Berat awal',`${number(m.initial)} kg`],['Terkini',`${number(m.current)} kg`],['Sasaran',person.targetWeight?`${number(person.targetWeight)} kg`:'Belum diisi']]){const card=element('div');card.append(element('small',label),element('strong',value));stats.append(card);}
  root.append(stats,element('p',result?`BMI ${number(result.value)} · ${result.category}`:'Isi tinggi untuk melihat BMI.'));
  const goal=targetProgress(person);if(goal!==null)root.append(element('p',`${number(goal)}% daripada sasaran peribadi dicapai.`));
}
$('profile-person').addEventListener('change',()=>{renderProfile();renderSidebar();});
$('profile-form').addEventListener('submit',event=>{
  event.preventDefault();const person=people.find(p=>p.id===$('profile-person').value);if(!person){notice('Pilih peserta dahulu.',true);return;}
  const name=$('profile-name').value.trim(),next={...person,name};
  if($('profile-height').value!=='')next.height=Number($('profile-height').value);else delete next.height;
  if($('profile-target').value!=='' && person.category!=='Junior') next.targetWeight=Number($('profile-target').value);else delete next.targetWeight;
  if(!validateParticipant(next)){notice('Semak nama, tinggi (80–250 cm) dan sasaran dewasa (20 kg hingga kurang daripada berat awal).',true);return;}
  if(people.some(p=>p.id!==person.id&&p.name.toLocaleLowerCase('ms')===name.toLocaleLowerCase('ms'))){notice('Nama peserta ini sudah digunakan.',true);return;}
  if(save(people.map(p=>p.id===person.id?next:p)))notice('Profil peserta dikemas kini.');
});
$('open-personal-progress').addEventListener('click',()=>{
  selected=$('profile-person').value;const person=people.find(p=>p.id===selected);if(!person)return;
  $('category').value=person.category||'Dewasa';render();$('participant').value=selected;renderWeekOptions();location.hash='progress';
});
function renderActivities() {
  const root=$('activity-gallery');root.replaceChildren();const activities=readList('jom-kurus:activities:v1');
  $('carousel-controls').hidden = activities.length === 0;
  if(!activities.length){const empty=element('div',undefined,'gallery-empty');empty.append(element('strong','Aktiviti anda bermula di sini'),element('p','Kongsi gambar senaman, berjalan atau menu sihat. Tiada gambar peserta ditambah tanpa upload.'));root.append(empty);updateCarousel(true);return;}
  for(const activity of [...activities].reverse()){
    if(!activity || typeof activity.data!=='string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(activity.data))continue;
    const card=element('figure',undefined,'activity-card'),image=element('img');image.src=activity.data;image.alt=activity.caption;image.loading='lazy';
    const person=people.find(p=>p.id===activity.personId);card.append(image,element('figcaption',activity.caption),element('p',`${person?.name||'Peserta terdahulu'} · ${activity.date}`));
    const remove=element('button','Padam gambar','secondary');remove.type='button';remove.addEventListener('click',()=>{
      if(!confirm('Padam gambar aktiviti ini?'))return;
      try{localStorage.setItem('jom-kurus:activities:v1',JSON.stringify(activities.filter(a=>a.id!==activity.id)));renderActivities();}catch{notice('Gagal memadam gambar.',true);}
    });card.append(remove);root.append(card);
  }
  updateCarousel(true);
}
$('activity-form').addEventListener('submit',async event=>{
  event.preventDefault();const submit=$('activity-form').querySelector('button[type="submit"]');submit.disabled=true;
  try{
    const person=people.find(p=>p.id===$('activity-person').value),file=$('activity-photo').files[0],caption=$('activity-caption').value.trim();
    if(!person||!caption)throw Error('Pilih peserta dan isi kapsyen.');
    submit.textContent='Memproses gambar…';
    const image=await prepareActivityImage(file);
    const activities=readList('jom-kurus:activities:v1');if(activities.length>=8)throw Error('Galeri sudah mempunyai 8 gambar. Padam gambar lama dahulu.');
    activities.push({id:crypto.randomUUID(),personId:person.id,caption,date:today(),...image,originalSize:file.size});
    localStorage.setItem('jom-kurus:activities:v1',JSON.stringify(activities));$('activity-form').reset();carouselIndex=0;renderActivities();notice('Gambar aktiviti berjaya disimpan.');
  }catch(error){notice(error.name==='QuotaExceededError'?'Ruang pelayar penuh. Gambar belum disimpan.':error.message,true);}
  finally{submit.disabled=false;submit.textContent='Kongsi aktiviti';}
});
function renderSponsors(){
  const root=$('sponsor-list');root.replaceChildren();const sponsors=readList('jom-kurus:sponsors:v1');
  if(!sponsors.length){root.append(element('p','Belum ada penaja berdaftar.','hint'));return;}
  for(const sponsor of sponsors){
    const card=element('article',undefined,'sponsor-card');card.append(element('h3',sponsor.name));
    if(sponsor.url){try{const url=new URL(sponsor.url);if(['https:','http:'].includes(url.protocol)){const link=element('a','Laman web penaja');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}}catch{}}
    const remove=element('button','Padam','secondary');remove.type='button';remove.addEventListener('click',()=>{if(!confirm('Padam penaja ini?'))return;try{localStorage.setItem('jom-kurus:sponsors:v1',JSON.stringify(sponsors.filter(s=>s.id!==sponsor.id)));renderSponsors();}catch{notice('Gagal menyimpan perubahan.',true);}});card.append(element('p',''),remove);root.append(card);
  }
}
$('sponsor-form').addEventListener('submit',event=>{
  event.preventDefault();try{
    const name=$('sponsor-name').value.trim(),raw=$('sponsor-url').value.trim();if(!name)throw Error('Isi nama penaja.');let url='';if(raw){const parsed=new URL(raw);if(!['https:','http:'].includes(parsed.protocol))throw Error('Gunakan URL https atau http.');url=parsed.href;}
    const sponsors=readList('jom-kurus:sponsors:v1');sponsors.push({id:crypto.randomUUID(),name,url});localStorage.setItem('jom-kurus:sponsors:v1',JSON.stringify(sponsors));$('sponsor-form').reset();renderSponsors();notice('Penaja disimpan.');
  }catch(error){notice(error.message,true);}
});

function renderSidebar() {
  const session=currentSession(),person=session || people.find(p=>p.id===$('profile-person').value) || people.find(p=>p.id===selected);
  $('sidebar-profile').hidden=!session;
  const initials = p => p.name.trim().split(/\s+/).map(word=>word[0]).slice(0,2).join('').toLocaleUpperCase('ms');
  if(session){$('sidebar-avatar').textContent=initials(session);$('sidebar-name').textContent=session.name;$('sidebar-category').textContent=`${session.category||'Dewasa'} · sesi aktif`;}
  $('mini-avatar').textContent=person?initials(person):'?';$('mini-name').textContent=person?.name||'Pilih profil';$('mini-category').textContent=person?`${person.category||'Dewasa'} · ${session?'sesi aktif':'profil dipilih'}`:'Tiada sesi aktif';
  $('sidebar-session').textContent=session?'Log Keluar':'Log Masuk';
  const goal=person?targetProgress(person):null;
  $('goal-progress').hidden=goal===null;$('goal-progress').value=goal??0;
  $('goal-label').textContent=goal===null?'Tetapkan sasaran dewasa dalam Profile.':`Sasaran ${number(person.targetWeight)} kg · ${number(goal)}%`;
  $('goal-detail').textContent=person?.category==='Junior'?'Pertumbuhan Junior memerlukan penilaian profesional.':person?`Berat terkini ${number(metrics(person).current)} kg`:'';
  const next=nextWeighIn(person);
  $('weigh-reminder-text').textContent=!next?'Pilih profil untuk melihat rekod.':next.days<0?`Rekod terakhir ${person.entries.at(-1).date}. Semak jadual cabaran.`:next.days===0?'Cadangan timbang: hari ini.':`${next.days} hari lagi · ${next.date}`;
}
$('sidebar-session').addEventListener('click',()=>$('session-button').click());
function updateCarousel(reset=false) {
  const cards=[...$('activity-gallery').querySelectorAll('.activity-card')];
  carouselIndex=cards.length?Math.max(0,Math.min(carouselIndex,cards.length-1)):0;
  $('carousel-controls').hidden=!cards.length;
  if (cards.length < 2 && carouselTimer) { clearInterval(carouselTimer); carouselTimer=null; $('slide-play').textContent='Mainkan slaid'; $('slide-play').setAttribute('aria-pressed','false'); }
  $('slide-prev').disabled=cards.length<2;$('slide-next').disabled=cards.length<2;$('slide-play').disabled=cards.length<2;
  $('carousel-dots').replaceChildren();
  cards.forEach((card,index)=>{
    card.setAttribute('aria-label',`Gambar ${index+1} daripada ${cards.length}`);
    const dot=element('button',undefined,'carousel-dot');dot.type='button';dot.setAttribute('aria-label',`Lihat gambar ${index+1}`);dot.setAttribute('aria-pressed',String(index===carouselIndex));dot.addEventListener('click',()=>{carouselIndex=index;updateCarousel();});$('carousel-dots').append(dot);
  });
  const gallery=$('activity-gallery');gallery.scrollTo({left:carouselIndex*gallery.clientWidth,behavior:reset||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function moveCarousel(delta) {
  const count=$('activity-gallery').querySelectorAll('.activity-card').length;
  if(!count)return;carouselIndex=(carouselIndex+delta+count)%count;updateCarousel();
}
$('slide-prev').addEventListener('click',()=>moveCarousel(-1));$('slide-next').addEventListener('click',()=>moveCarousel(1));
$('slide-play').addEventListener('click',()=>{
  if(carouselTimer){clearInterval(carouselTimer);carouselTimer=null;}
  else carouselTimer=setInterval(()=>{if(!document.hidden && !$('page-home').hidden)moveCarousel(1);},5000);
  $('slide-play').textContent=carouselTimer?'Jeda slaid':'Mainkan slaid';$('slide-play').setAttribute('aria-pressed',String(!!carouselTimer));
});
addEventListener('resize',()=>updateCarousel(true));

$('activity-gallery').addEventListener('scrollend',()=>{
  const gallery=$('activity-gallery'),count=gallery.querySelectorAll('.activity-card').length;
  if(!count || !gallery.clientWidth)return;
  carouselIndex=Math.max(0,Math.min(count-1,Math.round(gallery.scrollLeft/gallery.clientWidth)));
  [...$('carousel-dots').children].forEach((dot,index)=>dot.setAttribute('aria-pressed',String(index===carouselIndex)));
});
