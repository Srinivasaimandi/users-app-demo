# Use Node.js official image
FROM node:24

# Set working directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose the port your app uses (commonly 3000 or 9899)
EXPOSE 9899

# Command to run the app
CMD ["node", "index.js"]
