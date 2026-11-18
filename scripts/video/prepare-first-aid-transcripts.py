"""Export accessible, source-linked transcripts from the narration script."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[2]
spec = json.loads((Path(__file__).parent / 'first-aid-scenes.json').read_text(encoding='utf-8-sig'))
for language in ['de', 'en']:
    title = 'Erste Hilfe bei Erwachsenen' if language == 'de' else 'First aid for adults'
    text = f'RedScore | {title}\n\n'
    text += '\n\n'.join(scene[language]['tag'] + '\n' + scene[language]['voice'] for scene in spec['scenes'])
    text += '\n\nSources / Quellen (18.11.2026):\n' + '\n'.join(spec['sources']) + '\n'
    (root / f'dist/media/training/redscore-erste-hilfe-{language}-transcript.txt').write_text(text, encoding='utf-8')
