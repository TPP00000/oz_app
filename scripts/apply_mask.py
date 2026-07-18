# scripts/apply_mask.py - 把手动抠图工具导出的掩码转成精灵（本地工具）
# 用法: python scripts/apply_mask.py <源图> <掩码png> <精灵名> [输出目录]
# 例:   python scripts/apply_mask.py assets-src/pano-final-with.jpg mask-window.png window
# 输出: <输出目录>/sp-<名>.png（默认 miniprogram/assets；iOS 真机不解析本地 webp，一律 png）
#       + 打印配置行（坐标百分比按源图尺寸算）
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "miniprogram" / "assets"


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit("用法: python scripts/apply_mask.py <源图> <掩码png> <精灵名> [输出目录]")
    src_path, mask_path, name = sys.argv[1], sys.argv[2], sys.argv[3]
    out_dir = Path(sys.argv[4]) if len(sys.argv) > 4 else OUT
    out_dir.mkdir(parents=True, exist_ok=True)

    src = Image.open(src_path).convert("RGB")
    mask = Image.open(mask_path).convert("L")
    if mask.size != src.size:
        raise SystemExit(
            f"掩码尺寸 {mask.size} 与源图 {src.size} 不一致——请确认掩码是从同一张图导出的"
        )

    marr = np.array(mask) > 127
    if not marr.any():
        raise SystemExit("掩码是全黑的，没有描边区域")

    alpha = Image.fromarray((marr * 255).astype(np.uint8), "L").filter(
        ImageFilter.GaussianBlur(1.6)
    )
    ys, xs = np.where(marr)
    pad = 4
    l = max(0, int(xs.min()) - pad)
    t = max(0, int(ys.min()) - pad)
    r = min(src.width, int(xs.max()) + pad)
    b = min(src.height, int(ys.max()) + pad)

    sp = src.convert("RGBA")
    sp.putalpha(alpha)
    out_name = f"sp-{name}.png"
    sp.crop((l, t, r, b)).save(out_dir / out_name, optimize=True)

    w, h = src.size
    kb = (out_dir / out_name).stat().st_size // 1024
    print(f"已生成 {out_dir / out_name}  {r-l}x{b-t}  {kb}KB")
    print("index.js 配置（hot 即 img，全为本体）：")
    print(
        f"  {{ key: '{name}', name: 'XX', src: '{out_name}', "
        f"left: {l/w*100:.2f}, top: {t/h*100:.2f}, "
        f"width: {(r-l)/w*100:.2f}, height: {(b-t)/h*100:.2f}, "
        f"img: {{ left: 0, top: 0, width: 100, height: 100 }} }},"
    )


if __name__ == "__main__":
    main()
