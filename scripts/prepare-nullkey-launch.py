#!/usr/bin/env python3
"""Prepare an isolated launch preview. Never deploys or changes site access."""
import argparse,json,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PACKAGE=ROOT/'docs/nullkey-launch'
def prepare(destination):
    if destination.exists():
        raise SystemExit('Choose a new, empty destination; existing directories are never replaced.')
    edits=json.loads((PACKAGE/'changes.json').read_text())
    for edit in edits:
        if (ROOT/edit['file']).read_text().count(edit['old'])!=1:
            raise SystemExit('Source has changed; review the launch edit for '+edit['file'])
    files=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
    destination.mkdir(parents=True)
    for name in filter(None,files):
        if name.split('/')[0] in ('docs','scripts','services') or name.startswith('.'):
            continue
        source=ROOT/name
        if source.is_file():
            target=destination/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
    for source in (PACKAGE/'files').rglob('*'):
        if source.is_file():
            target=destination/source.relative_to(PACKAGE/'files')
            if target.exists():raise SystemExit('New launch file already exists: '+str(target))
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
    for edit in edits:
        target=destination/edit['file'];target.write_text(target.read_text().replace(edit['old'],edit['new'],1))
    print('Prepared local launch preview: '+str(destination))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview',type=Path,help='New directory for a complete local preview')
    args=parser.parse_args()
    if args.preview:prepare(args.preview.resolve())
    else:print('Launch content is staged under docs/nullkey-launch (excluded from hosting). Use --preview NEW_DIRECTORY. No public files changed.')
