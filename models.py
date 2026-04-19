

def validate_location_data(data):

    errors = []

    #This is for cleaning spaces in case there are from the input of the customer
    text_fields = ["city", "name", "category", "description"]
    for field in text_fields:
        if field in data and isinstance(data[field], str):
            data[field] = data[field].strip()

    #This one in case the customer not putting all of the required deatails, if it misses it will bring error
    if not data.get("name"):
        errors.append("Missing field: name is required")
    if not data.get("city"):
        errors.append("Missing field: city is required")

    #Creating a loop to make sure the customer puts an int from 1 to 5 only
    rating = data.get("rating")
    if rating is not None:
        try:
            rating = int(rating) #Trying to make the 
            if not (1 <= rating <= 5): #Checking the number is from 1 to 5
                errors.append("Rating must be between 1 and 5")
                
            data["rating"] = rating #Making sure that the input will go as int and not str
        except (ValueError, TypeError):
            errors.append("Rating must be a valid number") #Our error message
            
    if not data.get("category"): #In case the customer havent put an category, it will auto as General
        data["category"] = "General"

    return data, errors #Returns the new data and errors


#!===========================================
def validate_partial_data(data): #This is made for patch
    
    errors = []
    
    #Checking the rating only if it's please
    if "rating" in data:
        rating = data["rating"]
        try:
            rating = int(rating)
            if not (1 <= rating <= 5):
                errors.append("Rating must be between 1 and 5")
            data["rating"] = rating
        except (ValueError, TypeError):
            errors.append("Rating must be a valid number")

    #Checking the fileds so they wont be empty
    text_fields = ["name", "city", "category"]
    for field in text_fields:
        if field in data:
            if isinstance(data[field], str):
                data[field] = data[field].strip()
                if not data[field]: 
                    errors.append(f"Field '{field}' cannot be empty")
            else:
                errors.append(f"Field '{field}' must be a string")

    return data, errors