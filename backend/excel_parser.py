"""
Excel Parser for Cephalometric Data
OrthoSlide Expert V2

Reads .xlsx measurement exports; values are matched by row label
(falls back to Column B / Row 3 order when labels are not recognised).
"""
import os
import re
import pandas as pd
from ceph_logic import EXCEL_ROW_MAP


def _ensure_xlsx(file_path: str) -> str:
    """
    Accepts .xls or .xlsx files and always returns a path to a valid .xlsx.

    Handles four formats:
      1. Already .xlsx                → return as-is
      2. ZIP-based (xlsx renamed .xls) → copy with .xlsx extension
      3. HTML-based XLS (some tools export measurement tables as HTML with .xls)
         → parse with pd.read_html, rebuild proper xlsx layout
      4. Binary XLS (BIFF format)    → convert cell-by-cell with xlrd
      Fallback: pandas xlrd engine
    """
    if file_path.lower().endswith('.xlsx'):
        return file_path

    xlsx_path = os.path.splitext(file_path)[0] + '_converted.xlsx'

    # ── Case 1: file is a ZIP (xlsx content with wrong extension) ──
    import zipfile
    if zipfile.is_zipfile(file_path):
        import shutil
        shutil.copy2(file_path, xlsx_path)
        return xlsx_path

    # ── Case 2: HTML-based XLS ──
    # Detect by checking first bytes for BOM + '<' or just '<'
    try:
        with open(file_path, 'rb') as _f:
            _head = _f.read(64)
        _is_html = _head.lstrip(b'\xef\xbb\xbf').lstrip()[:1] == b'<'
    except Exception:
        _is_html = False

    if _is_html:
        try:
            import openpyxl

            tables = pd.read_html(file_path, encoding='utf-8', flavor='lxml')
            wb = openpyxl.Workbook()
            ws = wb.active

            # Table 0 = patient info row: col0=name, col4=gender
            if tables:
                t0 = tables[0]
                if len(t0) > 0:
                    val_name = t0.iloc[0, 0]
                    ws.cell(1, 1, str(val_name) if pd.notna(val_name) else '')
                    if t0.shape[1] >= 4:
                        val_age = t0.iloc[0, 3]   # '24Y, 7M'
                        if pd.notna(val_age):
                            ws.cell(1, 4, str(val_age))
                    if t0.shape[1] >= 5:
                        val_gender = t0.iloc[0, 4]
                        if pd.notna(val_gender):
                            ws.cell(1, 5, str(val_gender))

            # Tables 2+ = one measurement per table (table 1 is the column header)
            data_tables = [t for t in tables[2:] if len(t) > 0]
            for offset, tbl in enumerate(data_tables):
                excel_row = 3 + offset           # Row 3 = parse_excel start
                label = tbl.iloc[0, 0]
                ws.cell(excel_row, 1, str(label) if pd.notna(label) else '')
                if tbl.shape[1] > 1:
                    raw = tbl.iloc[0, 1]
                    if pd.notna(raw):
                        try:
                            ws.cell(excel_row, 2, float(raw))
                        except (ValueError, TypeError):
                            ws.cell(excel_row, 2, str(raw))

            wb.save(xlsx_path)
            return xlsx_path
        except Exception as e:
            raise ValueError(f"HTML-XLS dönüştürme hatası: {e}")

    # ── Case 3: Binary XLS (BIFF) via xlrd ──
    try:
        import xlrd
        import openpyxl

        wb_in = xlrd.open_workbook(file_path)
        ws_in = wb_in.sheet_by_index(0)
        wb_out = openpyxl.Workbook()
        ws_out = wb_out.active

        for row in range(ws_in.nrows):
            for col in range(ws_in.ncols):
                ws_out.cell(row + 1, col + 1, ws_in.cell(row, col).value)

        wb_out.save(xlsx_path)
        return xlsx_path
    except ImportError:
        pass  # xlrd not installed — fall through
    except Exception as e:
        raise ValueError(f"XLS dönüştürme hatası: {e}. Dosyayı .xlsx olarak kaydedin.")

    # ── Fallback: pandas xlrd engine ──
    try:
        df = pd.read_excel(file_path, header=None, engine='xlrd')
        df.to_excel(xlsx_path, index=False, header=False, engine='openpyxl')
        return xlsx_path
    except Exception as e:
        raise ValueError(
            f"XLS dosyası okunamadı. Excel'de açıp 'Farklı Kaydet → .xlsx' ile kaydedin. ({e})"
        )


