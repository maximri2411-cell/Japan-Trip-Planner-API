import json
from flask import Blueprint, request, jsonify
from db_config import locations_collection
from bson import json_util
from models import validate_location_data
from bson.objectid import ObjectId

locations_bp = Blueprint("locations", __name__)


#!===========================================
@locations_bp.route("/add", methods=["POST"])
def add_location():
    raw_data = request.json
    
    cleaned_data, validation_errors = validate_location_data(raw_data) #Sending the data to models in order to check
    
    if validation_errors: #If its error so:
        return jsonify({"status": "[ERROR]", "errors": validation_errors}), 400 #Returning error with explain why
    
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
    
    #New list that order our data like we want
    final_ordered_list = []
    for loc in all_locations_list:
        ordered_loc = {
            "city": loc.get("city"),
            "name": loc.get("name"),
            "description": loc.get("description"),
            "category": loc.get("category"),
            "rating": loc.get("rating"),
            "visited": loc.get("visited"),
            "_id": str(loc.get("_id")) #Id will be last
        }
        final_ordered_list.append(ordered_loc)

    return jsonify(final_ordered_list), 200


#!===========================================
@locations_bp.route("/delete/<location_id>", methods=["DELETE"])
def delete_location(location_id):
    try:
        #Delete the data we want by ID
        result = locations_collection.delete_one({"_id": ObjectId(location_id)})
        
        if result.deleted_count == 1:
            return jsonify({"msg": "Location deleted successfully"}), 200
        else:
            return jsonify({"[ERROR]": "Location not found"}), 404
            
    except Exception as e: #If the id is not with the acceptble format
        return jsonify({"[ERROR]": "Invalid ID format"}), 400
    
    
#!===========================================
@locations_bp.route('/update/<location_id>', methods=['PATCH'])
def update_location(location_id):
    
    updates = request.json
    
    #Cleaning spaces in case there is in the input
    for key, value in updates.items():
        if isinstance(value, str):
            updates[key] = value.strip()

    try:
        result = locations_collection.update_one(
            {"_id": ObjectId(location_id)},
            {"$set": updates}
        )

        #Checks if the place us even exist
        if result.matched_count == 0:
            return jsonify({"[ERROR]": "Location not found"}), 404
        
        return jsonify({ #The messages of success

            "msg": "Location updated successfully",
            "modified_fields": result.modified_count
        }), 200

    except Exception as e: #The message od error
        return jsonify({"[ERROR]]": "Invalid ID format or update failed"}), 400