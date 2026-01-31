
import base64
import os

def file_to_base64(filepath):
    try:
        with open(filepath, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return encoded_string
    except FileNotFoundError:
        print(f"Error: File not found - {filepath}")
        return None

base_dir = os.getcwd()
# Switching to the 'new' logo which is likely the clean one
logo_path = os.path.join(base_dir, 'public', 'pricing-engine-logo-new.png') 
bg_path = os.path.join(base_dir, 'public', 'ppt-background-split.png')

logo_b64 = file_to_base64(logo_path)
bg_b64 = file_to_base64(bg_path)

if logo_b64 and bg_b64:
    with open("api/ppt_assets.py", "w") as f:
        f.write(f"LOGO_B64 = '{logo_b64}'\n")
        f.write(f"BG_B64 = '{bg_b64}'\n")
    print("Success: api/ppt_assets.py updated with 'pricing-engine-logo-new.png'.")
else:
    print("Failed to encode assets.")
