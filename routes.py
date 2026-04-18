from flask import Blueprint, request, jsonify
from db_config import locations_collection
from bson import json_util
import json
from models import validate_location_data

locations_bp = Blueprint("locations", __name__)

#!===========================================
@locations_bp.route("/add", methods=["POST"])
def add_location():
    raw_data = request.json
    
    cleaned_data, validation_errors = validate_location_data(raw_data) #Sending the data to models in order to check
    
    if validation_errors: #If its error so:
        return jsonify({"status": "error", "errors": validation_errors}), 400 #Returning error with explain why
    
    formatted_data = {
        "city": cleaned_data.get("city"),
        "name": cleaned_data.get("name"),
        "description": cleaned_data.get("description"),
        "category": cleaned_data.get("category"),
        "rating": cleaned_data.get("rating"),
        "visited": cleaned_data.get("visited", False)
    }
    
    result = locations_collection.insert_one(formatted_data) #If everthing is ok, we put in mongo the clean stats
    
    return jsonify({
        "msg": "Location added successfully",
        "id": str(result.inserted_id)
    }), 201
    
#!===========================================
@locations_bp.route("/all", methods=["GET"])
def get_all_locations():
    city_filter = request.args.get("city")
    
    query = {}
    
    if city_filter:
        query["city"] = {"$regex": city_filter, "$options": "i"}
    
    all_locations_cursor = locations_collection.find(query)
    
    all_locations_list = list(all_locations_cursor)
    
    response_data = json.loads(json_util.dumps(all_locations_list))
    
    return jsonify(response_data), 200