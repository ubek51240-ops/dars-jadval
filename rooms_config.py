import json
import random
from collections import defaultdict

# Available rooms
LECTURE_HALLS_LARGE = [
    {"id": "r-lec-1", "name": "006 Katta ma'ruza zali (Asman)", "capacity": 120, "type": "lecture"},
    {"id": "r-lec-2", "name": "101 Katta ma'ruza zali (Asman)", "capacity": 100, "type": "lecture"},
    {"id": "r-lec-3", "name": "201 Amfiteatr zali (Asman)", "capacity": 90, "type": "lecture"},
    {"id": "r-lec-4", "name": "301 Ma'ruza zali (Asman)", "capacity": 80, "type": "lecture"},
]

LECTURE_HALLS_MEDIUM = [
    {"id": "r-lec-5", "name": "102 Ma'ruza xonasi", "capacity": 60, "type": "lecture"},
    {"id": "r-lec-6", "name": "105 Ma'ruza xonasi", "capacity": 50, "type": "lecture"},
    {"id": "r-lec-7", "name": "108 Ma'ruza xonasi", "capacity": 50, "type": "lecture"},
    {"id": "r-lec-8", "name": "204 Ma'ruza xonasi", "capacity": 50, "type": "lecture"},
]

LAB_ROOMS = [
    {"id": "r-lab-1", "name": "010 Kompyuter laboratoriyasi", "capacity": 35, "type": "lab"},
    {"id": "r-lab-2", "name": "012 Fizika laboratoriya xonasi", "capacity": 30, "type": "lab"},
    {"id": "r-lab-3", "name": "207 IT laboratoriya", "capacity": 35, "type": "lab"},
    {"id": "r-lab-4", "name": "208 IT laboratoriya", "capacity": 35, "type": "lab"},
    {"id": "r-lab-5", "name": "112 Elektrotexnika laboratoriyasi", "capacity": 30, "type": "lab"},
    {"id": "r-lab-6", "name": "114 Muhandislik laboratoriyasi", "capacity": 30, "type": "lab"},
]

PRACTICE_ROOMS = [
    {"id": f"r-prac-{i}", "name": f"{num} Auditoriya", "capacity": 35, "type": "practice"}
    for i, num in enumerate([
        "001", "003", "009", "011", "103", "104", "106", "107", "109", "110",
        "202", "203", "205", "206", "302", "303", "304", "305", "306", "307",
        "308", "309", "310", "401", "402", "403", "404", "405", "406", "407"
    ], 1)
]

SPORTS_ROOMS = [
    {"id": "r-sport-1", "name": "Sport majmuasi / Sport zal", "capacity": 60, "type": "sport"}
]

ALL_ROOMS = LECTURE_HALLS_LARGE + LECTURE_HALLS_MEDIUM + LAB_ROOMS + PRACTICE_ROOMS + SPORTS_ROOMS
print(f"Total rooms configured: {len(ALL_ROOMS)}")
