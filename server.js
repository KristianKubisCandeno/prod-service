const express = require('express');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.text({ type: "*/*" }));

const PORT = 3005;
const IP_ADDRESS = '0.0.0.0';

const queue = [];
let isProcessing = false;

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

const processDeployment = (branch, randomId, req, res) => {
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
    
    if (npmHash !== cache.npmHash) {
      execSync('npm install');
      cache.npmHash = npmHash;
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
    processDeployment(nextTask.branch, nextTask.randomId, nextTask.req, nextTask.res);
  } else {
    isProcessing = false;
  }
};


app.post('/', (req, res) => {
  const branch = req.body.trim(); // Trim the branch name from the body

  if (!branch) {
    res.status(400).send('Branch name is required');
    return;
  }

  queue.push({ branch, randomId: generateRandomId(), req, res });
  console.log(`Received request for branch: ${branch} from ${req.ip}`);

  if (!isProcessing) {
    checkQueue();
  }
});

app.listen(PORT, IP_ADDRESS, () => {
  console.log(`Server running on http://${IP_ADDRESS}:${PORT}`);
});

app.timeout = 15 * 60 * 1000;
