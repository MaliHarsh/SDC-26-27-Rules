"""Regenerate the citation index from the committed official PDF (requires pdftotext)."""
import hashlib, json, re, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
pdf = root / 'assets/official-rules.pdf'
raw = subprocess.check_output(['pdftotext', '-layout', str(pdf), '-']).decode()
chunks = []
section = 'Important Notices'
for page, text in enumerate(raw.split('\f'), 1):
    if page == 1 or page in (3, 4) or not text.strip():
        continue  # Cover and contents are not operative rules.
    text = re.sub(r'^ASME Engineering Games.*$', '', text, flags=re.M)
    text = re.sub(r'^\s*PODIUM Official Rules v1\.0 • Page \d+\s*$', '', text, flags=re.M)
    # Separate numbered rules even when the PDF has no blank line between them.
    text = re.sub(r'(?m)^(\d+(?:\.\d+)?-\d+\s+)', r'\n\n\1', text)
    text = re.sub(r'(?m)^(\d+(?:\.\d+)?\.? [A-Z][^\n]*)$', r'\n\n\1\n\n', text)
    for block in re.split(r'\n\s*\n', text):
        block = re.sub(r'\s+', ' ', block).strip()
        if not block:
            continue
        if re.match(r'^\d+(?:\.\d+)?\.? [A-Z]', block):
            section = block
            continue
        rule = re.match(r'^(\d+(?:\.\d+)?-\d+)\s', block)
        chunks.append({'id': f'S{len(chunks)+1}', 'page': page,
                       'label': f'Rule {rule[1]}' if rule else f'Section {section}', 'text': block})
# Rejoin a paragraph continued on the next PDF page, preserving its page range.
merged = []
for chunk in chunks:
    if (merged and chunk['page'] == merged[-1].get('endPage', merged[-1]['page']) + 1
        and chunk['text'][0].islower() and not re.search(r'[.!?:]$', merged[-1]['text'])):
        merged[-1]['text'] += ' ' + chunk['text']
        merged[-1]['endPage'] = chunk['page']
    else:
        merged.append(chunk)
chunks = merged
for i, chunk in enumerate(chunks, 1):
    chunk['id'] = f'S{i}'
data = {'title': 'PODIUM Official Rules v1.0 (CY2027)', 'pdf': 'assets/official-rules.pdf',
        'sha256': hashlib.sha256(pdf.read_bytes()).hexdigest(), 'chunks': chunks}
(root / 'assets/rules.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f'Extracted {len(chunks)} passages from {page-1} pages')
