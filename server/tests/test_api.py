import os
import tempfile
import unittest

database_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
database_file.close()
os.environ['LUMA_DATABASE_PATH'] = database_file.name

from app.database import get_consent, initialize_database, update_consent  # noqa: E402
from app.main import health, list_photos  # noqa: E402

class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        initialize_database()

    @classmethod
    def tearDownClass(cls) -> None:
        os.unlink(database_file.name)

    def test_health(self) -> None:
        self.assertEqual(health(), {'status': 'ok'})

    def test_seeded_photos_are_available(self) -> None:
        self.assertGreaterEqual(len(list_photos()), 4)

    def test_consent_can_be_updated(self) -> None:
        self.assertFalse(get_consent('jamie'))
        self.assertTrue(update_consent('jamie', True, 'test'))
        self.assertTrue(get_consent('jamie'))

if __name__ == '__main__':
    unittest.main()
