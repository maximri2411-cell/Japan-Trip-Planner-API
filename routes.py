import json
from flask import Blueprint, request, jsonify, abort
from db_config import locations_collection
from bson import json_util
from models import validate_location_data, validate_partial_data
from bson.objectid import ObjectId

#Creating an extension with the name 'locations'
#Allows us to organize the paths in a separate file from the main app
locations_bp = Blueprint("locations", __name__)


#!===========================================
@locations_bp.route("/add", methods=["POST"])
def add_location():
    raw_data = request.json #Takes the data that send from body in postman
    
    #Validation send the data for test in models and gets back clean data or errors
    cleaned_data, validation_errors = validate_location_data(raw_data)
    
    if validation_errors: #If its error so:
        abort(400, description=validation_errors)
    
    #The format we want to be saved in mongo, and making sure that all of the fileds exist in the right order
    formatted_data = {
        "city": cleaned_data.get("city"),
        "name": cleaned_data.get("name"),
        "description": cleaned_data.get("description"),
        "category": cleaned_data.get("category"),
        "rating": cleaned_data.get("rating"),
        "visited": cleaned_data.get("visited", False) #In case it will be empty, it will print "False"
    }
    
    #Check if the city alredy exist
    existing_location = locations_collection.find_one({
        "name": formatted_data["name"],
        "city": formatted_data["city"]
    })
    
    if existing_location:
        #409 Says that somthing already exist
        abort(409, description="This location already exists in your trip list")
    
    result = locations_collection.insert_one(formatted_data)
    
    #The inject to mongo
    result = locations_collection.insert_one(formatted_data) #If everthing is ok, we put in mongo the clean stats
    return jsonify({"msg": "Location added successfully", "id": str(result.inserted_id)}), 201
#!===========================================
@locations_bp.route("/all", methods=["GET"])
def get_all_locations():
    
    #Takes parametrim from URL (query params) like ?city=tokyo
    city_filter = request.args.get("city")
    category_filter = request.args.get("category")
    rating_filter = request.args.get("rating")
    
    #The query object to be sent to Mongo
    query = {}
    
    if city_filter:
        #Using the regex (not case sensetive) for flexible search
        query["city"] = {"$regex": city_filter, "$options": "i"}
    
    if category_filter:
        query["category"] = {"$regex": category_filter, "$options": "i"}
        
    if rating_filter:
        try:
            query["rating"] = int(rating_filter) #Conversion number 
        except ValueError:
            pass
        
    #Performing the search in mpngo and returns cursor (points on data)
    all_locations_cursor = locations_collection.find(query)
    all_locations_list = list(all_locations_cursor) #Making the result to list of python
    
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
            "_id": str(loc.get("_id")) #conversion from objectid to string
        }
        final_ordered_list.append(ordered_loc)

    return jsonify(final_ordered_list), 200


#!===========================================
@locations_bp.route("/<location_id>", methods=["GET"])
def get_location_by_id(location_id):
    
    try: #Trying to find by ID
        location = locations_collection.find_one({"_id": ObjectId(location_id)})
        
        if location: #Order what we get from data base in our format
            return jsonify({
                "city": location.get("city"),
                "name": location.get("name"),
                "description": location.get("description"),
                "category": location.get("category"),
                "rating": location.get("rating"),
                "visited": location.get("visited"),
                "_id": str(location.get("_id"))
            }), 200
        else:
            return jsonify({"[ERROR]": "Location not found"}), 404
            
    except Exception as e:
        return jsonify({"[ERROR]": "Invalid ID format"}), 400


#!===========================================
@locations_bp.route("/delete/<location_id>", methods=["DELETE"])
def delete_location(location_id):
    try:
        #Trying to delete by id, we need to cover the id with objectid() of mongo
        result = locations_collection.delete_one({"_id": ObjectId(location_id)})
        
        #Check if mongo relly found and deleted other 
        if result.deleted_count == 1:
            return jsonify({"msg": "Location deleted successfully"}), 200
        else:
            return jsonify({"[ERROR]": "Location not found"}), 404
            
    #If the id is not with the acceptble format
    except Exception as e: 
        return jsonify({"[ERROR]": "Invalid ID format"}), 400
    
    
#!===========================================
@locations_bp.route("/update/<location_id>", methods=["PATCH"])
def update_location(location_id):
    
    raw_updates = request.json
    
    #Checkin only the fileds that has been send to update
    cleaned_updates, validation_errors = validate_partial_data(raw_updates)
    
    #Here we stop in case the rating is above 5
    if validation_errors:
        return jsonify({"[ERROR]": validation_errors}), 400

    try: #Command $set update only the requested fileds and save the other info without change
        result = locations_collection.update_one(
            {"_id": ObjectId(location_id)},
            {"$set": cleaned_updates} 
        )

        #Checks if the place us even exist
        if result.matched_count == 0:
            return jsonify({"[ERROR]": "Location not found"}), 404
        
        return jsonify({ #The messages of success
            "msg": "Location updated successfully",
            "modified_fields": result.modified_count #Return only what has been changed
        }), 200

    except Exception as e: #The message od error
        return jsonify({"[ERROR]]": "Invalid ID format or update failed"}), 400
    
    
#!===========================================
@locations_bp.route("/replace/<location_id>", methods=["PUT"])
def replace_location(location_id):
    
    #Getting the new data that replace the old one
    raw_data = request.json
    
    #Secured valitation like in post
    cleaned_data, validation_errors = validate_location_data(raw_data)
    
    if validation_errors:
        return jsonify({"[ERROR]": validation_errors}), 400

    try:
        #replace_one deletes the old o=info and puts the new object insted onder the same id
        result = locations_collection.replace_one(
            {"_id": ObjectId(location_id)},
            cleaned_data
        )

        if result.matched_count == 0:
            return jsonify({"[ERROR]": "Location not found"}), 404
        
        return jsonify({
            "msg": "Location replaced successfully",
            "modified_count": result.modified_count
        }), 200

    except Exception as e:
        return jsonify({"[ERROR]": "Invalid ID format or replace failed"}), 400
    
    
#!===========================================
@locations_bp.route("/grouped", methods=["GET"])
def get_grouped_locations():
    all_locations = list(locations_collection.find()) #Gets all locations from data base
    
    grouped_data = {} #Empty dict
    
    for loc in all_locations: #Run over all locations and puting onder the city name
        city_name = loc.get("city", "Unknown")
        
        #If the city does not exist, we create an empty list
        if city_name not in grouped_data:
            grouped_data[city_name] = []
        
        #Creation of the object place like in GET   
        location_info = {
            "name": loc.get("name"),
            "description": loc.get("description"),
            "category": loc.get("category"),
            "rating": loc.get("rating"),
            "visited": loc.get("visited"),
            "_id": str(loc.get("_id"))
        }
        
        #Adding the place to the citu list
        grouped_data[city_name].append(location_info)
        
    return jsonify(grouped_data), 200