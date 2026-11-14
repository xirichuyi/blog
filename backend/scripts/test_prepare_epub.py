import importlib.util
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('prepare_epub', Path(__file__).with_name('prepare_epub.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
FIXTURE = Path(__file__).resolve().parents[2] / 'front/tests/fixtures/reader.epub'


class PreparationTests(unittest.TestCase):
    def test_preserves_spine_and_resource_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            prepared = module.prepare(FIXTURE, Path(directory) / 'output')
            self.assertEqual(prepared['package'], 'OEBPS/content.opf')
            self.assertEqual([item['path'] for item in prepared['sections']], ['OEBPS/one.xhtml', 'OEBPS/two.xhtml'])
            with ZipFile(FIXTURE) as archive:
                for item in prepared['sections']:
                    content = archive.read(item['path'])
                    self.assertEqual(item['size'], len(content))
                    self.assertEqual((Path(directory) / 'output/resources' / item['path']).read_bytes(), content)

    def test_rejects_traversal(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / 'bad.epub'
            with ZipFile(archive_path, 'w') as archive:
                archive.writestr('../outside', 'unsafe')
            with self.assertRaises(ValueError):
                module.prepare(archive_path, Path(directory) / 'output')
            self.assertFalse((Path(directory) / 'outside').exists())

    def test_rejects_oversized_entry(self):
        previous = module.MAX_ENTRY
        try:
            module.MAX_ENTRY = 1
            with tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
                module.prepare(FIXTURE, Path(directory) / 'output')
        finally:
            module.MAX_ENTRY = previous


if __name__ == '__main__':
    unittest.main()
