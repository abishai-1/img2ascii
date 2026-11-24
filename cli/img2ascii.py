"""Convert an image to ASCII art.

Examples:
    python img2ascii.py photo.jpg
    python img2ascii.py photo.jpg -w 120 --color
    python img2ascii.py photo.jpg --charset blocks --invert -o out.txt
    python img2ascii.py photo.jpg --mode halfblock      # colored, 2x vertical detail
"""
import argparse
import os
import sys

from PIL import Image, ImageEnhance, ImageOps

CHARSETS = {
    "standard": "@%#*+=-:. ",
    "detailed": "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
    "blocks": "█▓▒░ ",
    "simple": "#+-. ",
    "dots": "⣿⣷⣧⣇⡇⡆⡄⡀ ",
}

# Terminal cells are roughly twice as tall as they are wide.
CHAR_ASPECT = 0.5


def load(path, width, height_scale, contrast, brightness):
    img = Image.open(path)
    img = ImageOps.exif_transpose(img).convert("RGB")
    if contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(contrast)
    if brightness != 1.0:
        img = ImageEnhance.Brightness(img).enhance(brightness)
    w, h = img.size
    height = max(1, round(h / w * width * height_scale))
    return img.resize((width, height), Image.LANCZOS)


def to_ascii(img, chars, color, invert):
    # Ramps are written dense -> light. On a dark terminal, bright pixels
    # should get the dense chars, so reverse unless inverting for light themes.
    if not invert:
        chars = chars[::-1]
    gray = img.convert("L")
    n = len(chars) - 1
    lines = []
    for y in range(img.height):
        row = []
        for x in range(img.width):
            ch = chars[gray.getpixel((x, y)) * n // 255]
            if color:
                r, g, b = img.getpixel((x, y))
                row.append(f"\x1b[38;2;{r};{g};{b}m{ch}")
            else:
                row.append(ch)
        lines.append("".join(row) + ("\x1b[0m" if color else ""))
    return "\n".join(lines)


def to_halfblock(img):
    """Each cell shows two pixels: top via foreground, bottom via background."""
    lines = []
    for y in range(0, img.height - 1, 2):
        row = []
        for x in range(img.width):
            t = img.getpixel((x, y))
            b = img.getpixel((x, y + 1))
            row.append(f"\x1b[38;2;{t[0]};{t[1]};{t[2]}m\x1b[48;2;{b[0]};{b[1]};{b[2]}m▀")
        lines.append("".join(row) + "\x1b[0m")
    return "\n".join(lines)


def main():
    p = argparse.ArgumentParser(description="Convert an image to ASCII art.")
    p.add_argument("image", help="path to the image")
    p.add_argument("-w", "--width", type=int, default=None,
                   help="output width in characters (default: fit terminal, max 150)")
    p.add_argument("-c", "--charset", choices=CHARSETS, default="standard")
    p.add_argument("--chars", help="custom character ramp, dense to light (overrides --charset)")
    p.add_argument("--color", action="store_true", help="24-bit ANSI color output")
    p.add_argument("--mode", choices=["ascii", "halfblock"], default="ascii",
                   help="halfblock = colored ▀ blocks with double vertical resolution")
    p.add_argument("-i", "--invert", action="store_true",
                   help="invert brightness (use for light terminal backgrounds)")
    p.add_argument("--contrast", type=float, default=1.0, help="e.g. 1.5 for punchier output")
    p.add_argument("--brightness", type=float, default=1.0)
    p.add_argument("-o", "--output", help="save to a text file (color codes are stripped)")
    args = p.parse_args()

    width = args.width
    if width is None:
        try:
            width = min(os.get_terminal_size().columns - 1, 150)
        except OSError:
            width = 100

    if args.mode == "halfblock":
        img = load(args.image, width, CHAR_ASPECT * 2, args.contrast, args.brightness)
        art = to_halfblock(img)
    else:
        img = load(args.image, width, CHAR_ASPECT, args.contrast, args.brightness)
        chars = args.chars or CHARSETS[args.charset]
        if len(chars) < 2:
            p.error("--chars needs at least 2 characters")
        color = args.color and not args.output
        art = to_ascii(img, chars, color, args.invert)

    if args.output:
        if args.mode == "halfblock":
            p.error("halfblock mode is color-only; it can't be saved as plain text")
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(art + "\n")
        print(f"Saved {img.width}x{img.height} ASCII art to {args.output}")
        return

    if os.name == "nt":
        os.system("")  # enables ANSI escape processing in Windows consoles
    sys.stdout.reconfigure(encoding="utf-8")
    print(art)


if __name__ == "__main__":
    main()
