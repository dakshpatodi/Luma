import os
import tempfile
import unittest

from fastapi.testclient import TestClient

database_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
database_file.close()
os.environ['LUMA_DATABASE_PATH'] = database_file.name

from app.database import initialize_database  # noqa: E402
from app.main import app  # noqa: E402

class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        initialize_database()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        os.unlink(database_file.name)

    def test_health(self) -> None:
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})

    def test_seeded_photos_are_available(self) -> None:
        response = self.client.get('/api/photos')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 4)

if __name__ == '__main__':
    unittest.main()
