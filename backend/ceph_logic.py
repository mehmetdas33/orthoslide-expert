"""
Cephalometric Reference Ranges & Diagnosis Logic
OrthoSlide Expert V2
"""

# ──────────────────────────────────────────────
# Reference ranges: (measurement_key, display_name, low, high, unit)
# ──────────────────────────────────────────────
REFERENCE_RANGES = {
    # ── Skeletal (Sagittal) ──
    "SNA":          {"name": "SNA",                   "low": 80,    "high": 84,    "unit": "°"},
    "SNB":          {"name": "SNB",                   "low": 78,    "high": 82,    "unit": "°"},
    "ANB":          {"name": "ANB",                   "low": 0,     "high": 4,     "unit": "°"},
    "N-A":          {"name": "N-A",                   "low": -3,    "high": 3,     "unit": "mm"},
    "N-Pog":        {"name": "N-Pog",                 "low": -9,    "high": 1,     "unit": "mm"},
    "Wits":         {"name": "Wits Appraisal",        "low": -4,    "high": 2,     "unit": "mm"},

    # ── Skeletal (Vertical) ──
    "Y-Axis":       {"name": "Y Axis",                "low": 53,    "high": 65,    "unit": "°"},
    "SN-GoMe":      {"name": "SN-GoMe",               "low": 25,    "high": 39,    "unit": "°"},
    "SN-PP":        {"name": "SN-PP",                 "low": 5,     "high": 9,     "unit": "°"},
    "Mx-Md":        {"name": "Mx-Md Angle",           "low": 19,    "high": 31,    "unit": "°"},
    "FMA":          {"name": "FMA (FH-MP)",           "low": 20,    "high": 30,    "unit": "°"},

    # ── Jaw Lengths ──
    "N-Me":         {"name": "N-Me",                  "low": 109.4, "high": 119.4, "unit": "mm"},
    "S-Go":         {"name": "S-Go",                  "low": 70.4,  "high": 78.4,  "unit": "mm"},
    "S-Go/N-Me":    {"name": "S-Go / N-Me",           "low": 61,    "high": 69,    "unit": "%"},
    "ANS-Me":       {"name": "ANS-Me",                "low": 38,    "high": 98,    "unit": "mm"},
    "Co-A":         {"name": "Co-A (Ef. Midface)",    "low": 71,    "high": 111,   "unit": "mm"},
    "Co-Gn":        {"name": "Co-Gn (Ef. Mandible)", "low": 97,    "high": 137,   "unit": "mm"},
    "S-N":          {"name": "S-N",                   "low": 70,    "high": 76,    "unit": "mm"},
    "Go-Me":        {"name": "Go-Me",                 "low": 72.5,  "high": 83.5,  "unit": "mm"},

    # ── Dental ──
    "U1-SN":        {"name": "U1-SN",                 "low": 97,    "high": 107,   "unit": "°"},
    "U1-PP":        {"name": "U1-PP",                 "low": 105,   "high": 115,   "unit": "°"},
    "U1-NA-mm":     {"name": "U1-NA (mm)",            "low": 1,     "high": 7,     "unit": "mm"},
    "U1-NA-deg":    {"name": "U1/NA (°)",             "low": 16,    "high": 28,    "unit": "°"},
    "U1-OP":        {"name": "U1/OP",                 "low": 54,    "high": 60,    "unit": "°"},
    "L1-Apog":      {"name": "L1-Apog",               "low": 1,     "high": 3,     "unit": "mm"},
    "IMPA":         {"name": "IMPA (L1-MeGo)",        "low": 85,    "high": 95,    "unit": "°"},
    "L1-NB-mm":     {"name": "L1-NB (mm)",            "low": 2,     "high": 6,     "unit": "mm"},
    "L1-NB-deg":    {"name": "L1/NB (°)",             "low": 19,    "high": 31,    "unit": "°"},
    "L1-OP":        {"name": "L1/OP",                 "low": 60,    "high": 68,    "unit": "°"},
    "InterIncisal": {"name": "Interincisal",          "low": 124,   "high": 136,   "unit": "°"},

    # ── Soft Tissue ──
    "Nasolabial":   {"name": "Nasolabial Angle",      "low": 96,    "high": 112,   "unit": "°"},
    "E-Upper":      {"name": "E-Upper lip",           "low": -6,    "high": -2,    "unit": "mm"},
    "E-Lower":      {"name": "E-Lower lip",           "low": -4,    "high": 0,     "unit": "mm"},
}

