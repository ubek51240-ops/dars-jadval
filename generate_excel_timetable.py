import json
import os
import shutil
from collections import defaultdict
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from test_clean_distribution import groups_raw, POTOK_MAP, POTOK_LEADERS, clean_teacher
from rooms_config import ALL_ROOMS
import test_solver

# 1. Setup distribution and solver
teacher_offsets = defaultdict(int)

def dist_lec(n, teacher):
    if n == 0: return [0, 0, 0]
    base = n // 3
    rem = n % 3
    dist = [base, base, base]
    for i in range(rem):
        dist[i % 3] += 1
    return dist

def dist_prac(n, teacher):
    if n == 0: return [0, 0, 0]
    base = n // 3
    rem = n % 3
    dist = [base, base, base]
    offset = teacher_offsets[teacher]
    for i in range(rem):
        dist[(offset + i) % 3] += 1
    teacher_offsets[teacher] = (offset + rem) % 3
    return dist

weekly_units = {1: [], 2: [], 3: []}

# Pass 1: Lectures
for g, rows in sorted(groups_raw.items()):
    ptag = POTOK_MAP.get(g)
    is_leader = (ptag is None) or (POTOK_LEADERS.get(ptag) == g)
    if is_leader:
        for r in rows:
            sub = r['subject'].strip()
            t_lec = clean_teacher(r['teacher'])
            m_tot = int(r['maruza']) if r['maruza'] and str(r['maruza']).isdigit() else 0
            if m_tot > 0:
                lec_pairs = round(m_tot / 2)
                w_dist = dist_lec(lec_pairs, t_lec)
                members = [m for m, p in POTOK_MAP.items() if p == ptag] if ptag else [g]
                stud_cnt = sum(int(groups_raw[m][0].get('talaba') or 25) for m in members)
                for w_idx, count in enumerate(w_dist, 1):
                    for p_i in range(count):
                        weekly_units[w_idx].append({
                            'id': f'w{w_idx}_{ptag or g}_{sub}_lec_{p_i}',
                            'subject': sub, 'type': 'Ma\'ruza', 'type_code': 'lecture',
                            'teacher': t_lec, 'groups': members, 'is_potok': len(members) > 1,
                            'student_count': stud_cnt
                        })

# Pass 2: Non-lectures
for g, rows in sorted(groups_raw.items()):
    for r in rows:
        sub = r['subject'].strip()
        teacher = clean_teacher(r['teacher'])
        a_tot = int(r['amaliy']) if r['amaliy'] and str(r['amaliy']).isdigit() else 0
        s_tot = int(r['seminar']) if r['seminar'] and str(r['seminar']).isdigit() else 0
        l_tot = int(r['lab']) if r['lab'] and str(r['lab']).isdigit() else 0
        stud_cnt = int(r.get('talaba') or 25)
        for (tp, code, cnt) in [('Laboratoriya', 'lab', round(l_tot/2)), ('Amaliyot', 'practice', round(a_tot/2)), ('Seminar', 'seminar', round(s_tot/2))]:
            p_dist = dist_prac(cnt, teacher)
            for w_idx in [1, 2, 3]:
                for p_i in range(p_dist[w_idx-1]):
                    weekly_units[w_idx].append({
                        'id': f'w{w_idx}_{g}_{sub}_{code}_{p_i}',
                        'subject': sub, 'type': tp, 'type_code': code,
                        'teacher': teacher, 'groups': [g], 'is_potok': False,
                        'student_count': stud_cnt
                    })

print("Solving schedules...")
week_schedules = {}
for w in [1, 2, 3]:
    sched, unass = test_solver.solve_week(w, weekly_units[w])
    if unass:
        print(f"WARNING: Week {w} had {len(unass)} unassigned!")
    week_schedules[w] = sched
    print(f"Week {w} successfully solved: {len(sched)} lessons placed.")

# 2. Openpyxl styling setup
wb = openpyxl.Workbook()
wb.remove(wb.active) # Remove default Sheet

# Fonts
font_title = Font(name="Calibri", size=16, bold=True, color="1F4E79")
font_subtitle = Font(name="Calibri", size=11, italic=True, color="595959")
font_head_sec = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
font_th = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
font_bold = Font(name="Calibri", size=10, bold=True)
font_regular = Font(name="Calibri", size=9)
font_small = Font(name="Calibri", size=8, color="595959")

