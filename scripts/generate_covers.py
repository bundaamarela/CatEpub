#!/usr/bin/env python3
"""Generate minimal book covers from JSON metadata.

Reads ``covers_input.json`` (relative to this script) and writes a pair of PNGs
per entry (``{id}_light.png`` and ``{id}_dark.png``) into ``covers_output/``.

Layout (400 x 600):
  - Title centred in the upper 60%, wrapped to fit the canvas width.
  - Thin horizontal rule between title and author.
  - Author centred in the lower 20%.

Only standard library + Pillow is required.
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("error: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)


WIDTH = 400
HEIGHT = 600
LIGHT_BG = (250, 250, 248)
LIGHT_FG = (17, 17, 17)
DARK_BG = (17, 17, 17)
DARK_FG = (232, 221, 200)

TITLE_AREA_TOP = 80
TITLE_AREA_BOTTOM = int(HEIGHT * 0.60)
RULE_Y = int(HEIGHT * 0.66)
AUTHOR_AREA_TOP = int(HEIGHT * 0.72)
PADDING_X = 36

TITLE_SIZE_MAX = 36
TITLE_SIZE_MIN = 20
AUTHOR_SIZE = 16


@dataclass
class CoverEntry:
    id: str
    title: str
    author: str


def load_entries(path: Path) -> list[CoverEntry]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("covers_input.json must be a JSON array")
    entries: list[CoverEntry] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        bid = item.get("id")
        title = item.get("title")
        author = item.get("author", "")
        if not isinstance(bid, str) or not isinstance(title, str):
            continue
        entries.append(CoverEntry(id=bid, title=title, author=str(author)))
    return entries


def _try_load_font(candidates: Iterable[str], size: int) -> ImageFont.ImageFont:
    for name in candidates:
        try:
            return ImageFont.truetype(name, size=size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def load_fonts(size: int) -> ImageFont.ImageFont:
    return _try_load_font(
        [
            "DejaVuSans.ttf",
            "Arial.ttf",
            "Helvetica.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "C:\\Windows\\Fonts\\arial.ttf",
        ],
        size,
    )


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def fit_title(draw: ImageDraw.ImageDraw, title: str, max_width: int, max_height: int) -> tuple[ImageFont.ImageFont, list[str]]:
    for size in range(TITLE_SIZE_MAX, TITLE_SIZE_MIN - 1, -2):
        font = load_fonts(size)
        lines = wrap_text(draw, title, font, max_width)
        line_h = font.getbbox("Ay")[3] - font.getbbox("Ay")[1] + 6
        total_h = line_h * len(lines)
        if total_h <= max_height:
            return font, lines
    font = load_fonts(TITLE_SIZE_MIN)
    return font, wrap_text(draw, title, font, max_width)


def render_cover(entry: CoverEntry, bg: tuple[int, int, int], fg: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), color=bg)
    draw = ImageDraw.Draw(img)

    max_width = WIDTH - 2 * PADDING_X
    max_title_height = TITLE_AREA_BOTTOM - TITLE_AREA_TOP

    title_font, title_lines = fit_title(draw, entry.title, max_width, max_title_height)
    line_h = title_font.getbbox("Ay")[3] - title_font.getbbox("Ay")[1] + 6
    total_h = line_h * len(title_lines)
    start_y = TITLE_AREA_TOP + (max_title_height - total_h) // 2
    for i, line in enumerate(title_lines):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_w = bbox[2] - bbox[0]
        x = (WIDTH - line_w) // 2
        draw.text((x, start_y + i * line_h), line, fill=fg, font=title_font)

    rule_x0 = WIDTH // 2 - 40
    rule_x1 = WIDTH // 2 + 40
    draw.line([(rule_x0, RULE_Y), (rule_x1, RULE_Y)], fill=fg, width=1)

    if entry.author.strip():
        author_font = load_fonts(AUTHOR_SIZE)
        author_lines = wrap_text(draw, entry.author, author_font, max_width)
        ah = author_font.getbbox("Ay")[3] - author_font.getbbox("Ay")[1] + 4
        for i, line in enumerate(author_lines):
            bbox = draw.textbbox((0, 0), line, font=author_font)
            line_w = bbox[2] - bbox[0]
            x = (WIDTH - line_w) // 2
            draw.text((x, AUTHOR_AREA_TOP + i * ah), line, fill=fg, font=author_font)

    return img


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    input_path = script_dir / "covers_input.json"
    output_dir = script_dir / "covers_output"

    if not input_path.exists():
        print(f"error: {input_path} not found", file=sys.stderr)
        print("Create covers_input.json with entries: [{ \"id\", \"title\", \"author\" }, ...]", file=sys.stderr)
        return 1

    entries = load_entries(input_path)
    if not entries:
        print("warning: no valid entries in covers_input.json", file=sys.stderr)
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)

    for entry in entries:
        light = render_cover(entry, LIGHT_BG, LIGHT_FG)
        dark = render_cover(entry, DARK_BG, DARK_FG)
        light.save(output_dir / f"{entry.id}_light.png", "PNG")
        dark.save(output_dir / f"{entry.id}_dark.png", "PNG")

    print(f"Generated {len(entries) * 2} covers to {output_dir.relative_to(script_dir.parent)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
