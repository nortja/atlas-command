"""Phase 2 exact assets and guarded ciphertext-only native storage."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
assets = ['src/team-crypto.js', 'src/team-model.js', 'src/team-session.js', 'src/team-vault.js', 'src/team-review.js', 'src/team-shell.js', 'src/team-shell.css']
for name in ['app/index.html', 'app/workspace-preview.html']:
    p = ROOT / name
    source = p.read_text('utf-8')
    tags = '<link rel="stylesheet" href="src/team-shell.css">' + ''.join('<script src="'+a+'"></script>' for a in assets if a.endswith('.js'))
    if tags not in source:
        import re
        source = re.sub(r'<link rel="stylesheet" href="src/team-shell.css">(?:<script src="src/team-[a-z]+.js"></script>)+', '', source)
        assert source.count('</body>') == 1
        p.write_text(source.replace('</body>', tags+'</body>'), encoding='utf-8', newline='\n')
p = ROOT / 'native/AtlasHost.cs'
source = p.read_text('utf-8')
for asset in assets:
    token = 'rel == "'+asset+'" || '
    if token not in source:
        assert source.count('bool allowed = ') == 1
        source = source.replace('bool allowed = ', 'bool allowed = '+token, 1)
if 'static void HandleTeamVault(' not in source:
    anchor = '    static JavaScriptSerializer Json()'
    assert source.count(anchor) == 1
    source = source.replace(anchor, (ROOT/'build/team-vault-host.cs.txt').read_text('utf-8')+anchor)
route = '            if (rel == "api/team-vault") { HandleTeamVault(stream,method,headers,body); return; }\n'
if route not in source:
    anchor = '            if (rel == "api/state") {'
    assert source.count(anchor) == 1
    source = source.replace(anchor, route+anchor)
if 'static void HandleTeamDevice(' not in source:
    anchor = '    static JavaScriptSerializer Json()'
    assert source.count(anchor) == 1
    source = source.replace(anchor, (ROOT/'build/team-device-host.cs.txt').read_text('utf-8')+anchor)
route = '            if (rel == "api/team-device") { HandleTeamDevice(stream,method,headers); return; }\n'
if route not in source:
    anchor = '            if (rel == "api/state") {'
    assert source.count(anchor) == 1
    source = source.replace(anchor, route+anchor)
if source != p.read_text('utf-8'):
    p.write_text(source, encoding='utf-8', newline='\n')
for name in ['build/Build-OwnerPreview.ps1', 'build/Build-Store.ps1']:
    p = ROOT/name
    source = p.read_text('utf-8')
    for asset in assets:
        token = "'"+asset+"',"
        if token not in source:
            assert source.count("'src/app.js'") == 1
            source = source.replace("'src/app.js'",token+"'src/app.js'")
    if source != p.read_text('utf-8'):
        p.write_text(source, encoding='utf-8', newline='\n')
print('Integrated local encrypted team workspace.')