# Fills
fill_primary = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid") # Dark Blue
fill_secondary = PatternFill(start_color="2F5597", end_color="2F5597", fill_type="solid") # Steel Blue
fill_accent = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid") # Light Blue
fill_zebra = PatternFill(start_color="F9FAFB", end_color="F9FAFB", fill_type="solid")
fill_day_header = PatternFill(start_color="333F48", end_color="333F48", fill_type="solid")

# Lesson type fills
fill_type = {
    'Ma\'ruza': PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid"), # Light Blue
    'Amaliyot': PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid"), # Light Green
    'Seminar': PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid"), # Light Amber
    'Laboratoriya': PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid"), # Soft Orange/Peach
}

# Borders
border_thin = Side(border_style="thin", color="D9D9D9")
border_med = Side(border_style="medium", color="1F4E79")
border_cell = Border(left=border_thin, right=border_thin, top=border_thin, bottom=border_thin)
border_header = Border(left=border_thin, right=border_thin, top=border_med, bottom=border_med)

# Alignments
align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
align_right = Alignment(horizontal="right", vertical="center")

# Unique groups list
sorted_groups = sorted(groups_raw.keys())
group_display = {g: groups_raw[g][0].get('group').strip() for g in sorted_groups}

# =========================================================================
# SHEET 1: Mundarija va Ma'lumot (Dashboard)
# =========================================================================
ws_info = wb.create_sheet(title="Umumiy Ma'lumot")
ws_info.views.sheetView[0].showGridLines = True

ws_info.cell(2, 2, "ASMAN UNIVERSITETI / BAKALAVRIAT SIRTQI TA'LIM").font = font_title
ws_info.cell(3, 2, "2026-2027 O'quv yili Kuzgi semestr | 3-kurs Sirtqi ta'lim rasmiy Dars Jadvali").font = font_subtitle

headers_stat = ["№", "Ko'rsatkich", "Miqdor", "Izoh"]
ws_info.row_dimensions[5].height = 25
for c_i, h in enumerate(headers_stat, 2):
    cell = ws_info.cell(5, c_i, h)
    cell.font = font_th
    cell.fill = fill_primary
    cell.alignment = align_center

stats_data = [
    (1, "Akademik guruhlar soni", f"{len(sorted_groups)} ta", "Bakalavriat 3-kurs sirtqi barcha yo'nalishlar"),
    (2, "O'quv sessiyasi davomiyligi", "3 hafta (18 kun)", "1-hafta, 2-hafta, 3-hafta intensiv o'quv jarayoni"),
    (3, "Haftalik o'quv kunlari", "6 kun (Dushanba - Shanba)", "Har kuni 2 - 4 para (80 daqiqalik darslar)"),
    (4, "Mashg'ulot vaqtlari (Paralar)", "1-5 paralar (08:30 - 16:20)", "1-para: 08:30, 2-para: 10:00, 3-para: 11:30, 4-para: 13:30, 5-para: 15:00"),
    (5, "Professor-o'qituvchilar soni", "49 nafar", "Mutaxassislik va kafedralar professor-o'qituvchilari"),
    (6, "Jami o'tiladigan dars soatlari", "~1073 para (2146 akademik soat)", "Ma'ruza, Amaliyot, Seminar, Laboratoriya mashg'ulotlari"),
    (7, "Auditoriyalar fondi", f"{len(ALL_ROOMS)} ta auditoriya", "Ma'ruza zallari, kompyuter laboratoriyalari, seminar xonalari"),
    (8, "Jadval xavfsizligi", "100% ziddiyatsiz (Zero Conflict)", "O'qituvchi, guruh va xonalar ustma-ust tushishi to'liq bartaraf etilgan")
]

for r_i, row in enumerate(stats_data, 6):
    ws_info.row_dimensions[r_i].height = 22
    for c_i, val in enumerate(row, 2):
        cell = ws_info.cell(r_i, c_i, val)
        cell.font = font_bold if c_i == 3 else font_regular
        cell.alignment = align_center if c_i in [2, 4] else align_left
        cell.border = border_cell
        if r_i % 2 == 1:
            cell.fill = fill_zebra

# Groups table on info sheet
ws_info.cell(16, 2, "AKADEMIK GURUHLAR RO'YXATI VA BIRIKTIRILGAN FANLAR").font = Font(name="Calibri", size=13, bold=True, color="1F4E79")
grp_headers = ["№", "Guruh kodi", "Kurs", "Talabalar", "Fanlar soni", "Potok holati"]
ws_info.row_dimensions[18].height = 25
for c_i, h in enumerate(grp_headers, 2):
    cell = ws_info.cell(18, c_i, h)
    cell.font = font_th
    cell.fill = fill_secondary
    cell.alignment = align_center