# Mapping from Excel row index (0-based from Row 3) to measurement key
# 33 parameters matching the reference table (Placeholder number = index + 1)
EXCEL_ROW_MAP = [
    "SNA",        # 0  → PH1
    "SNB",        # 1  → PH2
    "ANB",        # 2  → PH3
    "N-A",        # 3  → PH4
    "N-Pog",      # 4  → PH5
    "Wits",       # 5  → PH6
    "Y-Axis",     # 6  → PH7
    "SN-GoMe",    # 7  → PH8
    "SN-PP",      # 8  → PH9
    "Mx-Md",      # 9  → PH10
    "FMA",        # 10 → PH11
    "N-Me",       # 11 → PH12
    "S-Go",       # 12 → PH13
    "S-Go/N-Me",  # 13 → PH14
    "ANS-Me",     # 14 → PH15
    "Co-A",       # 15 → PH16
    "Co-Gn",      # 16 → PH17
    "S-N",        # 17 → PH18
    "Go-Me",      # 18 → PH19
    "U1-SN",      # 19 → PH20
    "U1-PP",      # 20 → PH21
    "U1-NA-mm",   # 21 → PH22
    "U1-NA-deg",  # 22 → PH23
    "U1-OP",      # 23 → PH24
    "L1-Apog",    # 24 → PH25
    "IMPA",       # 25 → PH26
    "L1-NB-mm",   # 26 → PH27
    "L1-NB-deg",  # 27 → PH28
    "L1-OP",      # 28 → PH29
    "InterIncisal", # 29 → PH30
    "Nasolabial", # 30 → PH31
    "E-Upper",    # 31 → PH32
    "E-Lower",    # 32 → PH33
]


def evaluate_values(data: dict) -> list:
    """
    Evaluate each cephalometric value against its reference range.
    Returns list of dicts: {key, name, value, low, high, unit, status}
    status: 'normal' | 'high' | 'low'
    """
    results = []
    for key, val in data.items():
        if key not in REFERENCE_RANGES or val is None:
            continue
        ref = REFERENCE_RANGES[key]
        try:
            v = float(val)
        except (ValueError, TypeError):
            results.append({
                "key": key,
                "name": ref["name"],
                "value": val,
                "low": ref["low"],
                "high": ref["high"],
                "unit": ref["unit"],
                "status": "unknown",
            })
            continue

        if v < ref["low"]:
            status = "low"
        elif v > ref["high"]:
            status = "high"
        else:
            status = "normal"

        results.append({
            "key": key,
            "name": ref["name"],
            "value": round(v, 1),
            "low": ref["low"],
            "high": ref["high"],
            "unit": ref["unit"],
            "status": status,
        })
    return results


