import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { parsePlanWorkbook, semestersOfCourse, buildWeekGrid, cellLabel } from './planParser.js';
import { DAYS_OF_WEEK, TIME_SLOTS } from './data.js';

const DEFAULT_FILE = `${import.meta.env.BASE_URL}S_BTS_2024_ishchi_oquv_reja_2026-2027.xlsx`;
const STORAGE_KEY = 'planList.v1';
const COLORS = ['#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#ede9fe', '#ffedd5', '#cffafe', '#fee2e2', '#e0e7ff', '#d1fae5'];

const planKey = (p) => `${p.code}|${p.course}|${p.form}`;
const planTitle = (p) => `${p.code} ${p.direction} — ${p.course}-kurs${p.form ? ` (${p.form})` : ''}`;
// kuzgi = kursning 1-semestri (toq), bahorgi = 2-semestri (juft)
const semesterFor = (p, season) => semestersOfCourse(p.course)[season === 'fall' ? 0 : 1];

function loadStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function Cell({ cell, colorOf }) {
  if (cell?.split) {
    const [a, b] = cell.split;
    const ca = colorOf.get(a.no);
    const cb = b ? colorOf.get(b.no) : '#fff';
    return (
      <td
        className="border p-0 align-top h-20"
        style={{ background: `linear-gradient(to top left, transparent calc(50% - 1.5px), #dc2626 calc(50% - 1.5px), #dc2626 calc(50% + 1.5px), transparent calc(50% + 1.5px)), linear-gradient(to top left, ${cb} 50%, ${ca} 50%)` }}
      >
        <div className="relative h-full min-h-[4.5rem] text-[11px] leading-tight font-semibold">
          <div className="absolute top-1 left-1 right-[35%]">{a.name} <span className="font-normal">(1 soat)</span></div>
          {b && <div className="absolute bottom-1 right-1 left-[35%] text-right">{b.name} <span className="font-normal">(1 soat)</span></div>}
        </div>
      </td>
    );
  }
  return (
    <td className="border p-1.5 align-top h-20" style={{ background: cell ? colorOf.get(cell.no) : undefined }}>
      {cell && <span className="font-semibold">{cell.name}</span>}
      {cell && <div className="text-[10px] text-gray-600">2 soat</div>}
    </td>
  );
}

