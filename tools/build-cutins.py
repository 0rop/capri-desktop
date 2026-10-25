"""Builds the cut-in strips and her faces (the panel portrait) in assets/capri/ from frames of the show.

Source: the "Capri Cyberpunk2" GIF on Tenor (Edgerunners 2 footage, 148 frames, 374x374):
https://tenor.com/view/capri-cyberpunk2-cyberpunk-2-edgerunners-2-cyberpunk-edgerunners-2-capricorn-gif-5541033963201170705
plus assets/capri/capri-face.png (from the reference stills; it is also her "grin" face).

    python tools/build-cutins.py path/to/capri.gif

Needs Pillow.
"""
import sys
from pathlib import Path
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'capri'
CUTIN = (360, 240)    # 3:2, what fx.js expects
FACE = (256, 256)

# (frame, crop box in the 374x374 frame)
CUTINS = {
    'laugh': (138, (40, 64, 374, 287)),   # two eyes over the gaping jagged mouth
    'eyes': (135, (0, 128, 374, 377)),    # extreme close-up, the big eyes
    'many': (123, (0, 62, 374, 311)),     # the face covered in eyes
    'look': (99, (0, 74, 374, 323)),      # looking at you, zigzag grin above
}
# her expressions, for the panel portrait (panel.js FACES)
FACES = {
    'calm': (6, (85, 55, 275, 245)),      # watching, mouth shut
    'aside': (36, (55, 40, 245, 230)),    # turned away: a sigh, thinking
    'smug': (57, (80, 40, 270, 230)),     # the fang grin, head cocked
    'wide': (90, (60, 45, 280, 265)),     # eyes gone round, mouth open: surprised
    'look': (99, (34, 58, 334, 358)),     # looking right at you
    'laugh': (138, (92, 26, 374, 308)),   # mouth wide open
    'many': (123, (12, 12, 362, 362)),    # all her eyes on you
}
# her intro (fx.js intro): her face big in the corner, played frame by frame from the show.
# A strip of INTRO_SIZE squares, in this order: the camera pushing in on her (96-98), her face
# held (99-101, looped), her mouth opening for "hi" (136-138).
INTRO_SIZE = 300
LOOK = (34, 58, 334, 358)
LAUGH = (92, 26, 374, 308)
INTRO = [(96, LOOK), (97, LOOK), (98, LOOK), (99, LOOK), (100, LOOK), (101, LOOK), (136, LAUGH), (137, LAUGH), (138, LAUGH)]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    frames = [f.convert('RGB') for f in ImageSequence.Iterator(Image.open(sys.argv[1]))]
    for name, (i, box) in CUTINS.items():
        frames[i].crop(box).resize(CUTIN, Image.LANCZOS).save(OUT / f'cutin-{name}.png', optimize=True)
    for name, (i, box) in FACES.items():
        frames[i].crop(box).resize(FACE, Image.LANCZOS).save(OUT / f'face-{name}.png', optimize=True)
    strip = Image.new('RGB', (INTRO_SIZE * len(INTRO), INTRO_SIZE))
    for k, (i, box) in enumerate(INTRO):
        strip.paste(frames[i].crop(box).resize((INTRO_SIZE, INTRO_SIZE), Image.LANCZOS), (k * INTRO_SIZE, 0))
    strip.save(OUT / 'intro-face.webp', quality=92, method=6)
    # the grin from the stills, same format as the cut-ins
    face = Image.open(OUT / 'capri-face.png').convert('RGB')
    face.crop((16, 58, 241, 208)).resize(CUTIN, Image.LANCZOS).save(OUT / 'cutin-grin.png', optimize=True)
    print('cut-ins and faces written to', OUT)


if __name__ == '__main__':
    main()
