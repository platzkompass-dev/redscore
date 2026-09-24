import shutil
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BRANDING = ROOT / "assets" / "branding"
SOURCE = BRANDING / "redscore-logo.png"
SIGNAL_SOURCE = BRANDING / "redscore-signal.png"
WEB = ROOT / "dist" / "assets"


def master_logo() -> Image.Image:
    return Image.open(SOURCE).convert("RGBA")


def signal_mark() -> Image.Image:
    source = Image.open(SIGNAL_SOURCE).convert("RGBA")
    alpha_bounds = source.getchannel("A").getbbox()
    return source.crop(alpha_bounds) if alpha_bounds else source


def compose_master_logo() -> None:
    """Replace the old pale-ring signal while preserving the approved wordmark."""
    source = master_logo()
    clear_to = round(source.height * 0.595)
    background = Image.new("RGBA", (source.width, clear_to), (255, 255, 255, 255))
    source.alpha_composite(background, (0, 0))

    signal = signal_mark()
    target_size = round(min(source.width, source.height) * 0.53)
    signal.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)
    position = ((source.width - signal.width) // 2, round(source.height * 0.025))
    source.alpha_composite(signal, position)
    source.save(SOURCE, optimize=True)


def square_logo(size: int, *, padding: float, background=None, source=None) -> Image.Image:
    source = source or signal_mark()
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
    WEB.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 1:
        shutil.copyfile(Path(sys.argv[1]).resolve(), SIGNAL_SOURCE)

    compose_master_logo()

    # Browser assets: minimal padding keeps the detailed crest legible at small sizes.
    for size in (16, 32, 48):
        save_png(f"favicon-{size}x{size}.png", size, padding=0.03)

    # The circular signal is the compact UI/app mark; the full approved artwork is
    # retained for communication materials.
    save_png("app-logo-512.png", 512, padding=0.08)
    square_logo(1200, padding=0.02, source=master_logo()).save(BRANDING / "communication-logo-1200.png", optimize=True)
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

    # Website/PWA files are generated from the same approved master.
    signal_mark().save(WEB / "redscore-logo.png", optimize=True)
    master_logo().convert("RGB").save(WEB / "redscore-logo-full.png", optimize=True)
    for size, name in ((32, "favicon-32x32.png"), (180, "app-icon-180.png"), (192, "app-icon-192.png"), (512, "app-icon-512.png")):
        shutil.copyfile(BRANDING / (f"favicon-{size}x{size}.png" if size == 32 else f"app-icon-{size}.png"), WEB / name)
    shutil.copyfile(BRANDING / "favicon.ico", WEB / "favicon.ico")
    for size in (192, 512):
        square_logo(size, padding=0.12, background=(255, 255, 255, 255)).save(WEB / f"app-icon-maskable-{size}.png", optimize=True)


if __name__ == "__main__":
    main()
