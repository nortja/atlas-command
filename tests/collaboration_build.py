"""Stage the exact owner-preview integration order without modifying source.
Run with Python, then run the Node suite and collaboration_ui.cjs against the
printed directory. No native build, networking, installation or personal data.
"""
from pathlib import Path
import hashlib
import re
import shutil
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]


def main():
    results = ROOT / 'test-results'
    results.mkdir(exist_ok=True)
    stage = results / ('collaboration-integrated-' + uuid.uuid4().hex[:12])
    stage.mkdir()
    for folder in ['app', 'build', 'native', 'packaging', 'tests', 'docs', 'submission', '.github']:
        shutil.copytree(ROOT / folder, stage / folder, ignore=shutil.ignore_patterns('__pycache__'))
    workflow = (ROOT / '.github/workflows/owner-preview.yml').read_text('utf-8')
    recipes = re.findall(r'^          python (build/integrate_[a-z0-9_]+\.py)$', workflow, re.M)
    assert recipes and recipes[-1] == 'build/integrate_collaboration.py'
    for recipe in recipes:
        subprocess.run([sys.executable, str(stage / recipe)], check=True, cwd=stage)

    def snapshot():
        return {str(p.relative_to(stage)): hashlib.sha256(p.read_bytes()).hexdigest()
                for folder in ['app', 'native', 'build'] for p in (stage / folder).rglob('*') if p.is_file()}

    before = snapshot()
    subprocess.run([sys.executable, str(stage / recipes[-1])], check=True, cwd=stage)
    assert before == snapshot(), 'Collaboration integration must be idempotent.'
    print('STAGED_APP=' + str(stage / 'app'), flush=True)


if __name__ == '__main__':
    main()