def generate_diagnosis(data: dict) -> dict:
    """
    Generate auto-diagnosis text based on cephalometric values.
    Returns:
      {
        skeletal_class: str,
        growth_pattern: str,
        dental_summary: str,
        soft_tissue_summary: str,
        full_text: str,
      }
    """
    diag = {
        "skeletal_class": "",
        "growth_pattern": "",
        "dental_summary": "",
        "soft_tissue_summary": "",
        "full_text": "",
    }
    parts = []

    # ── Skeletal Class (ANB-based) ──
    anb = _get_float(data, "ANB")
    wits = _get_float(data, "Wits")
    if anb is not None:
        if anb > 4:
            diag["skeletal_class"] = "İskeletsel Sınıf II"
        elif anb < 0:
            diag["skeletal_class"] = "İskeletsel Sınıf III"
        else:
            diag["skeletal_class"] = "İskeletsel Sınıf I"
        parts.append(diag["skeletal_class"])

        if anb > 4:
            sna = _get_float(data, "SNA")
            snb = _get_float(data, "SNB")
            if sna is not None and snb is not None:
                if sna > 84 and snb < 78:
                    parts.append("(Maksiller protrüzyon + Mandibüler retrüzyon)")
                elif sna > 84:
                    parts.append("(Maksiller protrüzyon)")
                elif snb < 78:
                    parts.append("(Mandibüler retrüzyon)")
        elif anb < 0:
            sna = _get_float(data, "SNA")
            snb = _get_float(data, "SNB")
            if sna is not None and snb is not None:
                if sna < 80 and snb > 82:
                    parts.append("(Maksiller retrüzyon + Mandibüler protrüzyon)")
                elif sna < 80:
                    parts.append("(Maksiller retrüzyon)")
                elif snb > 82:
                    parts.append("(Mandibüler protrüzyon)")

    # ── Growth Pattern ──
    gogn = _get_float(data, "SN-GoMe")
    fma = _get_float(data, "FMA")
    indicator = gogn if gogn is not None else fma

    if indicator is not None:
        low_thresh = 25 if gogn is not None else 20
        high_thresh = 39 if gogn is not None else 30
        if indicator > high_thresh:
            diag["growth_pattern"] = "Hiperdiverjant (Dik yön) Büyüme Paterni"
        elif indicator < low_thresh:
            diag["growth_pattern"] = "Hipodiverjant (Yatay yön) Büyüme Paterni"
        else:
            diag["growth_pattern"] = "Normodiverjant Büyüme Paterni"
        parts.append(diag["growth_pattern"])

    # ── Dental ──
    dental_items = []
    u1na = _get_float(data, "U1-NA-deg")
    if u1na is not None:
        if u1na > 28:
            dental_items.append("Üst kesici protrüzyonu")
        elif u1na < 16:
            dental_items.append("Üst kesici retrüzyonu")

    l1nb = _get_float(data, "L1-NB-deg")
    if l1nb is not None:
        if l1nb > 31:
            dental_items.append("Alt kesici protrüzyonu")
        elif l1nb < 19:
            dental_items.append("Alt kesici retrüzyonu")

    if dental_items:
        diag["dental_summary"] = ", ".join(dental_items)
        parts.append("Dental: " + diag["dental_summary"])

    # ── Soft Tissue ──
    st_items = []
    naso = _get_float(data, "Nasolabial")
    if naso is not None:
        if naso > 110:
            st_items.append("Nasolabial açı artmış (retrüzif profil)")
        elif naso < 90:
            st_items.append("Nasolabial açı azalmış (protrüzif profil)")

    e_upper = _get_float(data, "E-Upper")
    e_lower = _get_float(data, "E-Lower")
    if e_upper is not None and e_upper > -2:
        st_items.append("Üst dudak protrüzif")
    if e_lower is not None and e_lower > 0:
        st_items.append("Alt dudak protrüzif")

    if st_items:
        diag["soft_tissue_summary"] = ", ".join(st_items)
        parts.append("Yumuşak Doku: " + diag["soft_tissue_summary"])

    diag["full_text"] = " | ".join(parts) if parts else "Değerlendirme için veriler yetersiz"
    return diag


def get_placeholder_38_text(data: dict) -> str:
    """Skeletal class text for PPTX Placeholder 38 (based on ANB angle)."""
    anb = _get_float(data, "ANB")
    if anb is None:
        return ""
    if anb < 0:
        return "Class III skeletal relationship"
    elif anb > 4:
        return "Class II skeletal relationship"
    return "Class I skeletal relationship"


def get_placeholder_40_text(data: dict) -> str:
    """Growth pattern text for PPTX Placeholder 40 (based on SN-GoMe / FMA)."""
    gogn = _get_float(data, "SN-GoMe")
    fma  = _get_float(data, "FMA")
    indicator = gogn if gogn is not None else fma
    if indicator is None:
        return ""
    low  = 25 if gogn is not None else 20
    high = 39 if gogn is not None else 30
    if indicator < low:
        return "Low angle growth pattern"
    elif indicator > high:
        return "High angle growth pattern"
    return "Normal angle growth pattern"


def get_placeholder_41_text(data: dict) -> str:
    """1-1 angle (Interincisal) assessment for PPTX Placeholder 41.
    > 136  → increased
    124-136 → normal
    < 124  → decreased
    """
    angle = _get_float(data, "InterIncisal")
    if angle is None:
        return ""
    if angle > 136:
        return "1-1 angle is increased"
    elif angle >= 124:
        return "1-1 angle is normal"
    else:
        return "1-1 angle is decreased"


