"""Prepare immutable EPUB resources once, preserving spine order and CFI paths."""
import json
import posixpath
import shutil
import stat
import sys
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
from zipfile import ZipFile

MAX_ENTRY = 32 * 1024 * 1024
MAX_TOTAL = 512 * 1024 * 1024


def safe_path(name):
    parts = PurePosixPath(name).parts
    if not parts or name.startswith('/') or '\\' in name or any(p in ('..', '.') for p in parts) or '\x00' in name:
        raise ValueError('Unsafe EPUB resource path')
    return name


def xml(data):
    if b'<!ENTITY' in data.upper() or b'<!DOCTYPE' in data.upper():
        raise ValueError('External declarations are not supported in EPUB metadata')
    return ET.fromstring(data)


def prepare(source, destination):
    destination = Path(destination)
    resources = destination / 'resources'
    resources.mkdir(parents=True)
    with ZipFile(source) as archive:
        entries = archive.infolist()
        if len(entries) > 20000 or sum(e.file_size for e in entries) > MAX_TOTAL:
            raise ValueError('EPUB exceeds extraction limits')
        names = set()
        for entry in entries:
            safe_path(entry.filename)
            if entry.filename in names or entry.file_size > MAX_ENTRY or stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError('Invalid or oversized EPUB resource')
            names.add(entry.filename)
        container = xml(archive.read('META-INF/container.xml'))
        package = next(node.attrib['full-path'] for node in container.iter() if node.tag.endswith('}rootfile'))
        safe_path(package)
        document = xml(archive.read(package))
        namespace = {'opf': 'http://www.idpf.org/2007/opf'}
        manifest = {item.attrib['id']: item.attrib for item in document.findall('opf:manifest/opf:item', namespace)}
        sections = []
        for itemref in document.findall('opf:spine/opf:itemref', namespace):
            item = manifest[itemref.attrib['idref']]
            href = urlsplit(item['href'])
            if href.scheme or href.netloc:
                raise ValueError('Remote spine resources are not supported')
            path = safe_path(posixpath.normpath(posixpath.join(posixpath.dirname(package), unquote(href.path))))
            sections.append({'path': path, 'size': archive.getinfo(path).file_size, 'linear': itemref.attrib.get('linear', 'yes') != 'no'})
        if not sections or not any(s['linear'] and s['size'] for s in sections):
            raise ValueError('EPUB has no readable sections')
        for entry in entries:
            if entry.is_dir():
                continue
            target = resources / entry.filename
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(entry) as reader, target.open('xb') as writer:
                shutil.copyfileobj(reader, writer, 64 * 1024)
    result = {'package': package, 'sections': sections}
    (destination / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    return result


if __name__ == '__main__':
    prepare(sys.argv[1], sys.argv[2])
