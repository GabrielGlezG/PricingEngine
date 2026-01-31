import base64
import os

def to_base64(path):
    if not os.path.exists(path):
        return None
    with open(path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

logo_path = "public/logo-white-full.png"
bg_path = "public/ppt-background-split.png"

logo_b64 = to_base64(logo_path)
bg_b64 = to_base64(bg_path)

with open("assets_b64.txt", "w") as f:
    f.write("LOGO_B64 = '" + (logo_b64 if logo_b64 else "") + "'\n")
    f.write("BG_B64 = '" + (bg_b64 if bg_b64 else "") + "'\n")

print("Assets encoded.")