def _jaw_position_text(v1, low1, high1, v2, low2, high2) -> str:
    """Return the 9-combination maxilla/mandible position text."""
    def _pos(v, lo, hi):
        if v > hi:  return "prognathic"
        if v < lo:  return "retrognathic"
        return "normal"

    p1 = _pos(v1, low1, high1)
    p2 = _pos(v2, low2, high2)

    if p1 == "prognathic"    and p2 == "prognathic":    return "Maxilla & mandible are prognathic"
    if p1 == "prognathic"    and p2 == "normal":        return "Maxilla is prognathic & mandible is normal"
    if p1 == "prognathic"    and p2 == "retrognathic":  return "Maxilla is prognathic & mandible is retrognathic"
    if p1 == "normal"        and p2 == "prognathic":    return "Maxilla is normal & mandible is prognathic"
    if p1 == "normal"        and p2 == "normal":        return "Maxilla and Mandible are normal"
    if p1 == "normal"        and p2 == "retrognathic":  return "Maxilla is normal & Mandible is retrognathic"
    if p1 == "retrognathic"  and p2 == "prognathic":    return "Maxilla is retrognathic & mandible is prognathic"
    if p1 == "retrognathic"  and p2 == "normal":        return "Maxilla is retrognathic & mandible is normal"
    return "Maxilla & mandible are retrognathic"


def get_placeholder_80_text(data: dict) -> str:
    """SNA + SNB combination text for PPTX Placeholder 80."""
    sna = _get_float(data, "SNA")
    snb = _get_float(data, "SNB")
    if sna is None or snb is None:
        return ""
    ref_sna = REFERENCE_RANGES["SNA"]
    ref_snb = REFERENCE_RANGES["SNB"]
    return _jaw_position_text(
        sna, ref_sna["low"], ref_sna["high"],
        snb, ref_snb["low"], ref_snb["high"],
    )


def get_placeholder_81_text(data: dict) -> str:
    """Wits + N-A combination text for PPTX Placeholder 81."""
    wits = _get_float(data, "Wits")
    na   = _get_float(data, "N-A")
    if wits is None or na is None:
        return ""
    ref_wits = REFERENCE_RANGES["Wits"]
    ref_na   = REFERENCE_RANGES["N-A"]
    return _jaw_position_text(
        wits, ref_wits["low"], ref_wits["high"],
        na,   ref_na["low"],   ref_na["high"],
    )


def _incisor_status(val: float, low: float, high: float) -> str:
    if val < low:  return "low"
    if val > high: return "high"
    return "normal"


def _incisor_combo_text(pos: str, inc: str, tooth: str) -> str:
    """Return clinical text for the 9 position×inclination combinations."""
    if pos == "low"    and inc == "low":    return f"Retruded and retroclined {tooth} incisors"
    if pos == "high"   and inc == "high":   return f"Protruded and proclined {tooth} incisors"
    if pos == "high"   and inc == "low":    return f"Protruded and retroclined {tooth} incisors"
    if pos == "low"    and inc == "high":   return f"Retruded and proclined {tooth} incisors"
    if pos == "normal" and inc == "normal": return f"Normally positioned and inclined {tooth} incisors"
    if pos == "normal" and inc == "low":    return f"Normally positioned and retroclined {tooth} incisors"
    if pos == "high"   and inc == "normal": return f"Protruded and normally inclined {tooth} incisors"
    if pos == "low"    and inc == "normal": return f"Retruded and normally inclined {tooth} incisors"
    if pos == "normal" and inc == "high":   return f"Normally positioned and proclined {tooth} incisors"
    return ""


def _get_status(data: dict, key: str) -> str:
    """Returns 'high', 'low', or 'normal' for a value vs its reference range."""
    val = _get_float(data, key)
    if val is None or key not in REFERENCE_RANGES:
        return "normal"
    ref = REFERENCE_RANGES[key]
    if val > ref["high"]: return "high"
    if val < ref["low"]:  return "low"
    return "normal"


def get_placeholder_95_text(data: dict) -> str:
    """Nasolabial angle: increased / normal / decreased."""
    if _get_float(data, "Nasolabial") is None: return ""
    s = _get_status(data, "Nasolabial")
    return "increased" if s == "high" else ("decreased" if s == "low" else "normal")


def get_placeholder_96_text(data: dict) -> str:
    """E-Upper lip: protruded / normal / retruded."""
    if _get_float(data, "E-Upper") is None: return ""
    s = _get_status(data, "E-Upper")
    return "protruded" if s == "high" else ("retruded" if s == "low" else "normal")


