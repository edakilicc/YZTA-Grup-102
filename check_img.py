from PIL import Image

img = Image.open('assets/icon.png')
img = img.convert("RGBA")
width, height = img.size
print(f"Size: {width}x{height}")
print(f"Top-Left Pixel: {img.getpixel((0,0))}")
print(f"Top-Right Pixel: {img.getpixel((width-1,0))}")
print(f"Bottom-Left Pixel: {img.getpixel((0,height-1))}")
print(f"Bottom-Right Pixel: {img.getpixel((width-1,height-1))}")
print(f"Center Pixel: {img.getpixel((width//2,height//2))}")
