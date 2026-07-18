# scripts/process_assets.py - 素材后处理（本地工具，不属于小程序运行时）
# 1) PNG: 从边缘 flood-fill 移除白底 -> 透明，裁剪主体，缩放，量化压缩
# 2) 校验 JPG 体积
import sys
import io
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ASSETS = Path(__file__).resolve().parent.parent / "miniprogram" / "assets"

# 白底判定阈值与目标配置
# all_white=True 时删除所有近白像素（适合文字：字腔内的封闭白色也要透明）
# 默认只删与边缘连通的白色（保护主体内部的白色高光）
WHITE_THRESHOLD = 235
TARGETS = {
    "tree-day.png": {"width": 768},
    "tree-bare-day.png": {"width": 768},
    "fruit-eggplant.png": {"width": 240},
    "fruit-apple.png": {"width": 240},
    "heart.png": {"width": 160},
    "title.png": {"width": 640, "all_white": True},
}


def remove_white_bg(img: Image.Image, all_white: bool = False) -> Image.Image:
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w = rgba.shape[:2]
    near_white = np.all(rgba[:, :, :3] >= WHITE_THRESHOLD, axis=2)

    if all_white:
        # 文字模式：所有近白像素一律透明（包括笔画包住的字腔）
        rgba[near_white, 3] = 0
        return _feather_edges(rgba)

    # BFS：只移除与边缘连通的白色区域（保留主体内部的白色高光）
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    rgba[visited, 3] = 0
    return _feather_edges(rgba)


def _feather_edges(rgba: np.ndarray) -> Image.Image:
    # 边缘羽化：紧邻透明区的不透明像素按亮度衰减 alpha，减轻白边
    alpha = rgba[:, :, 3]
    transparent = alpha == 0
    neighbor_transparent = np.zeros_like(transparent)
    neighbor_transparent[1:, :] |= transparent[:-1, :]
    neighbor_transparent[:-1, :] |= transparent[1:, :]
    neighbor_transparent[:, 1:] |= transparent[:, :-1]
    neighbor_transparent[:, :-1] |= transparent[:, 1:]
    edge = neighbor_transparent & ~transparent
    brightness = rgba[:, :, :3].mean(axis=2)
    fade = np.clip((255 - brightness) / (255 - 200), 0, 1)
    alpha_f = alpha.astype(np.float64)
    alpha_f[edge] = alpha_f[edge] * fade[edge]
    rgba[:, :, 3] = alpha_f.astype(np.uint8)

    return Image.fromarray(rgba, "RGBA")


def crop_and_resize(img: Image.Image, target_width: int) -> Image.Image:
    bbox = img.getbbox()
    if bbox:
        pad_x = int((bbox[2] - bbox[0]) * 0.03)
        pad_y = int((bbox[3] - bbox[1]) * 0.03)
        bbox = (
            max(0, bbox[0] - pad_x),
            max(0, bbox[1] - pad_y),
            min(img.width, bbox[2] + pad_x),
            min(img.height, bbox[3] + pad_y),
        )
        img = img.crop(bbox)
    if img.width > target_width:
        ratio = target_width / img.width
        img = img.resize((target_width, int(img.height * ratio)), Image.LANCZOS)
    return img


def compress_png(img: Image.Image) -> Image.Image:
    # 量化到 256 色可大幅减小体积，肉眼几乎无损（水彩风渐变较柔和）
    return img.quantize(256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)


def main() -> None:
    wanted = sys.argv[1:]
    targets = {
        name: conf
        for name, conf in TARGETS.items()
        if not wanted or any(w in name for w in wanted)
    }
    for name, conf in targets.items():
        path = ASSETS / name
        img = Image.open(path)
        img = remove_white_bg(img, all_white=conf.get("all_white", False))
        img = crop_and_resize(img, conf["width"])
        img = compress_png(img)
        img.save(path, optimize=True)
        kb = path.stat().st_size // 1024
        print(f"OK  {name}  {img.size[0]}x{img.size[1]}  {kb}KB")

    total = 0
    for f in sorted(ASSETS.iterdir()):
        kb = f.stat().st_size / 1024
        total += kb
        print(f"    {f.name}  {kb:.0f}KB")
    print(f"素材总体积: {total:.0f}KB")


if __name__ == "__main__":
    main()
