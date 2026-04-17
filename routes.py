from flask import Blueprint, request, jsonify
from db_config import locations_collection

locations_bp = Blueprint('locations', __name__)

@locations_bp.route('/add', methods=['POST'])
def add_location():
    data = request.json
    if not data:
        return jsonify({"[ERROR]": "No data provided"}), 400
    
    result = locations_collection.insert_one(data)
    
    return jsonify({
        "msg": "Location added successfully",
        "id": str(result.inserted_id)
    }), 201