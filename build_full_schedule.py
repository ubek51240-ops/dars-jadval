import json
import math
import random
from collections import defaultdict
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Load parsed data
with open('parsed_sirtqi.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

def norm_grp(g):
    return g.strip().replace(' ', '') if g else ''

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
    if 'Камоlova Д' in t or 'Камолова Д' in t:
        return 'Kamolova D.'
    if 'Саидов А' in t:
        return 'Saidov A.'
    if "Bo'ronova Nigora" in t or "Bo‘ronova Nigora" in t:
        return "Bo'ronova Nigora Umar qizi"
    return t

# Group rows by group
groups_raw = defaultdict(list)
for d in raw_data:
    g = norm_grp(d.get('group'))
    if g:
        groups_raw[g].append(d)

print(f"Total groups: {len(groups_raw)}")

# Potok definitions
POTOK_MAP = {
    '1-1PSIS-24': 'POTOK_PSIS',
    '1-2PSIS-24': 'POTOK_PSIS',
    '1-1MTS-24': 'POTOK_MTS',
    '1-2MTS-24': 'POTOK_MTS',
    '1-3MTS-24': 'POTOK_MTS',
    '1-1EMS-24': 'POTOK_EMS',
    '1-2EMS-24': 'POTOK_EMS',
    '1-3EMS-24': 'POTOK_EMS',
    '1-1IQTS-24': 'POTOK_IQTS1',
    '1-2IQTS-24': 'POTOK_IQTS1',
    '1-3IQTS-24': 'POTOK_IQTS1',
    '1-4IQTS-24': 'POTOK_IQTS2',
    '1-5IQTS-24': 'POTOK_IQTS2',
    '1-6IQTS-24': 'POTOK_IQTS2',
    '1-1TRLS-24': 'POTOK_TRLS',
    '1-2TRLS-24': 'POTOK_TRLS',
}

# Determine leader of potok
POTOK_LEADERS = {
    'POTOK_PSIS': '1-1PSIS-24',
    'POTOK_MTS': '1-1MTS-24',
    'POTOK_EMS': '1-1EMS-24',
    'POTOK_IQTS1': '1-1IQTS-24',
    'POTOK_IQTS2': '1-4IQTS-24',
    'POTOK_TRLS': '1-1TRLS-24',
}

# Find all members of each potok
POTOK_MEMBERS = defaultdict(list)
for grp, ptag in POTOK_MAP.items():
    POTOK_MEMBERS[ptag].append(grp)

print("Potoks:", {k: len(v) for k, v in POTOK_MEMBERS.items()})
