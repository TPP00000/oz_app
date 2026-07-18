# scripts/extract_sprite.py - 分层场景：从"带物件"与"无物件"两版场景图的差异中抠出物件精灵
# 用法: python scripts/extract_sprite.py <带物件图> <无物件图> <输出精灵png> [bbox: x0 y0 x1 y1]
# 输出带透明通道的精灵图，并打印其在整图中的百分比坐标（前端定位用）
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DIFF_THRESHOLD = 30      # 颜色距离阈值：大于此值视为物件像素
MIN_COMPONENT = 200      # 忽略小于此面积的差异噪点
PAD = 8                  # 精灵裁剪时四周留白 px


def color_diff_mask(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    dist = np.sqrt(((a.astype(np.int32) - b.astype(np.int32)) ** 2).sum(axis=2))
    return dist > DIFF_THRESHOLD


def keep_large_components(mask: np.ndarray) -> np.ndarray:
    from collections import deque

    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    keep = np.zeros((h, w), dtype=bool)
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or visited[sy, sx]:
                continue
            queue = deque([(sy, sx)])
            visited[sy, sx] = True
            component = [(sy, sx)]
            while queue:
                y, x = queue.popleft()
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((ny, nx))
                        component.append((ny, nx))
            if len(component) >= MIN_COMPONENT:
                for y, x in component:
                    keep[y, x] = True
    return keep


def morph_close(mask: np.ndarray, iterations: int = 2) -> np.ndarray:
    def dilate(m):
        out = m.copy()
        out[1:, :] |= m[:-1, :]
        out[:-1, :] |= m[1:, :]
        out[:, 1:] |= m[:, :-1]
        out[:, :-1] |= m[:, 1:]
        return out

    def erode(m):
        out = m.copy()
        out[1:, :] &= m[:-1, :]
        out[:-1, :] &= m[1:, :]
        out[:, 1:] &= m[:, :-1]
        out[:, :-1] &= m[:, 1:]
        return out

    for _ in range(iterations):
        mask = dilate(mask)
    for _ in range(iterations):
        mask = erode(mask)
    return mask


def fill_holes(mask: np.ndarray) -> np.ndarray:
    """把被物件包住的'洞'补上（从边缘反向 flood，未到达的非物件区即为洞）"""
    from collections import deque

    h, w = mask.shape
    outside = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y, x] and not outside[y, x]:
                outside[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y, x] and not outside[y, x]:
                outside[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                queue.append((ny, nx))
    return mask | (~mask & ~outside)


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit(
            "用法: python scripts/extract_sprite.py <带物件图> <无物件图> <输出png> [x0 y0 x1 y1]"
        )
    src_with = np.array(Image.open(sys.argv[1]).convert("RGB"))
    src_empty = np.array(Image.open(sys.argv[2]).convert("RGB"))
    out_path = Path(sys.argv[3])
    h, w = src_with.shape[:2]

    if len(sys.argv) >= 8:
        x0, y0, x1, y1 = map(int, sys.argv[4:8])
    else:
        x0, y0, x1, y1 = 0, 0, w, h

    region_mask = np.zeros((h, w), dtype=bool)
    diff = color_diff_mask(src_with[y0:y1, x0:x1], src_empty[y0:y1, x0:x1])
    diff = morph_close(diff)
    diff = keep_large_components(diff)
    diff = fill_holes(diff)
    region_mask[y0:y1, x0:x1] = diff

    ys, xs = np.where(region_mask)
    if len(ys) == 0:
        raise SystemExit("两图在指定区域内没有明显差异，未找到物件")

    top = max(0, ys.min() - PAD)
    bottom = min(h, ys.max() + PAD)
    left = max(0, xs.min() - PAD)
    right = min(w, xs.max() + PAD)

    alpha = (region_mask * 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(1.2))

    sprite = Image.fromarray(src_with, "RGB").convert("RGBA")
    sprite.putalpha(alpha_img)
    sprite = sprite.crop((left, top, right, bottom))
    sprite.save(out_path, optimize=True)

    kb = out_path.stat().st_size // 1024
    print(f"精灵已保存 {out_path.name}  {sprite.width}x{sprite.height}  {kb}KB")
    print(
        f"坐标百分比: left={left / w * 100:.2f} top={top / h * 100:.2f} "
        f"width={(right - left) / w * 100:.2f} height={(bottom - top) / h * 100:.2f}"
    )


if __name__ == "__main__":
    main()
