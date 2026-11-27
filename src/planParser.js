import * as XLSX from 'xlsx';

/**
 * Ishchi o'quv reja Excel faylini (birinchi varaq) o'qiydi.
 * - Yo'nalish va kursni sarlavhadan topadi ("60110400 - Boshlang'ich ta'lim 3-kurs ...")
 * - Semestr ustunlarini ("Semestrlar" 1..10) va semestrdagi auditoriya haftalari sonini topadi
 * - Har bir fanning semestrlar bo'yicha HAFTALIK soatini o'qiydi
 */
export function parsePlanWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const str = (v) => String(v ?? '').trim();

  // 1. Yo'nalish va kurs
  let direction = '';
  let code = '';
  let course = null;
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    for (const cell of rows[r]) {
      const m = str(cell).match(/(\d{8})\s*[–—-]\s*([^\n]+)\n?\s*(\d)-kurs/);
      if (m) {
        code = m[1];
        direction = m[2].trim();
        course = Number(m[3]);
      }
    }
  }

  // 1b. Ta'lim shakli (Sirtqi / Kunduzgi ...)
  let form = '';
  for (let r = 0; r < Math.min(rows.length, 30) && !form; r++) {
    if (rows[r].some((c) => /^Ta.lim shakli/i.test(str(c)))) {
      const vals = rows[r].map(str).filter((v) => v && !/^Ta.lim shakli/i.test(v) && v !== '—');
      form = vals[vals.length - 1] || '';
    }
  }

  // 2. Semestr raqamlari qatori (birinchi blok = soatlar taqsimoti)
  let semRow = -1;
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].some((c) => str(c) === 'Semestrlar')) {
      semRow = r + 1;
      break;
    }
  }
  if (semRow < 0) throw new Error("'Semestrlar' qatori topilmadi: bu o'quv reja fayli emas.");
  const semCol = {}; // semestr raqami -> ustun indeksi
  rows[semRow].forEach((v, c) => {
    const n = Number(v);
    if (v !== '' && Number.isInteger(n) && n >= 1 && n <= 10 && semCol[n] === undefined) semCol[n] = c;
  });

  // 3. Semestrdagi auditoriya haftalari soni
  let weeksRow = -1;
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].some((c) => /auditoriya mash/i.test(str(c)) && /hafta/i.test(str(c)))) {
      weeksRow = r + 1;
      break;
    }
  }
  if (weeksRow < 0) throw new Error("Semestrdagi auditoriya haftalari soni topilmadi.");
  const weeks = {};
  Object.entries(semCol).forEach(([sem, c]) => {
    weeks[sem] = Number(rows[weeksRow][c]) || 0;
  });

  // 4. Fanlar: tartib raqami "1.1", "2.3" ko'rinishida
  const subjects = [];
  for (let r = semRow; r < rows.length; r++) {
    const row = rows[r];
    const no = str(row[0]);
    if (!/^\d+\.\d+$/.test(no) || no.endsWith('.00')) continue;
    const name = str(row[5]);
    if (!name) continue;
    const hours = {};
    Object.entries(semCol).forEach(([sem, c]) => {
      const h = Number(row[c]);
      if (h > 0) hours[sem] = h;
    });
    subjects.push({
      no,
      code: str(row[2]),
      name,
      block: no.startsWith('2.') ? 'Tanlov' : 'Majburiy',
      hours, // { semestr: haftalik soat }
    });
  }

  const semesters = Object.keys(semCol).map(Number).sort((a, b) => a - b);
  if (!course) throw new Error("Kurs aniqlanmadi (sarlavhada 'N-kurs' topilmadi).");
  if (!subjects.length) throw new Error("Fanlar topilmadi.");
  return { direction, code, course, form, semesters, weeks, subjects };
}

/** Kursga tegishli semestrlar: 1-kurs -> 1,2; 3-kurs -> 5,6 */
export const semestersOfCourse = (course) => [course * 2 - 1, course * 2];

/**
 * Bir haftalik jadval: 1 katak = 2 soat.
 * Juft soat: hours/2 ta to'liq katak. Toq soat: floor(hours/2) ta to'liq katak + 1 soat qoldiq.
 * Qoldiq (1 soatlik) ikki xil fan bo'yicha juftlanib, BITTA katakka surat/maxraj
 * shaklida (diagonal chiziq bilan bo'lingan) qo'yiladi: {split: [A, B]}.
 * Kunlar bo'yicha tekis taqsimlanadi, har kunda darslar oynasiz joylashadi.
 */
export function buildWeekGrid(subjects, semester, days = 6, slots = 5) {
  const list = subjects
    .filter((s) => s.hours[semester])
    .map((s) => {
      const perWeek = s.hours[semester];
      return { ...s, perWeek, full: Math.floor(perWeek / 2), half: perWeek % 2, cells: Math.ceil(perWeek / 2) };
    })
    .sort((a, b) => b.perWeek - a.perWeek);

  // Toq soatli fanlarning qoldiq soatlarini juftlash (surat/maxraj)
  const halves = list.filter((s) => s.half);
  const units = [];
  list.forEach((s) => {
    for (let k = 0; k < s.full; k++) units.push({ subjects: [s] });
  });
  const pool = [...halves];
  while (pool.length) {
    const a = pool.shift();
    const bi = pool.findIndex((x) => x.no !== a.no);
    if (bi >= 0) units.push({ subjects: [a, pool.splice(bi, 1)[0]], split: true });
    else units.push({ subjects: [a], split: true }); // juft topilmadi
  }

  const grid = Array.from({ length: days }, () => Array(slots).fill(null));
  const load = Array(days).fill(0);
  const used = new Map(); // fan -> ishlatilgan kunlar
  let unplaced = 0;

  for (const u of units) {
    let best = null;
    for (let d = 0; d < days; d++) {
      if (load[d] >= slots) continue;
      const clash = u.subjects.some((s) => used.get(s.no)?.has(d));
      const score = load[d] + (clash ? 100 : 0);
      if (!best || score < best.score) best = { d, score };
    }
    if (!best) {
      unplaced++;
      continue;
    }
    grid[best.d][load[best.d]++] = u.split ? { split: u.subjects } : u.subjects[0];
    u.subjects.forEach((s) => {
      if (!used.has(s.no)) used.set(s.no, new Set());
      used.get(s.no).add(best.d);
    });
  }
  return { grid, list, unplaced, totalCells: units.length };
}

/** Katak matni: oddiy fan nomi yoki "A / B" (surat/maxraj) */
export const cellLabel = (cell) =>
  !cell ? '' : cell.split ? cell.split.map((s) => s.name).join(' / ') : cell.name;
