const express = require('express');
const bodyParser = require('body-parser');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const PORT = 3005;
const IP_ADDRESS = 'custom_IP'; // Replace with your actual IP

app.post('/', (req, res) => {
  const branch = req.body.branch;
  if (!branch) {
    res.status(400).send('Branch name is required');
    return;
  }

  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] - Starting deployment on branch: ${branch}`);

  try {
    // Execute commands
    process.chdir('platform');
    execSync('git fetch');
    execSync(`git checkout ${branch}`);
    execSync(`git pull origin ${branch}`);
    const prodOutput = execSync('npm run prod').toString();
    execSync('git add .');
    execSync(`git commit -m "Deployment on ${branch}"`);
    execSync(`git push origin ${branch}`);

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // Duration in seconds

    const logEntry = `${startTime.getDate()}.${startTime.getMonth() + 1}.${startTime.getFullYear()},${startTime.getHours()}:${startTime.getMinutes()},${req.ip},${branch},${duration},Success,${prodOutput.includes('up-to-date') ? 'No new files' : 'New files pushed'}\n`;

    fs.appendFileSync('../log.csv', logEntry);

    res.send(`Branch ${branch} deployed successfully. Duration: ${duration} seconds. URL: https://github.com/your-repo/${branch}`);

  } catch (error) {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    const logEntry = `${startTime.getDate()}.${startTime.getMonth() + 1}.${startTime.getFullYear()},${startTime.getHours()}:${startTime.getMinutes()},${req.ip},${branch},${duration},Error,\n`;
    fs.appendFileSync('../log.csv', logEntry);

    console.error(`Error during deployment on branch: ${branch}`, error);
    res.status(500).send('Deployment failed');
  }
});

app.listen(PORT, IP_ADDRESS, () => {
  console.log(`Server running on http://${IP_ADDRESS}:${PORT}`);
});
