# Use Python as the base image
FROM python:3.9

# Set the working directory inside the container
WORKDIR /app

# Copy the project files into the container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port 5000 (default for Flask)
EXPOSE 5000

# Command to run the Flask app
CMD ["python", "app.py"]
