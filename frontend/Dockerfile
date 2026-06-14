# Use a lightweight Nginx image to serve static frontend files
FROM nginx:alpine

# Create a non-root group and user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy frontend files (HTML, CSS, JS) into Nginx's web directory
COPY . /usr/share/nginx/html

# Give ownership of the files to the non-root user
RUN chown -R appuser:appgroup /usr/share/nginx/html

# Document that the container listens on HTTP port 80
EXPOSE 80

# Start Nginx in the foreground so the container stays alive
CMD ["nginx", "-g", "daemon off;"]