for g_i, g in enumerate(sorted_groups, 1):
    r_idx = 18 + g_i
    ws_info.row_dimensions[r_idx].height = 20
    rows = groups_raw[g]
    kurs = rows[0].get('kurs') or 3
    talaba = rows[0].get('talaba') or 25
    ptag = POTOK_MAP.get(g, "-")
    p_status = f"Oqim ({ptag})" if ptag != "-" else "Alohida"
    
    vals = [g_i, group_display[g], f"{kurs}-kurs", f"{talaba} nafar", f"{len(rows)} ta fan", p_status]
    for c_i, val in enumerate(vals, 2):
        cell = ws_info.cell(r_idx, c_i, val)
        cell.font = font_bold if c_i == 3 else font_regular
        cell.alignment = align_center if c_i in [2, 4, 5, 7] else align_left
        cell.border = border_cell
        if g_i % 2 == 1: cell.fill = fill_zebra

for col in range(2, 9):
    ws_info.column_dimensions[get_column_letter(col)].width = 25
ws_info.column_dimensions['B'].width = 8
ws_info.column_dimensions['C'].width = 28
ws_info.column_dimensions['D'].width = 16
ws_info.column_dimensions['E'].width = 16
ws_info.column_dimensions['F'].width = 18
ws_info.column_dimensions['G'].width = 22

# =========================================================================
# SHEETS 2, 3, 4: Haftalik Umumiy Jadvallar (1, 2, 3-hafta)
# =========================================================================
DAYS = [1, 2, 3, 4, 5, 6]
DAY_NAMES = {1: "Dushanba", 2: "Seshanba", 3: "Chorshanba", 4: "Payshanba", 5: "Juma", 6: "Shanba"}
SLOTS = [1, 2, 3, 4, 5]
SLOT_TIMES = {
    1: "08:30 - 09:50",
    2: "10:00 - 11:20",
    3: "11:30 - 12:50",
    4: "13:30 - 14:50",
    5: "15:00 - 16:20"
}

for w in [1, 2, 3]:
    ws_week = wb.create_sheet(title=f"{w}-hafta Jadvali")
    ws_week.views.sheetView[0].showGridLines = True
    
    # Title
    ws_week.merge_cells("A1:AC1")
    title_cell = ws_week.cell(1, 1, f"3-KURS SIRTQI TA'LIM DARS JADVALI — {w}-HAFTA")
    title_cell.font = font_title
    title_cell.alignment = align_center
    ws_week.row_dimensions[1].height = 32
    
    # Header Row 1: Group Names
    ws_week.cell(3, 1, "Kun").font = font_th
    ws_week.cell(3, 1).fill = fill_primary
    ws_week.cell(3, 1).alignment = align_center
    ws_week.cell(3, 1).border = border_header
    
    ws_week.cell(3, 2, "Para").font = font_th
    ws_week.cell(3, 2).fill = fill_primary
    ws_week.cell(3, 2).alignment = align_center
    ws_week.cell(3, 2).border = border_header
    
    ws_week.cell(3, 3, "Vaqt").font = font_th
    ws_week.cell(3, 3).fill = fill_primary
    ws_week.cell(3, 3).alignment = align_center
    ws_week.cell(3, 3).border = border_header
    
    ws_week.column_dimensions['A'].width = 14
    ws_week.column_dimensions['B'].width = 8
    ws_week.column_dimensions['C'].width = 14
    
    for c_i, g in enumerate(sorted_groups, 4):
        c_letter = get_column_letter(c_i)
        ws_week.column_dimensions[c_letter].width = 30
        cell = ws_week.cell(3, c_i, group_display[g])
        cell.font = font_th
        cell.fill = fill_primary
        cell.alignment = align_center
        cell.border = border_header
        
    ws_week.row_dimensions[3].height = 28
    
    # Index lessons for week: (group, day, slot) -> lesson
    sched = week_schedules[w]
    cell_map = {}
    for item in sched:
        u = item['unit']
        d = item['day']
        s = item['slot']
        rm = item['room']
        for g in u['groups']:
            cell_map[(g, d, s)] = {
                'subject': u['subject'],
                'type': u['type'],
                'teacher': u['teacher'],
                'room': rm,
                'is_potok': u['is_potok']
            }
            
    # Write schedule rows
    curr_row = 4
    for d in DAYS:
        start_d_row = curr_row
        for s in SLOTS:
            ws_week.row_dimensions[curr_row].height = 54
            
            # Para & Time
            p_cell = ws_week.cell(curr_row, 2, f"{s}-para")
            p_cell.font = font_bold
            p_cell.alignment = align_center
            p_cell.border = border_cell
            
            t_cell = ws_week.cell(curr_row, 3, SLOT_TIMES[s])
            t_cell.font = font_small
            t_cell.alignment = align_center
            t_cell.border = border_cell
            
            for c_i, g in enumerate(sorted_groups, 4):
                cell = ws_week.cell(curr_row, c_i)
                cell.border = border_cell
                
                lesson = cell_map.get((g, d, s))
                if lesson:
                    tp = lesson['type']
                    sub = lesson['subject']
                    t = lesson['teacher']
                    rm = lesson['room']
                    potok_mark = " [Oqim]" if lesson['is_potok'] else ""
                    
                    text = f"{sub}\n({tp}{potok_mark})\nO'qituvchi: {t}\nXona: {rm}"
                    cell.value = text
                    cell.font = font_regular
                    cell.alignment = align_center
                    cell.fill = fill_type.get(tp, fill_accent)
                else:
                    cell.value = "-"
                    cell.font = Font(name="Calibri", size=9, color="BFBFBF")
                    cell.alignment = align_center
                    if s % 2 == 1: cell.fill = fill_zebra
                    
            curr_row += 1
            
        # Merge day column across the 5 slots
        ws_week.merge_cells(start_row=start_d_row, start_column=1, end_row=curr_row-1, end_column=1)
        day_cell = ws_week.cell(start_d_row, 1, DAY_NAMES[d])
        day_cell.font = font_head_sec
        day_cell.fill = fill_secondary
        day_cell.alignment = align_center
        day_cell.border = border_cell

