"""Generate app + extension icons (blue→violet rounded square, white check)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
S = 1024


def base(rounded=True):
    grad = Image.new("RGB", (S, S))
    px = grad.load()
    a, b = (37, 99, 235), (124, 58, 237)
    for y in range(S):
        for xx in range(S):
            t = (xx + y) / (2 * S)
            px[xx, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=230 if rounded else 0, fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.ellipse([262, 262, 762, 762], outline="white", width=56)
    d.line([(390, 520), (480, 610), (650, 430)], fill="white", width=64, joint="curve")
    for x, y in [(390, 520), (480, 610), (650, 430)]:
        d.ellipse([x - 32, y - 32, x + 32, y + 32], fill="white")
    return img


rounded, square = base(True), base(False)
for n in (180, 192, 512):
    (square if n == 180 else rounded).resize((n, n), Image.LANCZOS).save(ROOT / "web/icons" / f"icon-{n}.png")
square.resize((512, 512), Image.LANCZOS).save(ROOT / "web/icons/maskable-512.png")
for n in (16, 32, 48, 128):
    rounded.resize((n, n), Image.LANCZOS).save(ROOT / "extension" / f"icon-{n}.png")
print("ok")
