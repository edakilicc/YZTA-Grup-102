from PIL import Image

def remove_bg():
    img = Image.open('assets/icon.png').convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Flood fill starting from the four corners to make them transparent
    visited = set()
    stack = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    
    # tolerance for color matching (corners are dark or white)
    def color_dist(c1, c2):
        return sum(abs(a - b) for a, b in zip(c1[:3], c2[:3]))
    
    # We take the corner colors as the target background colors to remove
    bg_colors = [pixels[x, y] for x, y in stack]
    
    while stack:
        x, y = stack.pop()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        
        current_color = pixels[x, y]
        # Check if current pixel is close to ANY of the corner background colors
        is_bg = False
        for bg in bg_colors:
            if color_dist(current_color, bg) < 50:
                is_bg = True
                break
        
        if is_bg:
            pixels[x, y] = (0, 0, 0, 0) # Make transparent
            
            # Add neighbors
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    stack.append((nx, ny))
                    
    img.save('public/logo.png', 'PNG')
    print("Background removed and saved to public/logo.png")

remove_bg()
