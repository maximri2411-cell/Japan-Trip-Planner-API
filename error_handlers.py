from flask import jsonify

def register_error_handlers(app):
    
    # 400 - Bad Request 
    @app.errorhandler(400)
    def bad_request_error(error):
        return jsonify({
            "status": "[ERROR]",
            "message": str(error.description) if hasattr(error, 'description') else "Bad request",
            "code": 400
        }), 400

    #404 - Not Found
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            "status": "[ERROR]",
            "message": "The resource you are looking for does not exist",
            "code": 404
        }), 404

    #409 - Conflict
    @app.errorhandler(409)
    def conflict_error(error):
        return jsonify({
            "status": "[ERROR]",
            "message": str(error.description) if hasattr(error, 'description') else "Conflict detected",
            "code": 409
        }), 409

    # 500 - server
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        return jsonify({
            "status": "[CRITICAL ERROR]",
            "message": "An unexpected error occurred on the server",
            "code": 500
        }), 500