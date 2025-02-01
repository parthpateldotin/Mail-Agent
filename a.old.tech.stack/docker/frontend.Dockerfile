FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* frontend/yarn.lock* ./

# Install dependencies based on the preferred package manager
RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm i; \
    fi

# Copy the rest of the application
COPY frontend/ .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"] 