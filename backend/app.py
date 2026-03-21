"""
Flask API Server
OrthoSlide Expert V2

Endpoints:
  POST /api/parse-excel   → parse Excel, return ceph values + diagnosis
  POST /api/generate-pptx → generate PPTX from data + images
  GET  /api/health        → health check
  GET  /api/inspect-template → inspect PPTX template structure
"""
import os
import json
import uuid
import shutil
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from excel_parser import parse_excel, parse_patient_info
from ceph_logic import evaluate_values, generate_diagnosis, REFERENCE_RANGES, EXCEL_ROW_MAP
from pptx_engine import generate_pptx, inspect_template

_bundle = os.environ.get('ORTHO_BUNDLE_DIR')  # set by launcher.py when frozen
_exe    = os.environ.get('ORTHO_EXE_DIR')

# Frontend dist: inside bundle when frozen, or sibling folder in dev
if _bundle:
    DIST_DIR = os.path.join(_bundle, 'frontend', 'dist')
else:
    DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist')
_serve_static = os.path.isdir(DIST_DIR)

app = Flask(
    __name__,
    static_folder=DIST_DIR if _serve_static else None,
    static_url_path='',
)
CORS(app)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# When frozen by PyInstaller, sunum.pptx lives next to the .exe
_root = os.environ.get('ORTHO_EXE_DIR', os.path.join(BASE_DIR, '..'))
TEMPLATE_PATH = os.path.join(_root, 'sunum.pptx')
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# Ensure directories exist
os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    template_exists = os.path.exists(os.path.join(BASE_DIR, "..", "sunum.pptx"))
    return jsonify({
        "status": "ok",
        "template_found": template_exists,
        "version": "2.0.0",
    })


@app.route("/api/reference-ranges", methods=["GET"])
def get_reference_ranges():
    """Return all reference ranges for the frontend table."""
    ranges = []
    for key in EXCEL_ROW_MAP:
        if key in REFERENCE_RANGES:
            ref = REFERENCE_RANGES[key]
            ranges.append({
                "key": key,
                "name": ref["name"],
                "low": ref["low"],
                "high": ref["high"],
                "unit": ref["unit"],
            })
    return jsonify({"ranges": ranges})


@app.route("/api/parse-excel", methods=["POST"])
def parse_excel_endpoint():
    """
    Upload an Excel file, parse cephalometric data, return values + diagnosis.
    Returns JSON with: raw_data, evaluated, diagnosis, patient_info
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename.endswith((".xlsx", ".xls")):
        return jsonify({"error": "Invalid file type. Please upload .xlsx or .xls"}), 400

    # Save uploaded file
    file_id = str(uuid.uuid4())[:8]
    filename = f"{file_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    file.save(filepath)

    try:
        # Parse data
        raw_data = parse_excel(filepath)
        patient_info = parse_patient_info(filepath)

        # Evaluate values against reference ranges
        evaluated = evaluate_values(raw_data)

        # Generate diagnosis
        diagnosis = generate_diagnosis(raw_data)

        return jsonify({
            "success": True,
            "file_id": file_id,
            "patient_info": patient_info,
            "raw_data": {k: v for k, v in raw_data.items() if v is not None},
            "evaluated": evaluated,
            "diagnosis": diagnosis,
        })
    except Exception as e:
        return jsonify({"error": f"Failed to parse Excel: {str(e)}"}), 500


@app.route("/api/generate-pptx", methods=["POST"])
def generate_pptx_endpoint():
    """
    Generate a PPTX file from ceph data and images.
    
    Expects multipart form data:
      - ceph_data: JSON string of measurement values
      - patient_info: JSON string of patient info
      - slot_1 through slot_12: image files (optional)
    """
    # Template path
    template_path = TEMPLATE_PATH
    if not os.path.exists(template_path):
        return jsonify({"error": "Template sunum.pptx not found"}), 404

    # Parse ceph data from form
    ceph_data_str = request.form.get("ceph_data", "{}")
    patient_info_str = request.form.get("patient_info", "{}")

    try:
        ceph_data = json.loads(ceph_data_str)
        patient_info = json.loads(patient_info_str)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON in form data"}), 400

    # Save uploaded images
    session_id = str(uuid.uuid4())[:8]
    session_dir = os.path.join(UPLOAD_DIR, f"session_{session_id}")
    os.makedirs(session_dir, exist_ok=True)

    image_paths = {}
    for slot_key, img_file in request.files.items():
        if img_file.filename:
            ext = os.path.splitext(img_file.filename)[1] or ".jpg"
            img_path = os.path.join(session_dir, f"{slot_key}{ext}")
            img_file.save(img_path)
            image_paths[slot_key] = img_path

    # Generate PPTX
    output_filename = f"OrthoSlide_{patient_info.get('patient_name', 'output')}_{session_id}.pptx"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    try:
        generate_pptx(
            template_path=template_path,
            output_path=output_path,
            ceph_data=ceph_data,
            patient_info=patient_info,
            image_paths=image_paths,
        )
        return send_file(
            output_path,
            as_attachment=True,
            download_name=output_filename,
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        return jsonify({"error": f"PPTX generation failed: {str(e)}"}), 500
    finally:
        # Clean up session images
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir, ignore_errors=True)


@app.route("/api/convert-xls", methods=["POST"])
def convert_xls_endpoint():
    """
    Accept any .xls or .xlsx file, convert to .xlsx, return as download.
    Useful when the user has an old binary .xls file.
    """
    if "file" not in request.files:
        return jsonify({"error": "Dosya seçilmedi"}), 400

    file = request.files["file"]
    if not file.filename.lower().endswith((".xls", ".xlsx")):
        return jsonify({"error": "Sadece .xls veya .xlsx dosyası kabul edilir"}), 400

    from io import BytesIO
    from excel_parser import _ensure_xlsx

    file_id   = str(uuid.uuid4())[:8]
    orig_name = os.path.splitext(file.filename)[0]
    tmp_path  = os.path.join(UPLOAD_DIR, f"conv_{file_id}_{file.filename}")
    file.save(tmp_path)

    xlsx_path = None
    try:
        xlsx_path = _ensure_xlsx(tmp_path)
        with open(xlsx_path, "rb") as f:
            xlsx_bytes = BytesIO(f.read())
        xlsx_bytes.seek(0)
        return send_file(
            xlsx_bytes,
            as_attachment=True,
            download_name=f"{orig_name}.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        return jsonify({"error": f"Dönüştürme başarısız: {str(e)}"}), 500
    finally:
        for p in [tmp_path, xlsx_path]:
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except OSError:
                pass


@app.route("/api/inspect-template", methods=["GET"])
def inspect_template_endpoint():
    """Inspect the PPTX template and return its placeholder structure."""
    template_path = TEMPLATE_PATH
    if not os.path.exists(template_path):
        return jsonify({"error": "Template not found"}), 404
    try:
        structure = inspect_template(template_path)
        return jsonify({"slides": structure})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the built React frontend for all non-API routes."""
    if not _serve_static:
        return "Frontend not built. Run setup script first.", 404
    from flask import send_from_directory
    full = os.path.join(DIST_DIR, path)
    if path and os.path.isfile(full):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, 'index.html')


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 60)
    print("  OrthoSlide Expert V2")
    print(f"  http://localhost:{port}")
    print("=" * 60)
    app.run(host="0.0.0.0", debug=False, port=port)
