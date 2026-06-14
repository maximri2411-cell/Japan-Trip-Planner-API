import pytest
import time
import os

# Force a dedicated DB for tests before importing app/db modules
os.environ["TESTING"] = "true"
os.environ.setdefault("TEST_MONGO_DB_NAME", "japan_trip_test")

from app import app
from db_config import locations_collection

#This thing help us to "active" the server without even touch him
@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def clean_test_db():
    locations_collection.delete_many({})
    yield
    locations_collection.delete_many({})

#Test to check if the data is pulled well
def test_get_all_locations(client):
    response = client.get('/locations/all')
    assert response.status_code == 200 
    assert isinstance(response.get_json(), list)

#Test for the location works with mongo
def test_add_location_and_verify(client):
    unique_name = f"Test Place {time.time()}" #Unique name wuth the currect time
    
    new_loc = {
        "name": unique_name, #The name will always be diffrent
        "city": "Kyoto",
        "category": "Test",
        "rating": 5,
        "description": "Created by automated test",
        "map_url": "http://maps.com/test"
    }
    
    #POST request
    response = client.post('/locations/add', json=new_loc)
    
    #Check if the server prints the status
    assert response.status_code in [200, 201]
    
    #Check if the messages from json is exactly like we created
    res_data = response.get_json()
    assert "success" in res_data.get("msg", "").lower()

#Test if the format that returns from mongo is like we wish
def test_get_all_locations_content(client):
    response = client.get('/locations/all')
    data = response.get_json()
    
    if len(data) > 0:
        first_location = data[0]
        assert "name" in first_location
        assert "city" in first_location
        #Here we check that the important fields exist in the first data poiubts to the screen