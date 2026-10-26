"""Builds her intro's close-ups in assets/capri/: her holding the screen by its edges, cut out of
their red background. What stays: her figure (everything that isn't the mane's hot red, only
what's joined to her) and a jagged burst of mane around her head; the rest is see-through, so
your desktop shows around her. Every drawing is cut the same way, so they can be swapped like
cels: `grab` is her at rest (both hands on the edges, mouth shut), the others are the same picture
with only her mouth or her right arm changed (fx.js GRAB_FRAMES). fx.js knows where her face, eyes
and hands are on them (GRAB): keep the framing (1672x941, her eyes in the same place) or update it.

    python tools/build-intro.py grab=rest.webp mouth1=ajar.webp mouth2=half.webp mouth3=wide.webp \\
        wave1=wave-left.webp wave2=wave-right.webp

writes assets/capri/intro-<name>.webp for each. Needs Pillow.
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'capri'
SIZE = (1672, 941)
HEAD = (830, 330)   # the middle of her mane burst
BODY = (836, 600)   # a point on her, to keep only what's joined to her
BELLY = (980, 760)  # a point on her belly: red like the mane, but hers (see belly)
BELLY_MAX = 330     # wider than this, a run of red isn't her belly any more (it's the background)


def belly(fig):
    """Her belly, red like the mane behind her but walled in by her: going up and down from BELLY,
    each row's run of red that has her (black) on both sides. It stops where a run gets out to the
    background (too wide, or off the edge of the picture)."""
    w, h = fig.size
    fp = fig.load()
    out = Image.new('L', (w, h), 0)
    op = out.load()

    def span(y, x0):
        # the red run of row y around x0 (the nearest red pixel to it), walled on both sides
        x = next((x0 + d * s for d in range(0, 60) for s in (1, -1) if 0 <= x0 + d * s < w and fp[x0 + d * s, y] == 0), None)
        if x is None:
            return None
        a = b = x
        while a > 0 and fp[a - 1, y] == 0:
            a -= 1
        while b < w - 1 and fp[b + 1, y] == 0:
            b += 1
        if a == 0 or b == w - 1 or b - a > BELLY_MAX:
            return None
        return a, b

    for step in (1, -1):
        x0, y = BELLY[0], BELLY[1]
        while 0 <= y < h:
            run = span(y, x0)
            if not run:
                break
            for x in range(run[0], run[1] + 1):
                op[x, y] = 255
            x0 = (run[0] + run[1]) // 2
            y += step
    return out


def pockets(fig):
    """The red she walls in on all sides: whatever isn't her and can't reach the picture's edge."""
    w, h = fig.size
    outside = fig.copy()  # her: 255, the rest: 0, and what reaches an edge becomes 128
    op = outside.load()
    for x, y in [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]:
        if op[x, y] == 0:
            ImageDraw.floodfill(outside, (x, y), 128)
    return outside.point(lambda v: 255 if v == 0 else 0)


def framed(path):
    """The picture at SIZE: the generated variants come out a pixel narrower, padded back out."""
    im = Image.open(path).convert('RGB')
    if im.size == SIZE:
        return im
    out = Image.new('RGB', SIZE)
    out.paste(im, (0, 0))
    if im.width < SIZE[0]:
        out.paste(im.crop((im.width - 1, 0, im.width, im.height)).resize((SIZE[0] - im.width, im.height)), (im.width, 0))
    return out


def cut(im):
    w, h = im.size
    px = im.load()

    # her figure: whatever isn't the hot red of the mane (black, green, white, blue, violet)
    fig = Image.new('L', (w, h), 0)
    fp = fig.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            fp[x, y] = 0 if (r > 170 and g < 140 and b < 190 and r - g > 90) else 255
    # no speckle holes, no islands (the white specks of the mane's texture)
    fig = fig.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    fig = fig.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    ImageDraw.floodfill(fig, BODY, 128)
    fig = fig.point(lambda v: 255 if v == 128 else 0)
    # red that's hers, not background: her belly, and every pocket of red she walls in on all
    # sides (between her ribs, by the zigzags on her belly); a pixel of give so no seam shows
    fig = ImageChops.lighter(fig, ImageChops.lighter(belly(fig), pockets(fig)).filter(ImageFilter.MaxFilter(3)))

    # a burst of mane around her head: long spikes and short ones, like her shards (the same one
    # for every drawing). Its upper spikes squeezed down so they end inside the picture: a spike
    # cut flat by the picture's top edge shows as a straight line once she lets go and drops.
    random.seed(7)
    pts = []
    n = 26
    up = (HEAD[1] - 10) / 600
    for i in range(n * 2):
        a = (i / (n * 2)) * math.tau + random.uniform(-0.04, 0.04)
        r = random.uniform(430, 600) if i % 2 == 0 else random.uniform(250, 330)
        dy = math.sin(a) * r
        pts.append((HEAD[0] + math.cos(a) * r * 1.25, HEAD[1] + (dy * up if dy < 0 else dy)))
    burst = Image.new('L', (w, h), 0)
    ImageDraw.Draw(burst).polygon(pts, fill=255)

    # whatever of her reaches the picture's top edge (the spikes of her head) ends in jags instead
    top = Image.new('L', (w, h), 255)
    jags = [(x, random.uniform(6, 30)) for x in range(0, w + 40, 40)]
    ImageDraw.Draw(top).polygon([(0, 0), *jags, (w, 0)], fill=0)

    # a little softness on the cut, then hard again: clean edges, no stair steps
    alpha = ImageChops.multiply(ImageChops.lighter(fig, burst), top).filter(ImageFilter.GaussianBlur(1.2))
    alpha = alpha.point(lambda v: 0 if v < 60 else (255 if v > 190 else int((v - 60) * 255 / 130)))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def main():
    pairs = [arg.split('=', 1) for arg in sys.argv[1:]]
    if not pairs or any(len(p) != 2 for p in pairs):
        sys.exit(__doc__)
    for name, path in pairs:
        target = OUT / f'intro-{name}.webp'
        cut(framed(path)).save(target, 'WEBP', quality=88, method=6)
        print('written', target)


if __name__ == '__main__':
    main()
