/**
 * Generator for Python Tests (Pytest + FastAPI TestClient)
 */
window.TestGenerator = {
    generate: (config) => {
        const title = config.name || "App";
        const resName = config.resourceName || "Item";
        const resNameLower = resName.toLowerCase();
        const resNamePlural = resNameLower + "s";

        const testContent = `
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 1. Test Auth Flow
def test_register_and_login():
    # Register
    login_data = {"username": "testuser@example.com", "password": "password123"}
    response = client.post("/users/", json=login_data)
    assert response.status_code == 200 or response.status_code == 400 # 400 if already exists

    # Login
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token is not None
    return token

# 2. Test Resource Lifecycle (${resName})
def test_create_${resNameLower}():
    # Login first
    token = test_register_and_login()
    headers = {"Authorization": f"Bearer {token}"}

    # Create
    item_data = {"title": "Test ${resName}", "description": "Automated test item"}
    response = client.post("/${resNamePlural}/", json=item_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test ${resName}"
    assert "id" in data

def test_read_${resNamePlural}():
    # Login
    token = test_register_and_login()
    headers = {"Authorization": f"Bearer {token}"}

    # Read
    response = client.get("/${resNamePlural}/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ${title} API"}
`;

        return {
            'test_main.py': testContent,
            '__init__.py': '' // Make it a package
        };
    }
};
