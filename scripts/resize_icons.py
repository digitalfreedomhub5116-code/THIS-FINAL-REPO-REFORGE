"""
Resize adaptive icon foreground images to add padding so the logo
isn't clipped by Android's adaptive icon masking.

Android adaptive icons use a 108dp canvas but only the inner 72dp (66.7%)
is the safe zone. We shrink the logo to ~60% of the canvas and center it
on a dark background to ensure nothing gets cut off.

Also regenerates ic_launcher.png and ic_launcher_round.png composites.
"""

from PIL import Image, ImageDraw
import os

# Density -> (foreground size, launcher size)
DENSITIES = {
    "mipmap-ldpi":    (81, 36),
    "mipmap-mdpi":    (108, 48),
    "mipmap-hdpi":    (162, 72),
    "mipmap-xhdpi":   (216, 96),
    "mipmap-xxhdpi":  (324, 144),
    "mipmap-xxxhdpi": (432, 192),
}

RES_DIR = os.path.join(
    r"c:\Users\pruth\Downloads\solo-leveling (1)\solo-leveling",
    "android", "app", "src", "main", "res"
)

# Dark background color matching the icon
BG_COLOR = (13, 10, 25)  # near-black purple

SCALE_FACTOR = 0.60  # Logo will occupy 60% of the canvas

for density, (fg_size, launcher_size) in DENSITIES.items():
    fg_path = os.path.join(RES_DIR, density, "ic_launcher_foreground.png")
    launcher_path = os.path.join(RES_DIR, density, "ic_launcher.png")
    round_path = os.path.join(RES_DIR, density, "ic_launcher_round.png")

    if not os.path.exists(fg_path):
        print(f"  SKIP {density} - foreground not found")
        continue

    # --- Resize foreground with padding ---
    fg_img = Image.open(fg_path).convert("RGBA")
    
    # Calculate new logo size (60% of canvas)
    logo_size = int(fg_size * SCALE_FACTOR)
    
    # Resize the original logo down
    logo_resized = fg_img.resize((logo_size, logo_size), Image.LANCZOS)
    
    # Create new canvas with dark background
    new_fg = Image.new("RGBA", (fg_size, fg_size), BG_COLOR + (255,))
    
    # Center the logo on the canvas
    offset = (fg_size - logo_size) // 2
    new_fg.paste(logo_resized, (offset, offset), logo_resized)
    
    new_fg.save(fg_path, "PNG")
    print(f"  OK {density}/ic_launcher_foreground.png ({fg_size}x{fg_size}, logo={logo_size}x{logo_size})")

    # --- Regenerate launcher icon (simple composite) ---
    launcher_img = new_fg.resize((launcher_size, launcher_size), Image.LANCZOS)
    launcher_img.save(launcher_path, "PNG")
    print(f"  OK {density}/ic_launcher.png ({launcher_size}x{launcher_size})")

    # --- Round icon (same image, masking handled by system) ---
    launcher_img.save(round_path, "PNG")
    print(f"  OK {density}/ic_launcher_round.png ({launcher_size}x{launcher_size})")

print("\nDone! All icons resized with proper padding.")
