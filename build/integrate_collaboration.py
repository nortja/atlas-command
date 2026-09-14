"""Materialize the session-only collaboration shell. No new network/CSP/API access.
Run after the owner-preview integration chain, or on the current source snapshot.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ['src/collaboration-model.js', 'src/collaboration-shell.js', 'src/collaboration-shell.css']


def before(source, anchor, addition):
    if addition in source:
        return source
    if source.count(anchor) != 1:
        raise RuntimeError('Collaboration integration anchor mismatch: ' + anchor)
    return source.replace(anchor, addition + anchor, 1)


# Validate all anchors before writing any output.
outputs = {}
for name in ['app/index.html', 'app/workspace-preview.html']:
    source = (ROOT / name).read_text('utf-8')
    source = before(source, '</head>', '<link rel="stylesheet" href="src/collaboration-shell.css">')
    source = before(source, '</body>',
                    '<script src="src/collaboration-model.js"></script><script src="src/collaboration-shell.js"></script>')
    outputs[name] = source

name = 'native/AtlasHost.cs'
source = (ROOT / name).read_text('utf-8')
for asset in ASSETS:
    token = 'rel == "' + asset + '" || '
    if token not in source:
        anchor = 'bool allowed = '
        if source.count(anchor) != 1:
            raise RuntimeError('Native allowlist anchor mismatch')
        source = source.replace(anchor, anchor + token, 1)
outputs[name] = source
for name in ['build/Build-OwnerPreview.ps1', 'build/Build-Store.ps1']:
    source = (ROOT / name).read_text('utf-8')
    for asset in ASSETS:
        source = before(source, "'src/app.js'", "'" + asset + "',")
    outputs[name] = source

for name, source in outputs.items():
    path = ROOT / name
    if source != path.read_text('utf-8'):
        path.write_text(source, encoding='utf-8', newline='\n')
print('Integrated session-only collaboration shell; encrypted storage and sync remain unavailable.')
import runpy
runpy.run_path(str(ROOT / 'build/integrate_team_vault.py'))
