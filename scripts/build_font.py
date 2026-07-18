# scripts/build_font.py - 生成界面字体子集（本地工具）
# 1) 扫描 miniprogram 下的 wxml/js，收集界面文案用到的全部字符
# 2) 用 fontTools 把像素字体裁剪成只含这些字符的子集
# 3) 以 base64 写入 miniprogram/utils/font-data.js，供 wx.loadFontFace 加载
#
# 字体：缝合像素体 fusion-pixel-font (12px proportional zh_hans)
# 作者 TakWolf，SIL OFL 1.1 许可，可免费商用
# https://github.com/TakWolf/fusion-pixel-font
import base64
import io
import sys
from pathlib import Path

from fontTools import subset

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
MP = ROOT / "miniprogram"
FONT_SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT_JS = MP / "utils" / "font-data.js"


def collect_chars() -> str:
    chars = set()
    for pattern in ("*.wxml", "*.js"):
        for p in MP.rglob(pattern):
            if p.name == "font-data.js":
                continue
            text = p.read_text(encoding="utf-8")
            for ch in text:
                if (
                    "一" <= ch <= "鿿"      # CJK
                    or "　" <= ch <= "〿"   # CJK 标点
                    or "＀" <= ch <= "￯"   # 全角字符
                ):
                    chars.add(ch)
    chars |= {chr(c) for c in range(0x20, 0x7F)}   # ASCII 可见字符
    chars |= set("·…—‘’“”‹›")
    chars |= gb2312_level1()
    return "".join(sorted(chars))


def gb2312_level1() -> set:
    """GB2312 一级字库（3755 个常用汉字），覆盖日常输入"""
    result = set()
    for zone in range(0xB0, 0xD8):
        for pos in range(0xA1, 0xFF):
            try:
                result.add(bytes([zone, pos]).decode("gb2312"))
            except UnicodeDecodeError:
                continue
    return result


def main() -> None:
    if not FONT_SRC or not FONT_SRC.exists():
        raise SystemExit("用法: python scripts/build_font.py <字体ttf路径>")

    text = collect_chars()
    print(f"收集到 {len(text)} 个字符")

    options = subset.Options()
    options.layout_features = ["*"]
    options.hinting = False
    font = subset.load_font(str(FONT_SRC), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)

    font.flavor = "woff2"
    buf = io.BytesIO()
    font.save(buf)
    data = base64.b64encode(buf.getvalue()).decode("ascii")

    OUT_JS.write_text(
        "// utils/font-data.js - 界面字体子集（由 scripts/build_font.py 生成，勿手改）\n"
        "// 字体：缝合像素体 fusion-pixel-font，作者 TakWolf，SIL OFL 1.1 许可\n"
        "// https://github.com/TakWolf/fusion-pixel-font\n"
        f"module.exports = '{data}'\n",
        encoding="utf-8",
    )
    print(f"子集 {len(buf.getvalue()) // 1024}KB -> base64 {len(data) // 1024}KB")
    print(f"已写入 {OUT_JS}")


if __name__ == "__main__":
    main()
