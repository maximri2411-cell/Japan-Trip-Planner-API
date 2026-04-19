def test_get_all_locations(client):
    response = client.get('/locations/all')
    assert response.status_code == 200 #To make sure we had success