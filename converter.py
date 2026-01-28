"""
Image Converter Tool
Converts images to WebP format with white background padding.
"""
import os
import sys
from pathlib import Path
from PIL import Image, ImageOps

def convert_image(input_path: Path, output_path: Path, size=(800, 800)):
    """Convert a single image to WebP with white background."""
    try:
        # Open image
        img = Image.open(input_path)
        
        # Create white background with target size
        background = Image.new('RGBA', size, (255, 255, 255, 255))
        
        # Resize image while maintaining aspect ratio
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Calculate position to center the image
        x = (size[0] - img.width) // 2
        y = (size[1] - img.height) // 2
        
        # Paste image onto white background
        background.paste(img, (x, y), img if img.mode == 'RGBA' else None)
        
        # Save as WebP
        background.convert('RGB').save(output_path, 'WEBP', quality=80)
        return True
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return False

def process_folder(input_folder: str):
    """Process all images in the input folder."""
    input_dir = Path(input_folder)
    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Input folder does not exist: {input_folder}")
        return
    
    # Create output directory as a sibling next to the input folder (parent/webp)
    output_dir = input_dir.parent / "webp"
    output_dir.mkdir(exist_ok=True)
    
    # Process each image file
    supported_ext = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'}
    for img_path in input_dir.iterdir():
        if img_path.suffix.lower() in supported_ext:
            output_path = output_dir / (img_path.stem + '.webp')
            if convert_image(img_path, output_path):
                print(f"Converted: {img_path.name} -> {output_path.name}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python converter.py <input_folder>")
        sys.exit(1)
    
    process_folder(sys.argv[1])