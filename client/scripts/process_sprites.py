"""
Cleans a character sprite sheet and measures each animation frame's exact
pixel rect, for use in GameCanvas.jsx's FRAME_DATA.

Usage:
    python3 process_sprites.py <input.png> <output.png>

- Flood-fills a real (or fake baked-in checkerboard) background out to
  true alpha transparency, without touching light pixels enclosed inside
  the character (eye highlights, sword shine).
- Prints a JSON list of {x, y, w, h} — the real, tight bounding box of
  each frame in the sheet, left to right.
- If frames touch with a zero-pixel gap (sword tip against the next
  pose's boot, etc.) the auto-split may merge or miscount them — check
  the printed count against what you see in the sheet, and adjust
  min_gap or split manually for that sheet if needed.

Requires: pillow, numpy, scipy  (pip install pillow numpy scipy)
"""
import numpy as np
from PIL import Image
from scipy import ndimage
import json
import sys

def remove_background(im):
    """Flood-fill from the image border through near-white/light-checkerboard
    pixels, marking only the connected background region as transparent.
    Pixels inside the character that happen to be light (eye whites, sword
    shine) are untouched because they aren't connected to the border."""
    arr = np.array(im.convert('RGBA')).astype(np.int16)
    r, g, b, a = arr[...,0], arr[...,1], arr[...,2], arr[...,3]

    # "background-ish": light, low-saturation pixels (catches both pure
    # white AND the faint light-gray checkerboard some of these sheets have)
    maxc = np.maximum(np.maximum(r,g),b)
    minc = np.minimum(np.minimum(r,g),b)
    sat = maxc - minc
    bg_ish = (minc > 225) & (sat < 12)
    bg_ish |= (a < 10)  # already-transparent pixels count as background too

    lbl, n = ndimage.label(bg_ish, structure=np.ones((3,3)))
    h, w = bg_ish.shape
    border_labels = set(lbl[0,:]) | set(lbl[-1,:]) | set(lbl[:,0]) | set(lbl[:,-1])
    border_labels.discard(0)

    remove_mask = np.isin(lbl, list(border_labels))

    out = np.array(im.convert('RGBA'))
    out[remove_mask, 3] = 0

    # light 1px feather on the new edge to soften hard cutout jaggies
    keep = ~remove_mask
    edge = keep & ndimage.binary_dilation(remove_mask, iterations=1)
    fade = ndimage.distance_transform_edt(~remove_mask)
    alpha = out[...,3].astype(np.float32)
    feather_zone = edge
    alpha[feather_zone] = np.clip(fade[feather_zone] / 1.5, 0, 1) * 255
    out[...,3] = alpha.astype(np.uint8)

    return Image.fromarray(out, 'RGBA'), remove_mask

def find_frames(im, remove_mask, min_gap=4, min_frame_w=15, alpha_thresh=20):
    arr = np.array(im)
    alpha = arr[...,3]
    content = alpha > alpha_thresh
    col_has = content.any(axis=0)
    W = len(col_has)

    # collect raw runs of True columns
    raw_runs = []
    x = 0
    while x < W:
        if not col_has[x]:
            x += 1
            continue
        x0 = x
        while x < W and col_has[x]:
            x += 1
        raw_runs.append([x0, x])  # [start, end) content run

    # merge runs separated by a gap smaller than min_gap
    merged = []
    for run in raw_runs:
        if merged and run[0] - merged[-1][1] < min_gap:
            merged[-1][1] = run[1]
        else:
            merged.append(run)

    results = []
    for (x0, x1) in merged:
        if x1 - x0 < min_frame_w:
            continue
        sub = content[:, x0:x1]
        rows = np.where(sub.any(axis=1))[0]
        if len(rows) == 0:
            continue
        y0, y1 = int(rows.min()), int(rows.max()) + 1
        cols = np.where(sub.any(axis=0))[0]
        cx0, cx1 = int(cols.min()) + x0, int(cols.max()) + 1 + x0
        results.append({'x': cx0, 'y': y0, 'w': cx1-cx0, 'h': y1-y0})
    return results

if __name__ == '__main__':
    src = sys.argv[1]
    dst = sys.argv[2]
    im = Image.open(src)
    cleaned, remove_mask = remove_background(im)
    cleaned.save(dst)
    frames = find_frames(cleaned, remove_mask)
    print(json.dumps(frames, indent=2))
