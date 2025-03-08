# Use Python as the base image
FROM python:3.9

# Set the working directory inside the container
WORKDIR /app

# Copy the project files into the container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port Flask runs on
EXPOSE 5000

# Run Gunicorn instead of Flask's dev server
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "main:app"]