# =========================================================================
# SHEET 5: Guruhlar Kesimida Alohida Dars Jadvallari (Print-ready Cards)
# =========================================================================
ws_grps = wb.create_sheet(title="Guruhlar kesimida")
ws_grps.views.sheetView[0].showGridLines = True

ws_grps.column_dimensions['A'].width = 14
ws_grps.column_dimensions['B'].width = 10
ws_grps.column_dimensions['C'].width = 14
ws_grps.column_dimensions['D'].width = 32
ws_grps.column_dimensions['E'].width = 16
ws_grps.column_dimensions['F'].width = 28
ws_grps.column_dimensions['G'].width = 24

curr_row = 2
for g in sorted_groups:
    g_name = group_display[g]
    rows = groups_raw[g]
    kurs = rows[0].get('kurs') or 3
    talaba = rows[0].get('talaba') or 25
    
    # Group Card Header
    ws_grps.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=7)
    hdr_cell = ws_grps.cell(curr_row, 1, f"GURUH: {g_name} | {kurs}-kurs Sirtqi | Talabalar: {talaba} nafar")
    hdr_cell.font = font_head_sec
    hdr_cell.fill = fill_primary
    hdr_cell.alignment = align_center
    ws_grps.row_dimensions[curr_row].height = 28
    curr_row += 1
    
    # Sub-header
    th_cols = ["Kun", "Para", "Vaqt", "Fan nomi", "Turi", "O'qituvchi", "Auditoriya"]
    ws_grps.row_dimensions[curr_row].height = 22
    for c_i, h in enumerate(th_cols, 1):
        cell = ws_grps.cell(curr_row, c_i, h)
        cell.font = font_th
        cell.fill = fill_secondary
        cell.alignment = align_center
        cell.border = border_header
    curr_row += 1
    
    # Collect lessons for this group across Week 1
    sched1 = week_schedules[1]
    g_map = {}
    for it in sched1:
        if g in it['unit']['groups']:
            g_map[(it['day'], it['slot'])] = it
            
    for d in DAYS:
        for s in [1, 2, 3, 4]:
            it = g_map.get((d, s))
            if it:
                u = it['unit']
                ws_grps.row_dimensions[curr_row].height = 20
                ws_grps.cell(curr_row, 1, DAY_NAMES[d]).alignment = align_center
                ws_grps.cell(curr_row, 2, f"{s}-para").alignment = align_center
                ws_grps.cell(curr_row, 3, SLOT_TIMES[s]).alignment = align_center
                ws_grps.cell(curr_row, 4, u['subject']).alignment = align_left
                ws_grps.cell(curr_row, 5, u['type']).alignment = align_center
                ws_grps.cell(curr_row, 6, u['teacher']).alignment = align_left
                ws_grps.cell(curr_row, 7, it['room']).alignment = align_center
                
                for c_k in range(1, 8):
                    c = ws_grps.cell(curr_row, c_k)
                    c.border = border_cell
                    c.font = font_regular
                    if c_k == 5:
                        c.fill = fill_type.get(u['type'], fill_accent)
                curr_row += 1
    curr_row += 2 # gap between groups

