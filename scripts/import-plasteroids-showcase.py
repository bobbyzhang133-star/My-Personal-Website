"""Extract selected unchanged, user-supplied production evidence. No image edits."""
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artifacts/game-audit/Plasteroids Final Showcase_Real.pptx'
OUTPUT = ROOT / 'public/portfolio/assets/game-source/plasteroids-showcase'
FILES = {
    'level-one-gameplay.png': 'image79.png',
    'level-two-gameplay.png': 'image80.png',
    'boss-art.png': 'image69.png',
    'sound-synthesis.png': 'image87.png',
    'sound-processing.png': 'image88.png',
    'trash-small.png': 'image55.png',
    'trash-medium.png': 'image59.png',
    'trash-large.png': 'image62.png',
}

if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with ZipFile(SOURCE) as archive:
        for target, original in FILES.items():
            data = archive.read('ppt/media/' + original)
            (OUTPUT / target).write_bytes(data)
            print(f'{target}: {original}, {len(data)} bytes')
