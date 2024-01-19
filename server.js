const express = require('express');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = 3005;
const IP_ADDRESS = '10.212.134.3';
const SSH_KEY_PATH = './id_ed25519';

const queue = [];
let isProcessing = false;

// Function to start ssh-agent and add key
const setupSSHAgent = () => {
  try {
    // Start ssh-agent in the background
    const sshAgentOutput = execSync('eval $(ssh-agent -s)', { stdio: 'pipe' }).toString();
    console.log(sshAgentOutput);

    // Add the SSH key
    execSync(`ssh-add ${SSH_KEY_PATH}`, { stdio: 'pipe' });
    console.log('SSH key added to the agent.');
  } catch (error) {
    console.error('Failed to setup SSH agent:', error);
  }
};

const generateRandomId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getFileHash = (filePath) => {
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }
  return null;
};

const cacheFilePath = '../package_cache.json';
let cache = {};

if (fs.existsSync(cacheFilePath)) {
  cache = JSON.parse(fs.readFileSync(cacheFilePath));
}

const processDeployment = (branch, randomId, res) => {
  const startTime = new Date();
  console.log(`Starting deployment on branch: ${branch} with ID: ${randomId}`);

  try {
    // Execute commands
    process.chdir('platform');
    execSync('git fetch');
    execSync(`git checkout ${branch}`);
    execSync(`git pull origin ${branch}`);

    // Check for changes in package.json and composer.json
    const npmHash = getFileHash('package.json');
    const composerHash = getFileHash('composer.json');

    if (npmHash !== cache.npmHash) {
      execSync('npm install');
      cache.npmHash = npmHash;
    }

    if (composerHash && composerHash !== cache.composerHash) {
      execSync('composer install');
      cache.composerHash = composerHash;
    }

    fs.writeFileSync(cacheFilePath, JSON.stringify(cache));

    const prodOutput = execSync('npm run prod').toString();
    execSync('git add .');
    execSync(`git commit -m "Prod server commit"`);
    execSync(`git push origin ${branch}`);

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // Duration in seconds

    const logEntry = `${randomId},${startTime.getDate()}.${startTime.getMonth() + 1}.${startTime.getFullYear()},${startTime.getHours()}:${startTime.getMinutes()},${req.ip},${branch},${duration},Success,${prodOutput.includes('up-to-date') ? 'No new files' : 'New files pushed'}\n`;
    fs.appendFileSync('../log.csv', logEntry);

    res.send(`Branch ${branch} deployed successfully. Duration: ${duration} seconds. URL: https://github.com/your-repo/${branch}`);

  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    const logEntry = `${randomId},${startTime.getDate()}.${startTime.getMonth() + 1}.${startTime.getFullYear()},${startTime.getHours()}:${startTime.getMinutes()},${req.ip},${branch},${duration},Error,${error.message}\n`;
    fs.appendFileSync('../log.csv', logEntry);

    console.error(`Error during deployment on branch: ${branch}`, error);
    res.status(500).send('Deployment failed');
  } finally {
    checkQueue();
  }
};

const checkQueue = () => {
  if (queue.length > 0) {
    const nextTask = queue.shift();
    isProcessing = true;
    processDeployment(nextTask.branch, nextTask.randomId, nextTask.res);
  } else {
    isProcessing = false;
  }
};

setupSSHAgent();

app.post('/', (req, res) => {
  const branch = req.body.branch; // Access the branch directly without trim
  if (!branch) {
    res.status(400).send('Branch name is required');
    return;
  }

  const randomId = generateRandomId();
  if (isProcessing) {
    queue.push({ branch, randomId, res });
  } else {
    isProcessing = true;
    processDeployment(branch, randomId, res);
  }
});

app.listen(PORT, IP_ADDRESS, () => {
  console.log(`Server running on http://${IP_ADDRESS}:${PORT}`);
});

app.timeout = 15 * 60 * 1000;