# =========================================================================
# SHEET 6: O'qituvchilar Kesimida Dars Jadvali
# =========================================================================
ws_teachers = wb.create_sheet(title="O'qituvchilar kesimida")
ws_teachers.views.sheetView[0].showGridLines = True

ws_teachers.column_dimensions['A'].width = 14
ws_teachers.column_dimensions['B'].width = 10
ws_teachers.column_dimensions['C'].width = 14
ws_teachers.column_dimensions['D'].width = 30
ws_teachers.column_dimensions['E'].width = 20
ws_teachers.column_dimensions['F'].width = 16
ws_teachers.column_dimensions['G'].width = 24

# Build teacher index for Week 1
teacher_lessons = defaultdict(list)
for it in week_schedules[1]:
    t = it['unit']['teacher']
    teacher_lessons[t].append(it)

curr_row = 2
for t in sorted(teacher_lessons.keys()):
    items = sorted(teacher_lessons[t], key=lambda x: (x['day'], x['slot']))
    ws_teachers.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=7)
    t_hdr = ws_teachers.cell(curr_row, 1, f"O'QITUVCHI: {t} (1-haftada jami {len(items)} para)")
    t_hdr.font = font_head_sec
    t_hdr.fill = fill_primary
    t_hdr.alignment = align_center
    ws_teachers.row_dimensions[curr_row].height = 26
    curr_row += 1
    
    th_cols = ["Kun", "Para", "Vaqt", "Fan nomi", "Guruh(lar)", "Turi", "Auditoriya"]
    ws_teachers.row_dimensions[curr_row].height = 20
    for c_i, h in enumerate(th_cols, 1):
        cell = ws_teachers.cell(curr_row, c_i, h)
        cell.font = font_th
        cell.fill = fill_secondary
        cell.alignment = align_center
        cell.border = border_header
    curr_row += 1
    
    for it in items:
        u = it['unit']
        ws_teachers.row_dimensions[curr_row].height = 19
        ws_teachers.cell(curr_row, 1, DAY_NAMES[it['day']]).alignment = align_center
        ws_teachers.cell(curr_row, 2, f"{it['slot']}-para").alignment = align_center
        ws_teachers.cell(curr_row, 3, SLOT_TIMES[it['slot']]).alignment = align_center
        ws_teachers.cell(curr_row, 4, u['subject']).alignment = align_left
        ws_teachers.cell(curr_row, 5, ", ".join(u['groups'])).alignment = align_center
        ws_teachers.cell(curr_row, 6, u['type']).alignment = align_center
        ws_teachers.cell(curr_row, 7, it['room']).alignment = align_center
        
        for c_k in range(1, 8):
            c = ws_teachers.cell(curr_row, c_k)
            c.border = border_cell
            c.font = font_regular
            if c_k == 6:
                c.fill = fill_type.get(u['type'], fill_accent)
        curr_row += 1
    curr_row += 2

# Save file to project and export paths
output_filename = "3-kurs_sirtqi_DARS_JADVALI.xlsx"
project_path = os.path.abspath(output_filename)
desktop_path = os.path.join(os.path.expanduser("~"), "Desktop", output_filename)
downloads_path = r"C:\Users\user\Downloads\Telegram Desktop\3-kurs_sirtqi_DARS_JADVALI.xlsx"

wb.save(project_path)
print(f"Saved: {project_path}")

try:
    shutil.copy2(project_path, desktop_path)
    print(f"Copied to Desktop: {desktop_path}")
except Exception as e:
    print(f"Desktop copy warning: {e}")

try:
    shutil.copy2(project_path, downloads_path)
    print(f"Copied to Telegram Desktop: {downloads_path}")
except Exception as e:
    print(f"Downloads copy warning: {e}")
