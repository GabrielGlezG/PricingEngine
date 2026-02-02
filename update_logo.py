import base64
import os

ppt_assets_path = r'c:\Users\gonza\Desktop\PricingEngine\api\ppt_assets.py'
new_image_path = r'C:/Users/gonza/.gemini/antigravity/brain/12325659-35c1-4eb8-a661-2fb744a4bfa4/uploaded_media_1769943631638.png'

print(f"Reading new logo from: {new_image_path}")
with open(new_image_path, 'rb') as f:
    logo_data = base64.b64encode(f.read()).decode('utf-8')

print(f"Reading assets file: {ppt_assets_path}")
with open(ppt_assets_path, 'r') as f:
    lines = f.readlines()

new_lines = []
found_logo = False
for line in lines:
    if line.strip().startswith('LOGO_B64 ='):
        new_lines.append(f"LOGO_B64 = '{logo_data}'\n")
        found_logo = True
    else:
        new_lines.append(line)

if not found_logo:
    # If not found, maybe append it? But it should be there.
    print("Warning: LOGO_B64 not found in existing file. Appending.")
    new_lines.insert(0, f"LOGO_B64 = '{logo_data}'\n")

print("Writing updated assets file...")
with open(ppt_assets_path, 'w') as f:
    f.writelines(new_lines)

print("LOGO_B64 updated successfully.")
