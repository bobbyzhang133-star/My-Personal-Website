"""Copy original sprite pixels and translate their native animation metadata.

No images are redrawn, resized, recolored, or flattened. Unity bottom-origin
sprite rectangles become canvas top-origin rectangles. Run only with the
supplied drive connected; imported assets then work without the drive.
"""
import json
import re
import shutil
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[1]
DRIVE = Path('/Volumes/adol U300')
DEST = REPO / 'public/portfolio/assets/game-source/animations'
DEST.mkdir(parents=True, exist_ok=True)


def copy(source, name):
    target = DEST / name
    # Source drive files may carry immutable flags. Copy pixels, not those flags.
    if not target.exists() or target.read_bytes() != source.read_bytes():
        shutil.copyfile(source, target)
    return '/assets/game-source/animations/' + name


def gm_clip(root, name, label):
    folder = root / name
    data = json.loads(re.sub(r',\s*([}\]])', r'\1', (folder / (name + '.yy')).read_text()))
    sequence = data['sequence']
    fps = sequence['playbackSpeed']
    frames = []
    for index, frame in enumerate(data['frames']):
        source = folder / (frame['name'] + '.png')
        frames.append({'time': index / fps, 'src': copy(source, f'{label}-{index}.png'),
                       'rect': [0, 0, data['width'], data['height']]})
    return {'duration': len(frames) / fps, 'loop': True, 'frames': frames,
            'source': str(folder / (name + '.yy'))}


bird = DRIVE / 'The-last-bird-/the-last-brid/sprites'
bird_clips = {state: gm_clip(bird, name, 'bird-' + state) for state, name in [
    ('idle', 'spr_MainBird_stand'), ('moveRight', 'spr_MainBird_right'),
    ('moveLeft', 'spr_MainBird_left')]}
breakout_clips = {'idle': gm_clip(DRIVE / 'Chickens-Breakout/sprites', 'spr_DeadMan', 'breakout-enemy')}

unity = DRIVE / 'CMU/nhsga/Lightning_Round/NHSGA_Asteroids/LR_asteroids/Assets/Animations/Squishy Animations/Level 1'
atlas = unity / 'bdubose_SquishyAnimations.png'
atlas_url = copy(atlas, 'squishy-atlas.png')
atlas_height = Image.open(atlas).height
meta = (unity / 'bdubose_SquishyAnimations.png.meta').read_text()
rects = {}
for block in meta.split('    - serializedVersion: 2')[1:]:
    match = re.search(r'name: (bdubose_SquishyAnimations_\d+).*?x: (\d+)\s+y: (\d+)\s+width: (\d+)\s+height: (\d+).*?internalID: (-?\d+)', block, re.S)
    if match:
        name, x, y, w, h, file_id = match.groups()
        x, y, w, h = map(int, [x, y, w, h])
        rects[file_id] = [x, atlas_height - y - h, w, h]


def unity_clip(relative, expected_guid='e794c7cc723724d2980c4e1fa1ad39b1'):
    path = unity / relative
    text = path.read_text()
    curve = text.split('  m_PPtrCurves:')[1].split('    attribute:')[0]
    keys = re.findall(r'- time: ([\d.]+)\s+value: \{fileID: (-?\d+), guid: (\w+)', curve)
    frames = []
    for time, file_id, guid in keys:
        assert guid == expected_guid, 'Unexpected sprite atlas'
        frames.append({'time': float(time), 'src': atlas_url, 'rect': rects[file_id]})
    assert frames
    return {'duration': float(re.search(r'm_StopTime: ([\d.]+)', text)[1]),
            'loop': re.search(r'm_LoopTime: (\d)', text)[1] == '1',
            'frames': frames, 'source': str(path)}


squishy_clips = {state: unity_clip(path) for state, path in [
    ('idle', 'Still Idle/SquishyIdle.anim'), ('start', 'Move Start/SquishyMove_Start.anim'),
    ('move', 'Move Loop/SquishyMove_Loop.anim'), ('end', 'Move End/SquishyMove_End.anim')]}


def bounds(clips):
    """One alpha-union crop for every frame, never per-frame auto-rescaling."""
    boxes = []
    for clip in clips.values():
        for frame in clip['frames']:
            image = Image.open(REPO / 'public/portfolio' / frame['src'].lstrip('/')).convert('RGBA')
            x, y, w, h = frame['rect']
            box = image.getchannel('A').crop((x, y, x+w, y+h)).getbbox()
            assert box, 'Empty native frame'
            boxes.append(box)
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    return [left, top, right-left, bottom-top]


data = {
    'one-last-bird': {'clips': bird_clips, 'crop': bounds(bird_clips), 'facing': 1, 'preview': 'moveRight'},
    'plasteroids': {'clips': squishy_clips, 'crop': bounds(squishy_clips), 'facing': -1, 'preview': 'move'},
    'breakout-enemy': {'clips': breakout_clips, 'crop': bounds(breakout_clips), 'facing': 1, 'preview': 'idle'},
}
for level, name, idle, move in [
    (2, 'bdubose_SquishyAnimationLVL2.png', 'Still Idle/New Animation.anim', 'Move Loop/SquishyMoveLoop_Lvl2.anim'),
    (3, 'bdubose_SquishyAnimationLVL3.png', 'Still Idle/Squishy Idle LVL3.anim', 'Move Loop/New Animation.anim'),
]:
    unity = unity.parent / ('Level ' + str(level))
    atlas = unity / name
    atlas_url = copy(atlas, 'squishy-level-' + str(level) + '-atlas.png')
    atlas_height = Image.open(atlas).height
    meta = (unity / (name + '.meta')).read_text()
    expected_guid = re.search(r'^guid: (\w+)', meta, re.M)[1]
    rects = {}
    for block in meta.split('    - serializedVersion: 2')[1:]:
        match = re.search(r'name: (\S+).*?x: (\d+)\s+y: (\d+)\s+width: (\d+)\s+height: (\d+).*?internalID: (-?\d+)', block, re.S)
        if match:
            _, x, y, w, h, file_id = match.groups()
            x, y, w, h = map(int, [x, y, w, h])
            rects[file_id] = [x, atlas_height-y-h, w, h]
    clips = {'idle': unity_clip(idle, expected_guid), 'move': unity_clip(move, expected_guid)}
    data['plasteroids-level-' + ('two' if level == 2 else 'three')] = {'clips': clips, 'crop': bounds(clips), 'facing': -1, 'preview': 'move'}
(REPO / 'public/portfolio/assets/js/game-animation-data.js').write_text(
    '// Generated from supplied GameMaker/Unity metadata by scripts/import-game-animations.py.\n'
    'export const GAME_ANIMATIONS = ' + json.dumps(data, indent=2) + ';\n')
print({key: {'crop': value['crop'], 'clips': list(value['clips'])} for key, value in data.items()})
