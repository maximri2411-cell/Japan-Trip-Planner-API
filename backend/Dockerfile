# Use a specific Python version instead of latest
FROM python:3.12-slim AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy dependency file
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Start a new, clean stage
FROM python:3.12-slim

# Create a non-root user and group for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy installed Python packages from the builder stage
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

# Copy Gunicorn executable from the builder stage
COPY --from=builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn

# Copy application source code
COPY . .

# Give ownership of application files to appuser
RUN chown -R appuser:appgroup /app

# Run the container as a non-root user
USER appuser

# Application listens on port 5000
EXPOSE 5000

# Start the Flask application with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]