#!/bin/bash

# Start the SSH agent
eval "$(ssh-agent -s)"

# Add the SSH key
ssh-add /root/.ssh/id_ed25519

# Log the loaded keys to verify
ssh-add -l

# Start your Node.js application
node server.js
