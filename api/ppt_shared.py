import os
import sys
import base64
import io
import importlib.util
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# --- BRAND COLORS (Institutional) ---
DARK_BLUE = RGBColor(30, 41, 59)  # Slate 900 #1E293B
DEEP_NAVY = RGBColor(13, 40, 65)  # #0D2841 (Cover BG)
LIGHT_BLUE = RGBColor(71, 85, 105) # Slate 600
WHITE = RGBColor(255, 255, 255)

# --- ASSET LOADING ---
# Robust asset loading bypassing path issues
try:
    # Try to find ppt_assets.py in the same directory as this file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    assets_path = os.path.join(current_dir, 'ppt_assets.py')
    
    if os.path.exists(assets_path):
        spec = importlib.util.spec_from_file_location("ppt_assets", assets_path)
        ppt_assets = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ppt_assets)
        LOGO_B64 = getattr(ppt_assets, 'LOGO_B64', None)
        BG_B64 = getattr(ppt_assets, 'BG_B64', None)
    else:
        # Fallback if running from root
        try:
            from api.ppt_assets import LOGO_B64, BG_B64
        except:
            LOGO_B64 = None
            BG_B64 = None
except Exception as e:
    print(f"Warning: Failed to load assets: {e}")
    LOGO_B64 = None
    BG_B64 = None

# --- HELPER FUNCTIONS ---

def format_value(val, fmt=None, currency='$'):
    if val is None: return "-"
    try:
        val_float = float(val)
        if fmt == 'currency':
             if currency == 'UF':
                 return f"UF {val_float:,.2f}".replace(",", ".")
             else:
                 return f"{currency} {val_float:,.0f}".replace(",", ".")
        elif fmt == 'percent':
            return f"{val_float * 100:.1f}%"
        elif fmt == 'integer':
             return f"{val_float:,.0f}".replace(",", ".")
        elif isinstance(val, (int, float)):
            return f"{val_float:,.0f}" if val_float.is_integer() else f"{val_float:.2f}"
    except:
        pass
    return str(val)

def set_font(shape, font_name="Avenir Medium", font_size=None, bold=False, color=None):
    if not shape.has_text_frame:
        return
    for paragraph in shape.text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.name = font_name
            if font_size: run.font.size = font_size
            if bold is not None: run.font.bold = bold
            if color: run.font.color.rgb = color

def get_image_stream(b64_string):
    if not b64_string:
        return None
    return io.BytesIO(base64.b64decode(b64_string))

# --- COMMON SLIDE CREATORS ---

def create_logo_slide(prs):
    """Creates a slide with a large centered logo on Deep Navy background using embedded asset."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) 
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = DEEP_NAVY # #0D2841
    
    try:
        img_stream = get_image_stream(LOGO_B64)
        if img_stream:
            slide_width = prs.slide_width
            slide_height = prs.slide_height
            logo_width = Inches(5.5) 
            left = (slide_width - logo_width) / 2
            
            pic = slide.shapes.add_picture(img_stream, left, 0, width=logo_width)
            
            top = (slide_height - pic.height) / 2
            pic.top = int(top)
        else:
            print("Warning: LOGO_B64 not available")
    except Exception as e:
        print(f"Error adding logo to slide: {e}")

def create_intro_slide(prs, title, date_str):
    """Creates intro slide with split background using embedded asset."""
    slide = prs.slides.add_slide(prs.slide_layouts[6]) 
    
    try:
        img_stream = get_image_stream(BG_B64)
        if img_stream:
            slide.shapes.add_picture(img_stream, 0, 0, width=prs.slide_width, height=prs.slide_height)
    except Exception as e:
        print(f"Error adding background to intro: {e}")
        
    # Text Layout for Split Background (Left side white space)
    left = Inches(0.8) # Left padding
    top = Inches(2.8)  # Vertical center alignment roughly
    width = Inches(4.5) 
    height = Inches(2.5)
    
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    
    p_title = tf.paragraphs[0]
    p_title.text = title # Keep original casing or .title()
    p_title.font.name = "Avenir Black"
    p_title.font.size = Pt(40) # Large Title
    p_title.font.bold = True
    p_title.font.color.rgb = RGBColor(0, 0, 0) # Black text on White part
    p_title.alignment = PP_ALIGN.LEFT
    
    p_date = tf.add_paragraph()
    p_date.text = f"\nGenerado: {date_str}"
    p_date.font.name = "Avenir Medium"
    p_date.font.size = Pt(16)
    p_date.font.color.rgb = LIGHT_BLUE # Slate color for date
    p_date.alignment = PP_ALIGN.LEFT
