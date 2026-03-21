# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for OrthoSlide Expert V2
"""
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

datas = [
    ('frontend/dist', 'frontend/dist'),
    ('backend',       'backend'),
]
datas += collect_data_files('pptx')
datas += collect_data_files('PIL')

hiddenimports = [
    'flask', 'flask.json', 'flask_cors',
    'werkzeug', 'werkzeug.serving', 'werkzeug.utils',
    'jinja2', 'click', 'itsdangerous', 'markupsafe',
    'openpyxl', 'openpyxl.styles', 'openpyxl.utils', 'openpyxl.reader.excel',
    'pptx', 'pptx.util', 'pptx.dml.color', 'pptx.enum.text',
    'PIL', 'PIL.Image', 'PIL.ImageOps', 'PIL.JpegImagePlugin',
    'pandas', 'pandas.core', 'pandas.io.excel._openpyxl',
    'xlrd',
    'lxml', 'lxml.etree', 'lxml.html',
    'ceph_logic', 'excel_parser', 'pptx_engine',
]

a = Analysis(
    ['launcher.py'],
    pathex=['.', 'backend'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'scipy', 'notebook', 'IPython',
              'test', 'unittest', 'doctest'],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='OrthoSlide',
    debug=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name='OrthoSlide',
)

app = BUNDLE(
    coll,
    name='OrthoSlide.app',
    icon=None,
    bundle_identifier='com.orthoslide.expert',
    info_plist={'NSHighResolutionCapable': True},
)
