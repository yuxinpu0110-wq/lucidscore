"""Bake the third-movement scan ink mask to avoid mobile SVG filter failures."""
from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).resolve().parents[1]
source = root / 'public/assets/scores/third'
target = source / 'transparent'
target.mkdir(exist_ok=True)
for page in source.glob('page-*.webp'):
    output = target / page.name
    if output.exists() and output.stat().st_mtime >= page.stat().st_mtime:
        continue
    with Image.open(page) as image:
        # Same luminance/contrast mapping as ScoreViewport's scan-ink filter.
        rgb = image.convert('RGB')
        values = np.asarray(rgb, dtype=np.float32).mean(axis=2)
        alpha = Image.fromarray(np.clip((255-values)*1.12-255*.04, 0, 255).astype('uint8'))
        ink = Image.new('RGBA', image.size, (255, 255, 255, 0))
        ink.putalpha(alpha)
        ink.save(output, 'WEBP', lossless=True, method=6)
print('Transparent third-movement pages ready')
