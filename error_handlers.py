from flask import jsonify

def register_error_handlers(app):
    
    # שגיאה 400 - Bad Request (נתונים לא תקינים)
    @app.errorhandler(400)
    def bad_request_error(error):
        return jsonify({
            "status": "[ERROR]",
            "message": str(error.description) if hasattr(error, 'description') else "Bad request",
            "code": 400
        }), 400

    # שגיאה 404 - Not Found (מקום לא קיים)
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            "status": "[ERROR]",
            "message": "The resource you are looking for does not exist",
            "code": 404
        }), 404

    # שגיאה 409 - Conflict (כפילות נתונים)
    @app.errorhandler(409)
    def conflict_error(error):
        return jsonify({
            "status": "[ERROR]",
            "message": str(error.description) if hasattr(error, 'description') else "Conflict detected",
            "code": 409
        }), 409

    # שגיאה 500 - שרת (תמיד כדאי שיהיה לכל מקרה)
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        return jsonify({
            "status": "[CRITICAL ERROR]",
            "message": "An unexpected error occurred on the server",
            "code": 500
        }), 500