# Ölçüm yazılımının satır etiketleri → ölçüm anahtarı (küçük harf, sadece harf/rakam)
LABEL_ALIASES = {
    "SNA":          ["sna"],
    "SNB":          ["snb"],
    "ANB":          ["anb"],
    "N-A":          ["atonperpfh", "atonperp"],
    "N-Pog":        ["pogtonperpfh", "pogtonperp"],
    "Wits":         ["witsappraisal", "wits"],
    "Y-Axis":       ["yaxistosn", "yaxis"],
    "SN-GoMe":      ["sngome"],
    "SN-PP":        ["sntomaxillaryplane", "snpp"],
    "Mx-Md":        ["maxillarymandibularplanesangle"],
    "FMA":          ["fma"],
    "N-Me":         ["anteriorfacialheight"],
    "S-Go":         ["posteriorfacialheight"],
    "S-Go/N-Me":    ["facialheightratiopfhafh", "facialheightratio"],
    "ANS-Me":       ["loweranteriorfacialheight"],
    "Co-A":         ["effectivemiddlefacecoa", "effectivemiddleface"],
    "Co-Gn":        ["effectivelengthofmandible", "effectivelengthofmandiblecogn"],
    "S-N":          ["anteriorcranialbaselength", "anteriorcranialbaselengthsn"],
    "Go-Me":        ["corpuslength", "corpuslengthgome"],
    "U1-SN":        ["u1tosn"],
    "U1-PP":        ["u1tomaxillaryplaneangle", "u1tomaxillaryplane"],
    "U1-NA-mm":     ["u1tonamm"],
    "U1-NA-deg":    ["u1tonadeg"],
    "U1-OP":        ["u1touop"],
    "L1-Apog":      ["l1toapogmm", "l1toapog"],
    "IMPA":         ["impa"],
    "L1-NB-mm":     ["l1tonbmm"],
    "L1-NB-deg":    ["l1tonbdeg"],
    "L1-OP":        ["l1tolop"],
    "InterIncisal": ["interincisalangle"],
    "Nasolabial":   ["nasolabialangle"],
    "E-Upper":      ["upperliptoeplane"],
    "E-Lower":      ["lowerliptoeplane"],
}
_ALIAS_TO_KEY = {a: k for k, aliases in LABEL_ALIASES.items() for a in aliases}


def _norm_label(v) -> str:
    return re.sub(r"[^a-z0-9]", "", str(v).lower())


def _to_number(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    try:
        return float(str(v).strip().replace(",", "."))
    except ValueError:
        return None


def _parse_by_label(df) -> dict:
    """Etiket hücresini bul, sağındaki ilk sayıyı değer olarak al (format/sıra bağımsız)."""
    data = {}
    for r in range(len(df)):
        for c in range(df.shape[1] - 1):
            key = _ALIAS_TO_KEY.get(_norm_label(df.iat[r, c]))
            if key is None or key in data:
                continue
            val = _to_number(df.iat[r, c + 1])
            if val is not None:
                data[key] = val
    return data


def _parse_by_position(df) -> dict:
    """Eski yöntem: Sütun B, satır 3'ten itibaren EXCEL_ROW_MAP sırası."""
    data = {}
    for i, key in enumerate(EXCEL_ROW_MAP):
        row_idx = 2 + i
        if row_idx < len(df):
            raw_value = df.iloc[row_idx, 1]
            if pd.notna(raw_value):
                try:
                    data[key] = float(raw_value)
                except (ValueError, TypeError):
                    data[key] = str(raw_value)
    return data


def parse_excel(file_path: str, report: dict = None) -> dict:
    """
    Parse an Excel file and return a dict of measurement_key → value.

    Değerler satır etiketine göre okunur (A sütunu "SNA", "U1 to NA(mm)" … → yanındaki sayı),
    böylece satır kayması olan / farklı düzendeki dışa aktarımlar yanlış okunmaz.
    Etiketler tanınmazsa eski satır-sırası yöntemine düşülür ve `report` içinde uyarı verilir.
    """
    file_path = _ensure_xlsx(file_path)
    df = pd.read_excel(file_path, header=None, engine="openpyxl")

    found = _parse_by_label(df)
    method = "label"
    if len(found) < len(EXCEL_ROW_MAP) // 2:
        found = _parse_by_position(df)
        method = "position"

    data = {key: found.get(key) for key in EXCEL_ROW_MAP}
    if report is not None:
        report["method"] = method
        report["missing"] = [k for k in EXCEL_ROW_MAP if data[k] is None]
    return data


_AGE_RE = re.compile(r"(?<!\d)(\d{1,3})\s*Y\s*,?\s*(\d{1,2})\s*M", re.IGNORECASE)


def parse_patient_info(file_path: str) -> dict:
    """
    Parse patient info from the first rows of the Excel file.
    Name: 'Surname, Name(ID)' (A1).  Gender: 'Female'/'Male'.  Age: '24Y, 8M'.
    Hücre konumuna bağlı değil — ilk iki satırda aranır (farklı dışa aktarım düzenleri için).
    """
    try:
        file_path = _ensure_xlsx(file_path)
        df = pd.read_excel(file_path, header=None, engine="openpyxl", nrows=2)
        cells = [str(v).strip() for v in df.values.flatten().tolist() if pd.notna(v)]
        info = {"patient_name": "", "gender": ""}

        # Ad: 'soyad, ad(ID)…' → 'ad soyad'
        for c in cells:
            m = re.match(r"^\s*([^,(\d]+),\s*([^,(\d]+)", c)
            if m:
                info["patient_name"] = re.sub(r"\s+", " ", f"{m.group(2).strip()} {m.group(1).strip()}")
                break
        else:
            if cells:
                info["patient_name"] = re.sub(r"\s+", " ", re.sub(r"\(.*?\)", "", cells[0])).strip()

        for c in cells:
            if c.lower() in ("female", "male"):
                info["gender"] = c.capitalize()
                break

        for c in cells:
            m = _AGE_RE.search(c)
            if m:
                info["age_year"] = m.group(1)
                info["age_month"] = str(int(m.group(2)))
                break

        return info
    except Exception as e:
        print(f"Error parsing patient info: {e}")
        return {"patient_name": "", "gender": ""}
