FROM node:14.21.3

WORKDIR /usr/src/app

# Install SSH (if not present)
RUN apt-get update && apt-get install -y openssh-client

# Prepare SSH directory and config file
RUN mkdir -p /root/.ssh
RUN echo "Host github.com\n\tStrictHostKeyChecking no\n\tIdentityFile /root/.ssh/id_ed25519" > /root/.ssh/config
COPY id_ed25519 /root/.ssh/id_ed25519
RUN chmod 600 /root/.ssh/id_ed25519
RUN chmod 600 /root/.ssh/config
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts

# Set Git user name and email
RUN git config --global user.email "your_email@example.com"
RUN git config --global user.name "Your Name"

# Copy the application source
COPY . .

# Change to the platform directory and install dependencies
WORKDIR /usr/src/app/platform
RUN npm install

# Change back to the app directory
WORKDIR /usr/src/app

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 3005
