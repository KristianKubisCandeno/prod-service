# Use an official Node runtime as a parent image (Alpine version for minimal size)
FROM node:current-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# If package.json or package-lock.json has changed, npm install will be run
RUN npm install

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3005


# Run server.js when the container launches
CMD ["node", "server.js"]
