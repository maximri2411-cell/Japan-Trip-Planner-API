from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['japan_db']
locations_collection = db['locations']