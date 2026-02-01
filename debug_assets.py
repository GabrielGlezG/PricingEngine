import base64
import os
import sys

# Add api folder to path
sys.path.append(os.path.join(os.getcwd(), 'api'))

try:
    from api.ppt_assets import LOGO_B64
except ImportError:
    # Try direct import if running from root with api package
    try:
        from ppt_assets import LOGO_B64
    except ImportError:
        print("Could not import LOGO_B64")
        exit(1)

def test_logo_decode():
    print(f"LOGO_B64 length: {len(LOGO_B64) if LOGO_B64 else 0}")
    
    if not LOGO_B64:
        print("Error: LOGO_B64 is empty or None")
        return

    try:
        image_data = base64.b64decode(LOGO_B64)
        print(f"Decoded successfully. Size: {len(image_data)} bytes")
        
        with open("debug_logo_output.png", "wb") as f:
            f.write(image_data)
        print("Saved to debug_logo_output.png")
        
    except Exception as e:
        print(f"Error decoding base64: {e}")

if __name__ == "__main__":
    test_logo_decode()