def get_placeholder_97_text(data: dict) -> str:
    """E-Lower lip: protruded / normal / retruded."""
    if _get_float(data, "E-Lower") is None: return ""
    s = _get_status(data, "E-Lower")
    return "protruded" if s == "high" else ("retruded" if s == "low" else "normal")


def get_placeholder_70_text(data: dict) -> str:
    """Upper incisor combination text for PH70 (U1-NA mm × U1-SN deg).
    Position: U1-NA mm  (ref 1–7 mm)
    Inclination: U1-SN  (ref 97–107°)  ← PH20
    """
    mm  = _get_float(data, "U1-NA-mm")
    deg = _get_float(data, "U1-SN")
    if mm is None or deg is None:
        return ""
    ref_mm  = REFERENCE_RANGES["U1-NA-mm"]
    ref_deg = REFERENCE_RANGES["U1-SN"]
    return _incisor_combo_text(
        _incisor_status(mm,  ref_mm["low"],  ref_mm["high"]),
        _incisor_status(deg, ref_deg["low"], ref_deg["high"]),
        "upper",
    )


def get_placeholder_71_text(data: dict) -> str:
    """Lower incisor combination text for PH71 (L1-NB mm × IMPA).
    Position: L1-NB mm  (ref 2–6 mm)
    Inclination: IMPA (L1-MeGo)  (ref 85–95°)  ← PH26
    """
    mm  = _get_float(data, "L1-NB-mm")
    deg = _get_float(data, "IMPA")
    if mm is None or deg is None:
        return ""
    ref_mm  = REFERENCE_RANGES["L1-NB-mm"]
    ref_deg = REFERENCE_RANGES["IMPA"]
    return _incisor_combo_text(
        _incisor_status(mm,  ref_mm["low"],  ref_mm["high"]),
        _incisor_status(deg, ref_deg["low"], ref_deg["high"]),
        "lower",
    )


def _get_float(data: dict, key: str):
    """Safely extract a float value from data dict."""
    val = data.get(key)
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


# ──────────────────────────────────────────────
# Co-A based dynamic reference tables
# Each entry corresponds to a Co-A value starting from 65 mm (index 0) to 105 mm (index 40)
# ──────────────────────────────────────────────
_CO_A_TABLE_START = 65

_CO_GN_REF = [
    (67, 70), (69, 72), (71, 74), (73, 76), (75, 78), (77, 80), (79, 82), (81, 84),
    (83, 86), (85, 88), (87, 90), (89, 92), (91, 94), (93, 96), (95, 98), (97, 100),
    (99, 102), (101, 104), (103, 106), (104, 107), (105, 108), (107, 110), (109, 112),
    (111, 114), (112, 115), (113, 116), (115, 118), (117, 120), (119, 122), (121, 124),
    (122, 125), (124, 127), (126, 129), (127, 130), (129, 132), (131, 134), (132, 135),
    (134, 137), (136, 139), (137, 140), (138, 141),
]

_ANS_ME_REF = [
    (49, 50), (50, 51), (50, 51), (51, 52), (51, 52), (52, 53), (52, 53), (53, 54),
    (53, 54), (54, 55), (54, 55), (55, 56), (55, 56), (56, 57), (56, 57), (57, 58),
    (57, 58), (58, 59), (58, 59), (59, 60), (60, 62), (60, 62), (61, 63), (61, 63),
    (62, 64), (63, 64), (63, 64), (64, 65), (65, 66), (66, 67), (67, 68), (67, 69),
    (68, 70), (68, 70), (69, 71), (70, 74), (71, 75), (72, 76), (73, 77), (74, 78),
    (75, 79),
]


def _get_co_a_table_index(co_a_val: float) -> int:
    idx = round(co_a_val) - _CO_A_TABLE_START
    return max(0, min(len(_CO_GN_REF) - 1, idx))


def get_co_gn_ref_for_coa(co_a_val: float) -> tuple:
    """Return (low, high) Co-Gn reference range for the given Co-A value."""
    return _CO_GN_REF[_get_co_a_table_index(co_a_val)]


def get_ans_me_ref_for_coa(co_a_val: float) -> tuple:
    """Return (low, high) Ans-Me reference range for the given Co-A value."""
    return _ANS_ME_REF[_get_co_a_table_index(co_a_val)]
