#!/bin/sh

# Start the SSH agent
eval "$(ssh-agent -s)"

# Add the SSH key
ssh-add /root/.ssh/id_ed25519

# Start your Node.js application
node server.js
