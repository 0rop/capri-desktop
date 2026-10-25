"""Builds the cut-in strips and panel portraits in assets/capri/ from frames of the show.

Source: the "Capri Cyberpunk2" GIF on Tenor (Edgerunners 2 footage, 148 frames, 374x374):
https://tenor.com/view/capri-cyberpunk2-cyberpunk-2-edgerunners-2-cyberpunk-edgerunners-2-capricorn-gif-5541033963201170705
plus assets/capri/capri-face.png (from the reference stills).

    python tools/build-cutins.py path/to/capri.gif

Needs Pillow.
"""
import sys
from pathlib import Path
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'capri'
CUTIN = (360, 240)    # 3:2, what fx.js expects
PORTRAIT = (256, 256)

# (frame, crop box in the 374x374 frame)
CUTINS = {
    'laugh': (138, (40, 64, 374, 287)),   # two eyes over the gaping jagged mouth
    'eyes': (135, (0, 128, 374, 377)),    # extreme close-up, the big eyes
    'many': (123, (0, 62, 374, 311)),     # the face covered in eyes
    'look': (99, (0, 74, 374, 323)),      # looking at you, zigzag grin above
}
PORTRAITS = {
    'alert': (123, (12, 12, 362, 362)),
    'done': (99, (34, 58, 334, 358)),
    'error': (138, (92, 26, 374, 308)),
}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    frames = [f.convert('RGB') for f in ImageSequence.Iterator(Image.open(sys.argv[1]))]
    for name, (i, box) in CUTINS.items():
        frames[i].crop(box).resize(CUTIN, Image.LANCZOS).save(OUT / f'cutin-{name}.png', optimize=True)
    for name, (i, box) in PORTRAITS.items():
        frames[i].crop(box).resize(PORTRAIT, Image.LANCZOS).save(OUT / f'portrait-{name}.png', optimize=True)
    # the grin from the stills, same format
    face = Image.open(OUT / 'capri-face.png').convert('RGB')
    face.crop((16, 58, 241, 208)).resize(CUTIN, Image.LANCZOS).save(OUT / 'cutin-grin.png', optimize=True)
    print('cut-ins and portraits written to', OUT)


if __name__ == '__main__':
    main()
