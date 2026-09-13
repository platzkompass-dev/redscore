from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BRANDING = ROOT / "assets" / "branding"
SOURCE = BRANDING / "redscore-logo.png"


def square_logo(size: int, *, padding: float, background=None) -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    usable = round(size * (1 - 2 * padding))
    scale = min(usable / source.width, usable / source.height)
    resized = source.resize(
        (round(source.width * scale), round(source.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    position = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas.alpha_composite(resized, position)
    return canvas


def save_png(name: str, size: int, *, padding: float, background=None) -> None:
    square_logo(size, padding=padding, background=background).save(
        BRANDING / name, optimize=True
    )


def main() -> None:
    BRANDING.mkdir(parents=True, exist_ok=True)

    # Browser assets: minimal padding keeps the detailed crest legible at small sizes.
    for size in (16, 32, 48):
        save_png(f"favicon-{size}x{size}.png", size, padding=0.03)

    # Transparent app/communication marks retain flexibility on light and dark surfaces.
    save_png("app-logo-512.png", 512, padding=0.08)
    save_png("communication-logo-1200.png", 1200, padding=0.08)
    save_png("app-icon-foreground-1024.png", 1024, padding=0.17)

    # Opaque square icons suit stores, launchers, home screens, and desktop shortcuts.
    for size in (180, 192, 512, 1024):
        save_png(
            f"app-icon-{size}.png",
            size,
            padding=0.10,
            background=(255, 255, 255, 255),
        )

    # Multi-resolution ICO files for browsers and Windows desktop packaging.
    ico_source = square_logo(256, padding=0.03)
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_source.save(BRANDING / "favicon.ico", sizes=ico_sizes)
    ico_source.save(BRANDING / "redscore-desktop.ico", sizes=ico_sizes)


if __name__ == "__main__":
    main()
