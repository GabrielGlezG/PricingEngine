import base64
import os

# Paths
image_path = r'C:/Users/gonza/.gemini/antigravity/brain/12325659-35c1-4eb8-a661-2fb744a4bfa4/uploaded_media_1769943631638.png'
assets_path = r'c:\Users\gonza\Desktop\PricingEngine\api\ppt_assets.py'

def fix_assets():
    print(f"Encoding image from: {image_path}")
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            
        print(f"Image encoded. Length: {len(encoded_string)}")
        
        # Write to ppt_assets.py with a safe format
        content = f"LOGO_B64 = '{encoded_string}'\n"
        
        print(f"Writing to: {assets_path}")
        with open(assets_path, "w") as f:
            f.write(content)
            
        print("Successfully repaired ppt_assets.py")
        
    except Exception as e:
        print(f"Error: {e}")
        exit(1)

if __name__ == "__main__":
    fix_assets()
