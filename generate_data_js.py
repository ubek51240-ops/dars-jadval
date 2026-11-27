import json
import re

with open('parsed_sirtqi.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

# Load existing rooms from src/data.js
with open('src/data.js', 'r', encoding='utf-8') as f:
    orig_text = f.read()

m_rooms = re.search(r'export const INITIAL_ROOMS = (\[.*?\]);', orig_text, re.DOTALL)
rooms_json = m_rooms.group(1) if m_rooms else "[]"

# Clean teacher
def clean_teacher(t):
    if not t or t == 'None':
        return 'Vakant'
    t = t.strip()
    if 'Saidova Rayhon' in t:
        return 'Saidova Rayhon Bekmurodovna'
    if 'Bobokulov A' in t:
        return 'Boboqulov A.'
    if 'Axmedova D' in t or 'Ахмедова Д' in t:
        return 'Axmedova D.'
    if 'Камоlova Д' in t or 'Камоlova Д' in t or 'Камолова Д' in t:
        return 'Kamolova D.'
    if 'Саидов А' in t:
        return 'Saidov A.'
    if "Bo'ronova Nigora" in t or "Bo‘ronova Nigora" in t:
        return "Bo'ronova Nigora Umar qizi"
    return t

# 1. Departments
DEPARTMENTS = [
    {
        "id": "dep-ped",
        "name": "Pedagogika va ijtimoiy-gumanitar fanlar kafedrasi",
        "code": "PIF",
        "color": "#1e88e5"
    },
    {
        "id": "dep-it",
        "name": "Axborot texnologiyalari va matematika kafedrasi",
        "code": "ATM",
        "color": "#43a047"
    },
    {
        "id": "dep-econ",
        "name": "Iqtisodiyot va moliya kafedrasi",
        "code": "IMK",
        "color": "#f4511e"
    },
    {
        "id": "dep-eng",
        "name": "Muhandislik va texnika fanlari kafedrasi",
        "code": "MTF",
        "color": "#8e24aa"
    }
]

# 2. Majors mapping
MAJORS_DEF = [
    # Pedagogika & Gumanitar
    {"id": "m-tar", "name": "Tarix", "code": "60220300", "dep": "dep-ped", "prefix": "TARS"},
    {"id": "m-psi", "name": "Psixologiya (amaliy psixologiya)", "code": "60310900", "dep": "dep-ped", "prefix": "PSIS"},
    {"id": "m-bt", "name": "Boshlang'ich ta'lim", "code": "60110500", "dep": "dep-ped", "prefix": "BTS"},
    {"id": "m-mt", "name": "Maktabgacha ta'lim", "code": "60110200", "dep": "dep-ped", "prefix": "MTS"},
    {"id": "m-jm", "name": "Jismoniy madaniyat", "code": "60112200", "dep": "dep-ped", "prefix": "JMS"},
    {"id": "m-tjb", "name": "Tasviriy san'at va muhandislik grafikasi", "code": "60111200", "dep": "dep-ped", "prefix": "TJBAKS"},
    # IT & Math
    {"id": "m-am", "name": "Amaliy matematika", "code": "60540200", "dep": "dep-it", "prefix": "AMS"},
    {"id": "m-att", "name": "Axborot tizimlari va texnologiyalari", "code": "60610200", "dep": "dep-it", "prefix": "ATTS"},
    {"id": "m-di", "name": "Dasturiy injiniring", "code": "60610600", "dep": "dep-it", "prefix": "DIS"},
    # Iqtisodiyot & Moliya
    {"id": "m-iqt", "name": "Iqtisodiyot (tarmoqlar va sohalar bo'yicha)", "code": "60410100", "dep": "dep-econ", "prefix": "IQTS"},
    {"id": "m-mmt", "name": "Moliya va moliyaviy texnologiyalar", "code": "60410400", "dep": "dep-econ", "prefix": "MMTS"},
    {"id": "m-bux", "name": "Buxgalteriya hisobi va audit", "code": "60410200", "dep": "dep-econ", "prefix": "BUXS"},
    # Muhandislik
    {"id": "m-em", "name": "Elektr energetikasi (tarmoqlar bo'yicha)", "code": "60710600", "dep": "dep-eng", "prefix": "EMS"},
    {"id": "m-qm", "name": "Qurilish muhandisligi (bino va inshootlar)", "code": "60730300", "dep": "dep-eng", "prefix": "QMS"},
    {"id": "m-trl", "name": "Transport logistikasi (turlari bo'yicha)", "code": "60712500", "dep": "dep-eng", "prefix": "TRLS"},
    {"id": "m-tvm", "name": "Transport vositalari muhandisligi", "code": "60712700", "dep": "dep-eng", "prefix": "TVMS"}
]

MAJORS = [
    {
        "id": m["id"],
        "name": m["name"],
        "code": m["code"],
        "departmentId": m["dep"]
    }
    for m in MAJORS_DEF
]

def find_major_id(grp_name):
    # Prefiks guruh kodidagi "-<raqam><PREFIKS>-" qismi bilan aniq mos kelishi kerak:
    # aks holda "1-1MMTS-24" (Moliya) "MTS" (Maktabgacha) ga noto'g'ri tushib qoladi.
    clean_g = grp_name.upper().replace(' ', '')
    m_code = re.match(r'^\d+-\d+([A-Z]+)-\d+', clean_g)
    if m_code:
        for m in MAJORS_DEF:
            if m["prefix"] == m_code.group(1):
                return m["id"]
    for m in sorted(MAJORS_DEF, key=lambda x: -len(x["prefix"])):
        if m["prefix"] in clean_g:
            return m["id"]
    return "m-iqt"

# 3. Groups
from collections import defaultdict
groups_raw = defaultdict(list)
for d in raw_data:
    g = d.get('group')
    if g:
        groups_raw[g.strip().replace(' ', '')].append(d)

GROUPS = []
for g_code, rows in sorted(groups_raw.items()):
    orig_name = rows[0].get('group').strip()
    kurs = rows[0].get('kurs') or 3
    if str(kurs).upper() == "III": kurs = 3
    elif str(kurs).isdigit(): kurs = int(kurs)
    else: kurs = 3
    
    talaba = int(rows[0].get('talaba') or 25)
    maj_id = find_major_id(orig_name)
    
    GROUPS.append({
        "id": f"g-{g_code.lower()}",
        "majorId": maj_id,
        "year": kurs,
        "name": f"{orig_name} (Sirtqi)",
        "code": g_code,
        "studentCount": talaba,
        "language": "uz",
        "educationType": "sirtqi"
    })

# 4. Teachers
teachers_map = {}
for d in raw_data:
    t = clean_teacher(d.get('teacher'))
    if t not in teachers_map:
        t_id = "t-" + re.sub(r'[^a-zA-Z0-9]', '', t.lower())[:15]
        # Assign department
        grp = d.get('group') or ''
        maj_id = find_major_id(grp)
        dep_id = "dep-ped"
        for m in MAJORS_DEF:
            if m["id"] == maj_id:
                dep_id = m["dep"]
                break
                
        teachers_map[t] = {
            "id": t_id,
            "name": t,
            "departmentId": dep_id,
            "title": "O'qituvchi",
            "subjects": set(),
            "employmentType": "full",
            "stavka": 1.0,
            "maxHoursPerDay": 4,
            "maxHoursPerWeek": 24,
            "unavailableSlots": []
        }
    teachers_map[t]["subjects"].add(d.get('subject', '').strip())

TEACHERS = []
for t, info in sorted(teachers_map.items()):
    TEACHERS.append({
        "id": info["id"],
        "name": info["name"],
        "departmentId": info["departmentId"],
        "title": info["title"],
        "subjects": sorted(list(info["subjects"])),
        "employmentType": info["employmentType"],
        "stavka": info["stavka"],
        "maxHoursPerDay": info["maxHoursPerDay"],
        "maxHoursPerWeek": info["maxHoursPerWeek"],
        "unavailableSlots": []
    })

# 5. Curriculums
CURRICULUMS = []
seen_currs = set()
c_idx = 1

for g_code, rows in sorted(groups_raw.items()):
    orig_name = rows[0].get('group').strip()
    maj_id = find_major_id(orig_name)
    kurs = rows[0].get('kurs') or 3
    if str(kurs).upper() == "III": kurs = 3
    elif str(kurs).isdigit(): kurs = int(kurs)
    else: kurs = 3
    
    for r in rows:
        sub = r['subject'].strip()
        curr_key = (maj_id, kurs, sub)
        if curr_key in seen_currs:
            continue
        seen_currs.add(curr_key)
        
        t_name = clean_teacher(r['teacher'])
        t_id = teachers_map[t_name]["id"] if t_name in teachers_map else "t-vakant"
        
        m = int(r['maruza']) if r['maruza'] and str(r['maruza']).isdigit() else 0
        a = int(r['amaliy']) if r['amaliy'] and str(r['amaliy']).isdigit() else 0
        s = int(r['seminar']) if r['seminar'] and str(r['seminar']).isdigit() else 0
        l = int(r['lab']) if r['lab'] and str(r['lab']).isdigit() else 0
        total_aud = m + a + s + l
        
        h1 = int(r['h1']) if r.get('h1') and str(r['h1']).isdigit() else 0
        h2 = int(r.get('h2')) if r.get('h2') and str(r['h2']).isdigit() else 0
        h3 = int(r.get('h3')) if r.get('h3') and str(r['h3']).isdigit() else 0

        CURRICULUMS.append({
            "id": f"c-sirtqi-{c_idx}",
            "code": f"FAN-{c_idx:03d}",
            "majorId": maj_id,
            "year": kurs,
            "semester": "fall",
            "subjectName": sub,
            "credit": 4,
            "totalHours": total_aud * 3 if total_aud > 0 else 120,
            "independentHours": total_aud * 2 if total_aud > 0 else 60,
            "semesterLectureHours": m,
            "semesterPracticeHours": a,
            "semesterLabHours": l,
            "semesterSeminarHours": s,
            "lectureHours": m,
            "practiceHours": a,
            "labHours": l,
            "seminarHours": s,
            "hoursPerWeek": total_aud,
            "week1Hours": h1,
            "week2Hours": h2,
            "week3Hours": h3,
            "teacherId": t_id,
            "lectureTeacherId": t_id,
            "practiceTeacherId": t_id,
            "labTeacherId": t_id,
            "seminarTeacherId": t_id,
            "requiredRoomType": "lab" if l > 0 else ("lecture" if m > 0 and (a+s) == 0 else "practice")
        })
        c_idx += 1

print(f"Generated: {len(DEPARTMENTS)} depts, {len(MAJORS)} majors, {len(GROUPS)} groups, {len(TEACHERS)} teachers, {len(CURRICULUMS)} curriculums.")

# Construct src/data.js
js_content = f"""// ASMAN UNIVERSITETI / BAKALAVRIAT SIRTQI TA'LIM DATASET
// 2026-2027 O'quv yili Kuzgi semestr (3-kurs sirtqi dars jadvali)

export const INITIAL_DEPARTMENTS = {json.dumps(DEPARTMENTS, indent=2, ensure_ascii=False)};

export const INITIAL_MAJORS = {json.dumps(MAJORS, indent=2, ensure_ascii=False)};

export const INITIAL_COURSES = [1, 2, 3, 4];

export const WEEKS = Array.from({{ length: 3 }}, (_, i) => {{
  const weekNum = i + 1;
  return {{
    weekNumber: weekNum,
    name: `${{weekNum}}-hafta`,
    dateRange: `Hafta ${{weekNum}} (Sirtqi o'quv sessiyasi 2026-2027)`,
    parity: weekNum % 2 === 1 ? 'odd' : 'even',
    parityLabel: weekNum % 2 === 1 ? 'Toq hafta' : 'Juft hafta',
    module: 1,
    moduleLabel: 'Kuzgi sessiya'
  }};
}});

export const INITIAL_GROUPS = {json.dumps(GROUPS, indent=2, ensure_ascii=False)};

export const INITIAL_TEACHERS = {json.dumps(TEACHERS, indent=2, ensure_ascii=False)};

export const INITIAL_ROOMS = {rooms_json};

export const INITIAL_CURRICULUMS = {json.dumps(CURRICULUMS, indent=2, ensure_ascii=False)};

export const DAYS_OF_WEEK = [
  {{ "id": 1, "short": "Dush", "name": "Dushanba" }},
  {{ "id": 2, "short": "Sesh", "name": "Seshanba" }},
  {{ "id": 3, "short": "Chor", "name": "Chorshanba" }},
  {{ "id": 4, "short": "Pay", "name": "Payshanba" }},
  {{ "id": 5, "short": "Jum", "name": "Juma" }},
  {{ "id": 6, "short": "Shan", "name": "Shanba" }}
];

export const TIME_SLOTS = [
  {{ "slot": 1, "name": "1-para", "time": "08:30-09:50" }},
  {{ "slot": 2, "name": "2-para", "time": "10:00-11:20" }},
  {{ "slot": 3, "name": "3-para", "time": "11:30-12:50" }},
  {{ "slot": 4, "name": "4-para", "time": "13:30-14:50" }},
  {{ "slot": 5, "name": "5-para", "time": "15:00-16:20" }}
];
"""

with open('src/data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Saved cleanly to src/data.js")