export default function PlanScheduler() {
  const [plans, setPlans] = useState(loadStored);
  const [season, setSeason] = useState('fall');
  const [selected, setSelected] = useState(null); // planKey
  const [week, setWeek] = useState(1);
  const [report, setReport] = useState([]); // yuklash natijasi
  const [filter, setFilter] = useState('');

  // saqlash
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {
      setReport((r) => [{ name: 'Saqlash', ok: false, msg: "Brauzer xotirasi to'ldi — rejalar saqlanmadi" }, ...r]);
    }
  }, [plans]);

  // bo'sh bo'lsa standart BTS rejasini yuklash
  useEffect(() => {
    if (plans.length) return;
    fetch(DEFAULT_FILE)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((buf) => {
        const p = { ...parsePlanWorkbook(buf), fileName: 'S_BTS_2024_ishchi_oquv_reja_2026-2027.xlsx' };
        setPlans([p]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const rep = [];
    const parsed = [];
    for (const f of files) {
      try {
        const p = { ...parsePlanWorkbook(await f.arrayBuffer()), fileName: f.name };
        parsed.push(p);
        rep.push({ name: f.name, ok: true, msg: planTitle(p) });
      } catch (err) {
        rep.push({ name: f.name, ok: false, msg: err.message });
      }
    }
    setPlans((old) => {
      const map = new Map(old.map((p) => [planKey(p), p]));
      parsed.forEach((p) => map.set(planKey(p), p)); // bir xil yo'nalish+kurs+shakl yangilanadi, qolganlari saqlanadi
      return [...map.values()];
    });
    setReport(rep);
    if (parsed[0]) setSelected(planKey(parsed[0]));
  };

  const removePlan = (key) => {
    setPlans((old) => old.filter((p) => planKey(p) !== key));
    if (selected === key) setSelected(null);
  };

  const clearAll = () => {
    if (window.confirm("Barcha yuklangan o'quv rejalar o'chirilsinmi?")) {
      setPlans([]);
      setSelected(null);
      setReport([]);
    }
  };

  // Hamma reja uchun jadval bir vaqtda hisoblanadi
  const all = useMemo(
    () =>
      plans.map((p) => {
        const sem = semesterFor(p, season);
        return { plan: p, key: planKey(p), sem, weeks: p.weeks[sem] || 0, res: buildWeekGrid(p.subjects, sem) };
      }),
    [plans, season]
  );

  const current = all.find((a) => a.key === selected) || all[0];
  const colorOf = useMemo(() => {
    const m = new Map();
    current?.res.list.forEach((s, i) => m.set(s.no, COLORS[i % COLORS.length]));
    return m;
  }, [current]);

  const visible = all.filter((a) => planTitle(a.plan).toLowerCase().includes(filter.toLowerCase()));
  const problems = all.filter((a) => a.res.unplaced > 0 || a.res.list.length === 0).length;

  const gridAoa = (a) => {
    const { plan, sem, weeks, res } = a;
    const aoa = [
      [`${planTitle(plan)}, ${sem}-semestr`],
      [`Auditoriya haftalari: ${weeks} (har haftada bir xil joylashuv)`],
      [],
      ['Para / Kun', ...DAYS_OF_WEEK.map((d) => d.name)],
    ];
    TIME_SLOTS.forEach((t, si) => aoa.push([`${t.name} (${t.time})`, ...DAYS_OF_WEEK.map((_, di) => cellLabel(res.grid[di][si]))]));
    return aoa;
  };

  const sheetName = (a, used) => {
    let base = `${a.plan.code}-${a.plan.course}k${a.plan.form ? '-' + a.plan.form.slice(0, 4) : ''}`.replace(/[\\/?*[\]:]/g, '');
    let name = base.slice(0, 31);
    let i = 2;
    while (used.has(name)) name = `${base.slice(0, 28)}_${i++}`;
    used.add(name);
    return name;
  };

  const exportAll = () => {
    const wb = XLSX.utils.book_new();
    const used = new Set(['Umumiy']);
    const summary = [['Yo\'nalish kodi', 'Yo\'nalish', 'Kurs', 'Shakl', 'Semestr', 'Haftalar', 'Fanlar', 'Haftasiga katak', 'Holat']];
    const sheets = all.map((a) => {
      const name = sheetName(a, used);
      summary.push([a.plan.code, a.plan.direction, a.plan.course, a.plan.form, a.sem, a.weeks, a.res.list.length, a.res.totalCells, a.res.unplaced ? `${a.res.unplaced} katak sig'madi` : 'OK']);
      return { name, ws: XLSX.utils.aoa_to_sheet(gridAoa(a)) };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Umumiy');
    sheets.forEach((s) => XLSX.utils.book_append_sheet(wb, s.ws, s.name));
    XLSX.writeFile(wb, `Dars_jadvallari_${season === 'fall' ? 'kuzgi' : 'bahorgi'}_${all.length}_guruh.xlsx`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white border rounded p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[260px]">
          <div className="font-bold text-blue-900">O'quv rejalardan bir vaqtda ko'p guruhga dars jadvali</div>
          <div className="text-xs text-gray-600">
            Istalgancha (100 va undan ko'p) o'quv reja Excelini bir vaqtda yuklang. Har bir reja bitta guruh sifatida saqlanadi,
            yangisi eskisini o'chirmaydi. 1 katak = 2 soat; toq soatlar surat/maxraj shaklida juftlanadi.
          </div>
        </div>
        <label className="cursor-pointer bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded">
          O'quv rejalarni yuklash (.xlsx, ko'p fayl)
          <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={onUpload} />
        </label>
      </div>

      {report.length > 0 && (
        <div className="bg-white border rounded p-3 text-sm max-h-48 overflow-auto">
          <div className="font-semibold mb-1">
            Yuklash natijasi: {report.filter((r) => r.ok).length} ta muvaffaqiyatli, {report.filter((r) => !r.ok).length} ta xato
          </div>
          {report.filter((r) => !r.ok).map((r, i) => (
            <div key={i} className="text-red-700">✗ {r.name}: {r.msg}</div>
          ))}
        </div>
      )}

      {plans.length === 0 && <div className="bg-amber-50 border border-amber-300 p-3 rounded text-sm">Hali o'quv reja yuklanmagan.</div>}

      {plans.length > 0 && (
        <div className="bg-white border rounded p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Semestr:</span>
            {[['fall', 'Kuzgi (kursning 1-semestri)'], ['spring', 'Bahorgi (kursning 2-semestri)']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => { setSeason(v); setWeek(1); }}
                className={`px-3 py-1 rounded border text-sm font-semibold ${season === v ? 'bg-blue-700 text-white' : 'bg-white text-blue-800'}`}
              >
                {l}
              </button>
            ))}
            <span className="ml-2 text-sm bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
              <b>{all.length}</b> ta guruh uchun jadval tayyor{problems > 0 && <span className="text-red-600"> • {problems} tasida muammo</span>}
            </span>
            <button onClick={exportAll} className="ml-auto bg-emerald-700 text-white text-sm font-semibold px-3 py-1.5 rounded">
              Hammasini Excelga yuklab olish ({all.length} varaq)
            </button>
            <button onClick={clearAll} className="text-red-600 text-sm border border-red-300 px-3 py-1.5 rounded">Hammasini o'chirish</button>
          </div>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Qidirish: yo'nalish, kod, kurs..."
            className="border rounded px-2 py-1 text-sm w-full max-w-sm"
          />

          <div className="overflow-auto max-h-80 border rounded">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-100">
                <tr className="text-left">
                  <th className="border p-1.5">Yo'nalish</th>
                  <th className="border p-1.5">Kurs</th>
                  <th className="border p-1.5">Shakl</th>
                  <th className="border p-1.5">Sem.</th>
                  <th className="border p-1.5">Haftalar</th>
                  <th className="border p-1.5">Fanlar</th>
                  <th className="border p-1.5">Katak/hafta</th>
                  <th className="border p-1.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr
                    key={a.key}
                    onClick={() => { setSelected(a.key); setWeek(1); }}
                    className={`cursor-pointer hover:bg-blue-50 ${current?.key === a.key ? 'bg-blue-100' : ''}`}
                  >
                    <td className="border p-1.5">{a.plan.code} {a.plan.direction}</td>
                    <td className="border p-1.5 text-center">{a.plan.course}</td>
                    <td className="border p-1.5">{a.plan.form}</td>
                    <td className="border p-1.5 text-center">{a.sem}</td>
                    <td className="border p-1.5 text-center">{a.weeks}</td>
                    <td className="border p-1.5 text-center">{a.res.list.length}</td>
                    <td className={`border p-1.5 text-center ${a.res.unplaced ? 'text-red-600 font-bold' : ''}`}>{a.res.totalCells}{a.res.unplaced ? ' ⚠' : ''}</td>
                    <td className="border p-1.5 text-center">
                      <button onClick={(e) => { e.stopPropagation(); removePlan(a.key); }} className="text-red-600 text-xs">o'chirish</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {current && (
        <>
          <div className="bg-white border rounded p-4 overflow-x-auto">
            <div className="font-semibold mb-1">{planTitle(current.plan)}</div>
            <div className="text-xs text-gray-500 mb-2">
              {current.plan.fileName} • {current.sem}-semestr • auditoriya haftalari: <b>{current.weeks}</b>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border p-1.5">№</th>
                  <th className="border p-1.5">Fan</th>
                  <th className="border p-1.5">Blok</th>
                  <th className="border p-1.5">Haftalik soat</th>
                  <th className="border p-1.5">Haftasiga katak</th>
                </tr>
              </thead>
              <tbody>
                {current.res.list.map((s) => (
                  <tr key={s.no}>
                    <td className="border p-1.5">{s.no}</td>
                    <td className="border p-1.5" style={{ background: colorOf.get(s.no) }}>{s.name}</td>
                    <td className="border p-1.5">{s.block}</td>
                    <td className="border p-1.5 text-center">{s.perWeek}</td>
                    <td className="border p-1.5 text-center font-bold">{s.full}{s.half ? ' + ½' : ''}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="border p-1.5" colSpan={3}>Jami haftasiga</td>
                  <td className="border p-1.5 text-center">{current.res.list.reduce((a, s) => a + s.perWeek, 0)}</td>
                  <td className="border p-1.5 text-center">{current.res.totalCells}</td>
                </tr>
              </tbody>
            </table>
            {current.res.unplaced > 0 && (
              <div className="mt-2 text-red-600 text-sm">Diqqat: {current.res.unplaced} ta katak sig'madi (haftada 30 kataktan ortiq).</div>
            )}
            {current.res.list.length === 0 && <div className="mt-2 text-red-600 text-sm">Bu semestrda fan topilmadi.</div>}
          </div>

          <div className="bg-white border rounded p-4 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-semibold">Hafta:</span>
              {Array.from({ length: current.weeks }, (_, i) => i + 1).map((w) => (
                <button key={w} onClick={() => setWeek(w)} className={`px-3 py-1 rounded border text-sm ${week === w ? 'bg-emerald-600 text-white' : 'bg-white'}`}>
                  {w}-hafta
                </button>
              ))}
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1.5 w-28">Para</th>
                  {DAYS_OF_WEEK.map((d) => <th key={d.id} className="border p-1.5">{d.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((t, si) => (
                  <tr key={t.slot}>
                    <td className="border p-1.5 text-xs"><b>{t.name}</b><br />{t.time}</td>
                    {DAYS_OF_WEEK.map((d, di) => <Cell key={d.id} cell={current.res.grid[di][si]} colorOf={colorOf} />)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-gray-500 mt-2">
              Haftalik soat semestr davomida o'zgarmaydi, shuning uchun {current.weeks} haftaning har birida bir xil joylashuv.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
