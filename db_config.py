import os
from pymongo import MongoClient
from dotenv import load_dotenv

#Bring the values from .env to the memory of the project
load_dotenv() 

#Bring the address connaction to mongo
mongo_uri = os.getenv("MONGO_URI")

#Create client and its the main pipe for the app to talk with mongo server
client = MongoClient(mongo_uri)

#Connecting to the data base inside the server that we called "japan strip"
db = client["japan_trip"]

#went to the table "Collection" specific inside data base were we keep our locations
locations_collection = db["locations"]