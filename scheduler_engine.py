import json
import math
import random
from collections import defaultdict

with open('parsed_sirtqi.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

def norm_grp(g):
    return g.strip().replace(' ', '') if g else ''

# Clean teacher name
def clean_teacher(t):
    if not t or t == 'None':
        return 'Vakant'
    t = t.strip()
    # Normalize variants
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

# Group definitions and student counts
groups_meta = {}
for d in raw_data:
    g = norm_grp(d.get('group'))
    if g and g not in groups_meta:
        groups_meta[g] = {
            'code': g,
            'name': d.get('group').strip(),
            'kurs': d.get('kurs') or 3,
            'students': int(d.get('talaba') or 25)
        }

# Stream/Potok definitions for joint lectures
# (groups in same potok share the lecture)
POTOKS = {
    'PSIS': ['1-1PSIS-24', '1-2PSIS-24'],
    'MTS': ['1-1MTS-24', '1-2MTS-24', '1-3MTS-24'],
    'EMS': ['1-1EMS-24', '1-2EMS-24', '1-3EMS-24'],
    'IQTS_1': ['1-1IQTS-24', '1-2IQTS-24', '1-3IQTS-24'],
    'IQTS_2': ['1-4IQTS-24', '1-5IQTS-24', '1-6IQTS-24'],
    'TRLS': ['1-1TRLS-24', '1-2TRLS-24'],
}

def find_potok_leader(grp):
    for p_name, members in POTOKS.items():
        if grp in members:
            return members[0], p_name, members
    return grp, None, [grp]

print(f"Loaded {len(groups_meta)} groups.")
