from PIL import Image, ImageDraw
import math

# Brand colors (dark-mode token values from styles.css)
BG_DARK = (18, 22, 21)      # --bg dark
ACCENT = (232, 163, 61)     # --accent dark (amber)
ACCENT2 = (79, 193, 172)    # --accent-2 dark (teal)
GLYPH = (23, 20, 12)        # dark glyph, matches break-card__band text color

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def make_base(size):
    img = Image.new("RGB", (size, size))
    px = img.load()
    # diagonal gradient amber -> teal, matching .break-card__band
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = lerp(ACCENT, ACCENT2, t)
    return img

def draw_box_glyph(img, size, scale=1.0):
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    r = size * 0.30 * scale  # "radius" of the hex footprint

    # open package glyph: hexagon outline (box lid) + vertical seam lines + a flap "V"
    pts = []
    for i in range(6):
        ang = math.radians(60 * i - 90)
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang) * 0.92))
    d.polygon(pts, fill=GLYPH)

    # cut a lighter inner hexagon to suggest the box lid seam (use background-ish tone)
    inner_r = r * 0.62
    inner_pts = []
    for i in range(6):
        ang = math.radians(60 * i - 90)
        inner_pts.append((cx + inner_r * math.cos(ang), cy + inner_r * math.sin(ang) * 0.92))
    d.polygon(inner_pts, fill=lerp(ACCENT, ACCENT2, 0.5))

    # center seam line
    line_w = max(2, int(size * 0.012))
    d.line([(cx, cy - inner_r), (cx, cy + inner_r)], fill=GLYPH, width=line_w)
    d.line([(cx - inner_r * 0.85, cy - inner_r * 0.5), (cx, cy)], fill=GLYPH, width=line_w)
    d.line([(cx + inner_r * 0.85, cy - inner_r * 0.5), (cx, cy)], fill=GLYPH, width=line_w)

def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask

def save_icon(path, size, maskable=False):
    img = make_base(size)
    draw_box_glyph(img, size, scale=0.78 if maskable else 1.0)
    if not maskable:
        mask = rounded_mask(size, int(size * 0.18))
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        out.save(path)
    else:
        img.save(path)  # maskable icons should be full-bleed, no alpha corners

save_icon("icons/icon-192.png", 192)
save_icon("icons/icon-512.png", 512)
save_icon("icons/icon-maskable-512.png", 512, maskable=True)
print("icons written")
