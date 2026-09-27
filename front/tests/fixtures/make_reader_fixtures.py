"""Generate tiny, original EPUB/PDF fixtures; no third-party book content."""
from pathlib import Path
from base64 import b64decode
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).parent
with ZipFile(root / 'reader.epub', 'w') as z:
    z.writestr('mimetype', 'application/epub+zip')
    z.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    z.writestr('OEBPS/content.opf', '''<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">reader-test</dc:identifier><dc:title>Reader test</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest><item id="picture" href="pixel.png" media-type="image/png"/><item id="style" href="styles.css" media-type="text/css"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>''')
    z.writestr('OEBPS/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml">Chapter One</a></li><li><a href="two.xhtml">Chapter Two</a></li></ol></nav></body></html>')
    for chapter in ['One', 'Two']:
        paragraphs = ''.join(f'<p id="p{i}">Chapter {chapter}, paragraph {i}. This original sample paragraph lets us test selection, pagination, notes and restored reading positions on a narrow screen.</p>' for i in range(50))
        z.writestr(f'OEBPS/{chapter.lower()}.xhtml', f'''<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter {chapter}</title><link rel="stylesheet" href="styles.css"/><script>parent.__bookScriptRan = true;</script></head><body onload="parent.__bookScriptRan = true"><h1>Chapter {chapter}</h1><img id="fixture-picture" src="pixel.png"/>{paragraphs}<img src="invalid.png" onerror="parent.__bookScriptRan = true"/><a href="javascript:parent.__bookScriptRan=true">Unsafe link</a><iframe srcdoc="&lt;script&gt;parent.parent.__bookScriptRan=true&lt;/script&gt;"></iframe></body></html>''', compress_type=ZIP_DEFLATED)

    z.writestr('OEBPS/styles.css', '#p0 { font-style: italic; }')
    z.writestr('OEBPS/pixel.png', b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII='))

objects = [
    '<< /Type /Catalog /Pages 2 0 R /Outlines 10 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>',
]
for index in range(3):
    objects.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 9 0 R >> >> /Contents {4+index*2} 0 R >>')
    stream = f'BT /F1 24 Tf 40 500 Td (Reader test page {index+1}) Tj ET'
    objects.append(f'<< /Length {len(stream)} >>\nstream\n{stream}\nendstream')
objects.extend([
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Outlines /First 11 0 R /Last 11 0 R /Count 1 >>',
    '<< /Title (Final chapter) /Parent 10 0 R /Dest [7 0 R /Fit] >>',
])
data = b'%PDF-1.4\n'
offsets = [0]
for index, obj in enumerate(objects, 1):
    offsets.append(len(data))
    data += f'{index} 0 obj\n{obj}\nendobj\n'.encode()
xref = len(data)
data += f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode()
data += ''.join(f'{offset:010d} 00000 n \n' for offset in offsets[1:]).encode()
data += f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
(root / 'reader.pdf').write_bytes(data)
