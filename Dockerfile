# Use a specific Node.js version
FROM node:14.21.3-alpine

# Install git, openssh-client, and add GitHub to known hosts
RUN apk update && apk add --no-cache git openssh-client \
    && mkdir -p /root/.ssh \
    && ssh-keyscan github.com >> /root/.ssh/known_hosts \
    && chmod 600 /root/.ssh/known_hosts

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the SSH key and script file
COPY ./id_ed25519 /root/.ssh/id_ed25519
COPY entrypoint.sh /usr/src/app/
RUN chmod 600 /root/.ssh/id_ed25519 && chmod +x /usr/src/app/entrypoint.sh

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies (only runs if package*.json files change)
RUN npm install --unsafe-perm

# Change to the 'platform' subdirectory
WORKDIR /usr/src/app/platform

# Install dependencies in the 'platform' directory
RUN npm install --unsafe-perm

# Optionally, change back to the main working directory if further actions are needed there
WORKDIR /usr/src/app

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3005

# Start script
CMD ["/usr/src/app/entrypoint.sh"]
