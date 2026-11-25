import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import json

# BIU Haqiqiy Ishchi O'quv Rejalari bazasi (Kredit-modul / ECTS tizimi bo'yicha)
# 1 kredit = 30 akademik soat. Har bir semestr = aniq 30 kredit!
REAL_CURRICULUMS = [
    # ================= 60610400 - DASTURIY INJINIRING =================
    # 1-kurs 1-semestr (Kuzgi) - Jami 30 kredit
    {"code": "O'YT1104", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "kuzgi", "name": "O'zbekistonning eng yangi tarixi", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "XOT1108", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "kuzgi", "name": "Xorijiy til 1", "credit": 4, "total": 120, "lec": 0, "prac": 48, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 0, "w_prac": 4, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "HIS1112", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "kuzgi", "name": "Hisob (Calculus) 1", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "CHA1306", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "kuzgi", "name": "Chiziqli algebra", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "DAS1110", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "kuzgi", "name": "Dasturlash 1", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},
    {"code": "AKY1104", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "kuzgi", "name": "Akademik yozuv", "credit": 4, "total": 120, "lec": 0, "prac": 24, "lab": 0, "sem_h": 0, "indep": 96, "w_lec": 0, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},

    # 1-kurs 2-semestr (Bahoriy) - Jami 30 kredit
    {"code": "DIN1204", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "bahoriy", "name": "Dinshunoslik", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "XOT1208", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "bahoriy", "name": "Xorijiy til 2", "credit": 4, "total": 120, "lec": 0, "prac": 48, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 0, "w_prac": 4, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "HIS1212", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "bahoriy", "name": "Hisob (Calculus) 2", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "FIZ1110", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "bahoriy", "name": "Fizika 1", "credit": 6, "total": 180, "lec": 24, "prac": 24, "lab": 24, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 2, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "DIT1406", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "bahoriy", "name": "Differensial tenglamalar", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "DAS1210", "major": "Dasturiy injiniring", "majorId": "se", "year": 1, "sem": "bahoriy", "name": "Dasturlash 2", "credit": 4, "total": 120, "lec": 24, "prac": 24, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},

    # 2-kurs 3-semestr (Kuzgi) - Jami 30 kredit
    {"code": "FAL1204", "major": "Dasturiy injiniring", "majorId": "se", "year": 2, "sem": "kuzgi", "name": "Falsafa", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "MAB1306", "major": "Dasturiy injiniring", "majorId": "se", "year": 2, "sem": "kuzgi", "name": "Ma'lumotlar bazasi", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},
    {"code": "MTA1204", "major": "Dasturiy injiniring", "majorId": "se", "year": 2, "sem": "kuzgi", "name": "Ma'lumotlar tuzilmasi va algoritmlar", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. A. YUNUSOV"},
    {"code": "EVS1306", "major": "Dasturiy injiniring", "majorId": "se", "year": 2, "sem": "kuzgi", "name": "Elektronika va sxemalar 1", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "J. QODIROV"},
    {"code": "DIT1306", "major": "Dasturiy injiniring", "majorId": "se", "year": 2, "sem": "kuzgi", "name": "Diskret tuzilmalar", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},

    # 3-kurs 5-semestr (Kuzgi) - Jami 30 kredit
    {"code": "SIA1406", "major": "Dasturiy injiniring", "majorId": "se", "year": 3, "sem": "kuzgi", "name": "Sun'iy intellekt asoslari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. A. YUNUSOV"},
    {"code": "EVS1406", "major": "Dasturiy injiniring", "majorId": "se", "year": 3, "sem": "kuzgi", "name": "Ehtimollik va statistika", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "ALI1506", "major": "Dasturiy injiniring", "majorId": "se", "year": 3, "sem": "kuzgi", "name": "Algoritmlarni loyihalash", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},
    {"code": "WII2514", "major": "Dasturiy injiniring", "majorId": "se", "year": 3, "sem": "kuzgi", "name": "Web ilovalarni ishlab chiqish", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "K. KARIMOV"},
    {"code": "KOT1406", "major": "Dasturiy injiniring", "majorId": "se", "year": 3, "sem": "kuzgi", "name": "Kompyuter tarmoqlari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},

    # 4-kurs 7-semestr (Kuzgi) - Jami 30 kredit
    {"code": "DTA1704", "major": "Dasturiy injiniring", "majorId": "se", "year": 4, "sem": "kuzgi", "name": "Dasturiy ta'minot arxitekturasi", "credit": 6, "total": 180, "lec": 24, "prac": 24, "lab": 0, "sem_h": 0, "indep": 132, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. A. YUNUSOV"},
    {"code": "DTT1704", "major": "Dasturiy injiniring", "majorId": "se", "year": 4, "sem": "kuzgi", "name": "Dasturiy ta'minotni testlash", "credit": 6, "total": 180, "lec": 24, "prac": 24, "lab": 0, "sem_h": 0, "indep": 132, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},
    {"code": "DOA2612", "major": "Dasturiy injiniring", "majorId": "se", "year": 4, "sem": "kuzgi", "name": "DevOps asoslari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},
    {"code": "BDT2610", "major": "Dasturiy injiniring", "majorId": "se", "year": 4, "sem": "kuzgi", "name": "Big Data tahlili", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "K. KARIMOV"},
    {"code": "BDA2610", "major": "Dasturiy injiniring", "majorId": "se", "year": 4, "sem": "kuzgi", "name": "Backend dasturlash va API", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},

    # ================= 60610300 - KOMPYUTER INJINIRINGI =================
    # 1-kurs 1-semestr (Kuzgi) - Jami 30 kredit
    {"code": "O'YT1104", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 1, "sem": "kuzgi", "name": "O'zbekistonning eng yangi tarixi", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "XOT1108", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 1, "sem": "kuzgi", "name": "Xorijiy til 1", "credit": 4, "total": 120, "lec": 0, "prac": 48, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 0, "w_prac": 4, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "HIS1112", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 1, "sem": "kuzgi", "name": "Hisob (Calculus) 1", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "CHA1306", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 1, "sem": "kuzgi", "name": "Chiziqli algebra", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "DAS1110", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 1, "sem": "kuzgi", "name": "Dasturlash 1 (C++)", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "J. QODIROV"},
    {"code": "AKY1104", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 1, "sem": "kuzgi", "name": "Akademik yozuv", "credit": 4, "total": 120, "lec": 0, "prac": 24, "lab": 0, "sem_h": 0, "indep": 96, "w_lec": 0, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},

    # 2-kurs 3-semestr (Kuzgi) - Jami 30 kredit
    {"code": "FAL1204", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 2, "sem": "kuzgi", "name": "Falsafa", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "EVS1306", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 2, "sem": "kuzgi", "name": "Elektronika va sxemalar", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "J. QODIROV"},
    {"code": "KOA1306", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 2, "sem": "kuzgi", "name": "Kompyuter arxitekturasi", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "K. KARIMOV"},
    {"code": "OPT1506", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 2, "sem": "kuzgi", "name": "Operatsion tizimlar (Linux)", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "K. KARIMOV"},
    {"code": "MAB1306", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 2, "sem": "kuzgi", "name": "Ma'lumotlar bazasi", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},

    # 3-kurs 5-semestr (Kuzgi) - Jami 30 kredit
    {"code": "MPT1506", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 3, "sem": "kuzgi", "name": "Mikroprotsessorli tizimlar", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "J. QODIROV"},
    {"code": "KOT1406", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 3, "sem": "kuzgi", "name": "Kompyuter tarmoqlari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},
    {"code": "TAX1506", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 3, "sem": "kuzgi", "name": "Tarmoq xavfsizligi", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},
    {"code": "SIA1406", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 3, "sem": "kuzgi", "name": "Sun'iy intellekt asoslari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. A. YUNUSOV"},
    {"code": "EVS1406", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 3, "sem": "kuzgi", "name": "Ehtimollik va statistika", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},

    # 4-kurs 7-semestr (Kuzgi) - Jami 30 kredit
    {"code": "ORT1706", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 4, "sem": "kuzgi", "name": "O'rnatma tizimlar (Embedded)", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "J. QODIROV"},
    {"code": "IOT1706", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 4, "sem": "kuzgi", "name": "IoT va Sensor tarmoqlari", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "K. KARIMOV"},
    {"code": "BHT1706", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 4, "sem": "kuzgi", "name": "Bulutli hisoblash va serverlar", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},
    {"code": "DOA2612", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 4, "sem": "kuzgi", "name": "DevOps infratuzilma", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},
    {"code": "KIB1706", "major": "Kompyuter injiniringi", "majorId": "cs", "year": 4, "sem": "kuzgi", "name": "Kiberxavfsizlik amaliyoti", "credit": 6, "total": 180, "lec": 24, "prac": 24, "lab": 0, "sem_h": 0, "indep": 132, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. BOLTAYEVA"},

    # ================= 60540200 - AMALIY MATEMATIKA =================
    # 1-kurs 1-semestr (Kuzgi) - Jami 30 kredit
    {"code": "O'YT1104", "major": "Amaliy matematika", "majorId": "math", "year": 1, "sem": "kuzgi", "name": "O'zbekistonning eng yangi tarixi", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "MA112316", "major": "Amaliy matematika", "majorId": "math", "year": 1, "sem": "kuzgi", "name": "Matematik analiz 1", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "CHAAG11209", "major": "Amaliy matematika", "majorId": "math", "year": 1, "sem": "kuzgi", "name": "Chiziqli algebra va analitik geometriya", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "DMMM11209", "major": "Amaliy matematika", "majorId": "math", "year": 1, "sem": "kuzgi", "name": "Diskret matematika va matematik mantiq", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "ATD123417", "major": "Amaliy matematika", "majorId": "math", "year": 1, "sem": "kuzgi", "name": "Algoritmik tillar va dasturlash", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 24, "sem_h": 0, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},
    {"code": "XOT1108", "major": "Amaliy matematika", "majorId": "math", "year": 1, "sem": "kuzgi", "name": "Xorijiy til", "credit": 4, "total": 120, "lec": 0, "prac": 48, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 0, "w_prac": 4, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},

    # 2-kurs 3-semestr (Kuzgi) - Jami 30 kredit
    {"code": "DT13409", "major": "Amaliy matematika", "majorId": "math", "year": 2, "sem": "kuzgi", "name": "Differensial tenglamalar", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "ENMS1406", "major": "Amaliy matematika", "majorId": "math", "year": 2, "sem": "kuzgi", "name": "Ehtimollar nazariyasi va matematik statistika", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "UF1306", "major": "Amaliy matematika", "majorId": "math", "year": 2, "sem": "kuzgi", "name": "Umumiy fizika", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "FAL1204", "major": "Amaliy matematika", "majorId": "math", "year": 2, "sem": "kuzgi", "name": "Falsafa", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "MAB1306", "major": "Amaliy matematika", "majorId": "math", "year": 2, "sem": "kuzgi", "name": "Ma'lumotlar bazasi", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},

    # 3-kurs 5-semestr (Kuzgi) - Jami 30 kredit
    {"code": "SU1506", "major": "Amaliy matematika", "majorId": "math", "year": 3, "sem": "kuzgi", "name": "Sonli usullar", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "FA1505", "major": "Amaliy matematika", "majorId": "math", "year": 3, "sem": "kuzgi", "name": "Funksional analiz", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "MM15609", "major": "Amaliy matematika", "majorId": "math", "year": 3, "sem": "kuzgi", "name": "Matematik modellashtirish", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. A. YUNUSOV"},
    {"code": "MFT1506", "major": "Amaliy matematika", "majorId": "math", "year": 3, "sem": "kuzgi", "name": "Matematik fizika tenglamalari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "Z. XOLIQOVA"},
    {"code": "NM1405", "major": "Amaliy matematika", "majorId": "math", "year": 3, "sem": "kuzgi", "name": "Nazariy mexanika", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},

    # 4-kurs 7-semestr (Kuzgi) - Jami 30 kredit
    {"code": "JTOB1605", "major": "Amaliy matematika", "majorId": "math", "year": 4, "sem": "kuzgi", "name": "Jarayonlar tadqiqoti va optimal boshqaruv", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "KMT1706", "major": "Amaliy matematika", "majorId": "math", "year": 4, "sem": "kuzgi", "name": "Kompyuterli matematik tizimlar", "credit": 8, "total": 240, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},
    {"code": "SIA1406", "major": "Amaliy matematika", "majorId": "math", "year": 4, "sem": "kuzgi", "name": "Sun'iy intellekt va Machine Learning", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. A. YUNUSOV"},
    {"code": "BDT2610", "major": "Amaliy matematika", "majorId": "math", "year": 4, "sem": "kuzgi", "name": "Katta ma'lumotlar tahlili (Big Data)", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "K. KARIMOV"},

    # ================= 60410100 - IQTISODIYOT =================
    # 1-kurs 1-semestr (Kuzgi) - Jami 30 kredit
    {"code": "O'YT1104", "major": "Iqtisodiyot", "majorId": "econ", "year": 1, "sem": "kuzgi", "name": "O'zbekistonning eng yangi tarixi", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "MIK1106", "major": "Iqtisodiyot", "majorId": "econ", "year": 1, "sem": "kuzgi", "name": "Iqtisodiy nazariya (Mikroiqtisodiyot)", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. SH. MUXSINOV"},
    {"code": "OMA1106", "major": "Iqtisodiyot", "majorId": "econ", "year": 1, "sem": "kuzgi", "name": "Oliy matematika", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "IAT1106", "major": "Iqtisodiyot", "majorId": "econ", "year": 1, "sem": "kuzgi", "name": "Iqtisodchilar uchun axborot texnologiyalari", "credit": 6, "total": 180, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},
    {"code": "XOT1108", "major": "Iqtisodiyot", "majorId": "econ", "year": 1, "sem": "kuzgi", "name": "Xorijiy til", "credit": 4, "total": 120, "lec": 0, "prac": 48, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 0, "w_prac": 4, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "AKY1104", "major": "Iqtisodiyot", "majorId": "econ", "year": 1, "sem": "kuzgi", "name": "Akademik yozuv", "credit": 4, "total": 120, "lec": 0, "prac": 24, "lab": 0, "sem_h": 0, "indep": 96, "w_lec": 0, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},

    # 2-kurs 3-semestr (Kuzgi) - Jami 30 kredit
    {"code": "MAK1306", "major": "Iqtisodiyot", "majorId": "econ", "year": 2, "sem": "kuzgi", "name": "Makroiqtisodiyot", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. SH. MUXSINOV"},
    {"code": "EKO1306", "major": "Iqtisodiyot", "majorId": "econ", "year": 2, "sem": "kuzgi", "name": "Ekonometrika", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "STA1306", "major": "Iqtisodiyot", "majorId": "econ", "year": 2, "sem": "kuzgi", "name": "Statistika", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "FAL1204", "major": "Iqtisodiyot", "majorId": "econ", "year": 2, "sem": "kuzgi", "name": "Falsafa", "credit": 6, "total": 180, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 132, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},

    # 3-kurs 5-semestr (Kuzgi) - Jami 30 kredit
    {"code": "MVS1506", "major": "Iqtisodiyot", "majorId": "econ", "year": 3, "sem": "kuzgi", "name": "Moliya va soliqlar", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "A. HAMROYEV"},
    {"code": "RIQ1506", "major": "Iqtisodiyot", "majorId": "econ", "year": 3, "sem": "kuzgi", "name": "Raqamli iqtisodiyot", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},
    {"code": "XIQ1506", "major": "Iqtisodiyot", "majorId": "econ", "year": 3, "sem": "kuzgi", "name": "Xalqaro iqtisodiyot", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "MEN1506", "major": "Iqtisodiyot", "majorId": "econ", "year": 3, "sem": "kuzgi", "name": "Menejment asoslari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},

    # 4-kurs 7-semestr (Kuzgi) - Jami 30 kredit
    {"code": "IQT1706", "major": "Iqtisodiyot", "majorId": "econ", "year": 4, "sem": "kuzgi", "name": "Iqtisodiy tahlil", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"},
    {"code": "STM1706", "major": "Iqtisodiyot", "majorId": "econ", "year": 4, "sem": "kuzgi", "name": "Strategik menejment", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},
    {"code": "IXA1706", "major": "Iqtisodiyot", "majorId": "econ", "year": 4, "sem": "kuzgi", "name": "Iqtisodiy xavfsizlik", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. SH. MUXSINOV"},
    {"code": "LOB1706", "major": "Iqtisodiyot", "majorId": "econ", "year": 4, "sem": "kuzgi", "name": "Loyiha boshqaruvi", "credit": 6, "total": 180, "lec": 24, "prac": 24, "lab": 0, "sem_h": 0, "indep": 132, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"},

    # ================= 60410200 - BUXGALTERIYA HISOBI VA AUDIT =================
    # 1-kurs 1-semestr (Kuzgi) - Jami 30 kredit
    {"code": "O'YT1104", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 1, "sem": "kuzgi", "name": "O'zbekistonning eng yangi tarixi", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "BHN1106", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 1, "sem": "kuzgi", "name": "Buxgalteriya hisobi nazariyasi", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. OLIMOVA"},
    {"code": "IQN1106", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 1, "sem": "kuzgi", "name": "Iqtisodiy nazariya", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. SH. MUXSINOV"},
    {"code": "OMA1106", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 1, "sem": "kuzgi", "name": "Oliy matematika", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "XOT1108", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 1, "sem": "kuzgi", "name": "Xorijiy til", "credit": 4, "total": 120, "lec": 0, "prac": 48, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 0, "w_prac": 4, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "AKY1104", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 1, "sem": "kuzgi", "name": "Akademik yozuv", "credit": 4, "total": 120, "lec": 0, "prac": 24, "lab": 0, "sem_h": 0, "indep": 96, "w_lec": 0, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},

    # 2-kurs 3-semestr (Kuzgi) - Jami 30 kredit
    {"code": "MOH1306", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 2, "sem": "kuzgi", "name": "Moliyaviy hisob 1", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. OLIMOVA"},
    {"code": "AUA1306", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 2, "sem": "kuzgi", "name": "Audit asoslari", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. OLIMOVA"},
    {"code": "BAT1306", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 2, "sem": "kuzgi", "name": "Buxgalteriyada axborot tizimlari (1C)", "credit": 8, "total": 240, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "DOC. B. RAHIMOV"},
    {"code": "FAL1204", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 2, "sem": "kuzgi", "name": "Falsafa", "credit": 6, "total": 180, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 132, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},

    # 3-kurs 5-semestr (Kuzgi) - Jami 30 kredit
    {"code": "BOH1506", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 3, "sem": "kuzgi", "name": "Boshqaruv hisobi", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "A. HAMROYEV"},
    {"code": "SST1506", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 3, "sem": "kuzgi", "name": "Soliqlar va soliqqa tortish", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. OLIMOVA"},
    {"code": "MOT1506", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 3, "sem": "kuzgi", "name": "Moliyaviy tahlil", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"},
    {"code": "MIK1106", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 3, "sem": "kuzgi", "name": "Iqtisodiy tahlil", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. SH. MUXSINOV"},

    # 4-kurs 7-semestr (Kuzgi) - Jami 30 kredit
    {"code": "MHX1706", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 4, "sem": "kuzgi", "name": "Moliyaviy hisobotning xalqaro standartlari (MHXS)", "credit": 10, "total": 300, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 228, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "A. HAMROYEV"},
    {"code": "ICA1706", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 4, "sem": "kuzgi", "name": "Ichki audit", "credit": 10, "total": 300, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 228, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. OLIMOVA"},
    {"code": "STR1706", "major": "Buxgalteriya hisobi va audit", "majorId": "acc", "year": 4, "sem": "kuzgi", "name": "Strategik boshqaruv hisobi", "credit": 10, "total": 300, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 228, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "A. HAMROYEV"},

    # ================= 60410400 - MOLIYA VA MOLIYAVIY TEXNOLOGIYALAR =================
    # 1-kurs 1-semestr (Kuzgi) - Jami 30 kredit
    {"code": "O'YT1104", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 1, "sem": "kuzgi", "name": "O'zbekistonning eng yangi tarixi", "credit": 4, "total": 120, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 72, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},
    {"code": "MON1106", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 1, "sem": "kuzgi", "name": "Moliya nazariyasi", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "A. HAMROYEV"},
    {"code": "MIK1106", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 1, "sem": "kuzgi", "name": "Mikroiqtisodiyot", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "PROF. SH. MUXSINOV"},
    {"code": "OMA1106", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 1, "sem": "kuzgi", "name": "Oliy matematika", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "S. SA'DULLAYEV"},
    {"code": "XOT1108", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 1, "sem": "kuzgi", "name": "Xorijiy til", "credit": 4, "total": 120, "lec": 0, "prac": 48, "lab": 0, "sem_h": 0, "indep": 72, "w_lec": 0, "w_prac": 4, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "AKY1104", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 1, "sem": "kuzgi", "name": "Akademik yozuv", "credit": 4, "total": 120, "lec": 0, "prac": 24, "lab": 0, "sem_h": 0, "indep": 96, "w_lec": 0, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "R. RUSTAMOV"},

    # 2-kurs 3-semestr (Kuzgi) - Jami 30 kredit
    {"code": "PKB1306", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 2, "sem": "kuzgi", "name": "Pul, kredit va banklar", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. OLIMOVA"},
    {"code": "KOM1306", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 2, "sem": "kuzgi", "name": "Korporativ moliya", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "A. HAMROYEV"},
    {"code": "FTC1306", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 2, "sem": "kuzgi", "name": "Moliyaviy texnologiyalar (FinTech)", "credit": 8, "total": 240, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"},
    {"code": "FAL1204", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 2, "sem": "kuzgi", "name": "Falsafa", "credit": 6, "total": 180, "lec": 24, "prac": 0, "lab": 0, "sem_h": 24, "indep": 132, "w_lec": 2, "w_prac": 0, "w_lab": 0, "w_sem": 2, "teacher": "R. RUSTAMOV"},

    # 3-kurs 5-semestr (Kuzgi) - Jami 30 kredit
    {"code": "DAM1506", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 3, "sem": "kuzgi", "name": "Davlat moliyasi", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "A. HAMROYEV"},
    {"code": "INT1506", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 3, "sem": "kuzgi", "name": "Investitsion tahlil", "credit": 8, "total": 240, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"},
    {"code": "KAB1506", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 3, "sem": "kuzgi", "name": "Kripto-aktivlar va Blokcheyn", "credit": 8, "total": 240, "lec": 36, "prac": 0, "lab": 36, "sem_h": 0, "indep": 168, "w_lec": 2, "w_prac": 0, "w_lab": 2, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"},
    {"code": "BAX1506", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 3, "sem": "kuzgi", "name": "Bank ishi va operatsiyalari", "credit": 6, "total": 180, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 108, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. OLIMOVA"},

    # 4-kurs 7-semestr (Kuzgi) - Jami 30 kredit
    {"code": "MRB1706", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 4, "sem": "kuzgi", "name": "Moliyaviy risklarni boshqarish", "credit": 10, "total": 300, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 228, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"},
    {"code": "XMB1706", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 4, "sem": "kuzgi", "name": "Xalqaro moliya bozorlari", "credit": 10, "total": 300, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 228, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "N. TOSHEV"},
    {"code": "SMN1706", "major": "Moliya va moliyaviy texnologiyalar", "majorId": "fin", "year": 4, "sem": "kuzgi", "name": "Sug'urta ishi va menejmenti", "credit": 10, "total": 300, "lec": 36, "prac": 36, "lab": 0, "sem_h": 0, "indep": 228, "w_lec": 2, "w_prac": 2, "w_lab": 0, "w_sem": 0, "teacher": "DOC. M. EGAMBERDIYEVA"}
]

# Create Excel file with official columns
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "BIU_Oquv_Rejalar"

headers = [
    "№", "Malakaviy Kod", "Ta'lim Yo'nalishi", "Kurs", "Semestr", "Fan Nomi", 
    "Kredit (ECTS)", "Umumiy Yuklama (soat)", "Ma'ruza (soat)", "Amaliyot (soat)", "Laboratoriya (soat)", "Seminar (soat)", "Mustaqil Ta'lim (soat)",
    "Haftalik Ma'ruza (soat)", "Haftalik Amaliyot (soat)", "Haftalik Lab (soat)", "Haftalik Seminar (soat)", "Jami Haftalik Soat", "Biriktirilgan O'qituvchi"
]

header_fill = PatternFill(start_color="3C8DBC", end_color="3C8DBC", fill_type="solid")
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

for col_num, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col_num, value=header)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = border

for idx, item in enumerate(REAL_CURRICULUMS, 1):
    row_num = idx + 1
    total_weekly = item['w_lec'] + item['w_prac'] + item['w_lab'] + item['w_sem']
    row_values = [
        idx,
        item.get('code', f"FAN{idx}"),
        item['major'],
        f"{item['year']}-kurs",
        "1-semestr (Kuzgi)" if item['sem'] == 'kuzgi' else "2-semestr (Bahoriy)",
        item['name'],
        item.get('credit', 4),
        item.get('total', 120),
        item['lec'],
        item['prac'],
        item['lab'],
        item['sem_h'],
        item.get('indep', 72),
        item['w_lec'],
        item['w_prac'],
        item['w_lab'],
        item['w_sem'],
        total_weekly,
        item['teacher']
    ]
    for col_num, val in enumerate(row_values, 1):
        cell = ws.cell(row=row_num, column=col_num, value=val)
        cell.border = border
        if col_num in [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]:
            cell.alignment = Alignment(horizontal="center", vertical="center")
        else:
            cell.alignment = Alignment(horizontal="left", vertical="center")

col_widths = [5, 14, 28, 10, 18, 38, 12, 18, 14, 14, 16, 14, 18, 16, 16, 16, 16, 16, 25]
for i, width in enumerate(col_widths, 1):
    ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = width

excel_path = "public/BIU_Rasmiy_Oquv_Rejalar.xlsx"
wb.save(excel_path)
print("Saved Excel to:", excel_path)

# Prepare JSON for data.js
js_curriculums = []
for idx, item in enumerate(REAL_CURRICULUMS, 1):
    js_curriculums.append({
        "id": f"c-real-{item['majorId']}-{item['year']}-{idx}",
        "code": item.get('code', f"FAN{idx}"),
        "majorId": item['majorId'],
        "year": item['year'],
        "semester": "fall" if item['sem'] == "kuzgi" else "spring",
        "subjectName": item['name'],
        "credit": item.get('credit', 4),
        "totalHours": item.get('total', 120),
        "independentHours": item.get('indep', 72),
        "semesterLectureHours": item['lec'],
        "semesterPracticeHours": item['prac'],
        "semesterLabHours": item['lab'],
        "semesterSeminarHours": item['sem_h'],
        "lectureHours": item['w_lec'],
        "practiceHours": item['w_prac'],
        "labHours": item['w_lab'],
        "seminarHours": item['w_sem'],
        "hoursPerWeek": item['w_lec'] + item['w_prac'] + item['w_lab'] + item['w_sem'],
        "teacherId": "t-yunusov" if "YUNUSOV" in item['teacher'] else (
            "t-rahimov" if "RAHIMOV" in item['teacher'] else (
                "t-karimov" if "KARIMOV" in item['teacher'] else (
                    "t-sadullayev" if "SADULLAYEV" in item['teacher'] or "SA'DULLAYEV" in item['teacher'] else (
                        "t-boltayeva" if "BOLTAYEVA" in item['teacher'] else (
                            "t-qodirov" if "QODIROV" in item['teacher'] else (
                                "t-xoliqova" if "XOLIQOVA" in item['teacher'] else (
                                    "t-muxsinov" if "MUXSINOV" in item['teacher'] else (
                                        "t-olimova" if "OLIMOVA" in item['teacher'] else (
                                            "t-toshev" if "TOSHEV" in item['teacher'] else (
                                                "t-rustamov" if "RUSTAMOV" in item['teacher'] else (
                                                    "t-egamberdiyeva" if "EGAMBERDIYEVA" in item['teacher'] else "t-hamroyev"
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    })

with open("scripts_curriculums.json", "w", encoding="utf-8") as f:
    json.dump(js_curriculums, f, ensure_ascii=False, indent=2)
print("Saved JSON, items count:", len(js_curriculums))
