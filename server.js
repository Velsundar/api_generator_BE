const fastify = require("fastify")({
  logger: true,
  connectionTimeout: 30000
});
const fs = require("fs-extra");
const { spawn } = require("child_process");
require('dotenv').config();

const API_DIR = "./generated-apis";
fs.ensureDirSync(API_DIR); // Create directory if it doesn't exist

fastify.post("/api/generate", async (request, reply) => {
  const { endpoint, method, headers, body, authorization } = request.body;

  const apiCode = `
    const fastify = require('fastify')({
        logger: true,
        connectionTimeout: 30000
    });
  
    fastify.${method.toLowerCase()}('${endpoint}', async (request, reply) => {
      ${authorization
        ? `if (request.headers.authorization !== '${authorization}') {
        return reply.code(401).send({ error: 'Unauthorized' });
      }`
        : ""}
      
      const headers = ${headers ? headers : "{}"};
      const body = ${body ? body : "{}"};
  
      reply.headers(headers).send(body);
    });
  
    fastify.listen(3002, (err, address) => {
      if (err) throw err;
      fastify.log.info(\`Server listening on \${address}\`);
    });
    `;

  try {
    // Step 1: Create the API file
    const fileName = `${endpoint.replace("/", "_")}.js`; // Use underscore to replace slash
    const filePath = `${API_DIR}/${fileName}`;
    await fs.outputFile(filePath, apiCode);
    console.log("API file created successfully:", filePath);

    // Step 2: Add the new API file to Git using spawn
    const gitAdd = spawn("git", ["add", filePath], { cwd: __dirname });

    gitAdd.stdout.on("data", data => {
      console.log(`Add output: ${data}`);
    });

    gitAdd.stderr.on("data", data => {
      console.error(`Add error: ${data}`);
    });

    gitAdd.on("close", async code => {
      if (code !== 0) {
        console.error(`Git add failed with code ${code}`);
        return reply.code(500).send({ error: "Failed to add files to Git" });
      }
      console.log(`Current working directory: ${__dirname}`);

      console.log("Files added to Git successfully");

      // Step 3: Commit the new API file
      const gitCommit = spawn(
        "git",
        ["commit", "-m", `${endpoint} API added`],
        { cwd: __dirname }
      );

      gitCommit.stdout.on("data", data => {
        console.log(`Commit output: ${data}`);
      });

      gitCommit.stderr.on("data", data => {
        console.error(`Commit error: ${data}`);
      });

      gitCommit.on("close", async code => {
        if (code !== 0) {
          console.error(`Git commit failed with code ${code}`);
          return reply.code(500).send({ error: "Failed to commit files" });
        }
        console.log("Commit successful");

        // Step 4: Push the changes to the remote repo
        const gitPush = spawn('git', ['push', '--verbose', '--progress'], {
            cwd: __dirname,
            env: { ...process.env, GIT_TRACE: '1' },
            GITHUB_TOKEN: process.env.GITHUB_TOKEN // Set the environment variable properly
          });


        gitPush.stdout.on('data', (data) => {
            console.log(`Git Push Output: ${data}`);
        });
        
        gitPush.stderr.on('data', (data) => {
            console.error(`Git Push Error: ${data}`);
        });
        
        gitPush.on('close', (code) => {
            if (code !== 0) {
              console.error(`Git push failed with code ${code}`);
              return reply.code(500).send({ error: 'Failed to push to remote repo' }); // Ensure you exit after sending the reply
            }
            console.log('Push to remote repo successful');
            return reply.send({ message: `API generated and pushed to repo successfully.` });
          });      });
    });
  } catch (error) {
    console.error("Error during API generation process:", error);
    reply
      .code(500)
      .send({ error: "Failed to generate API", details: error.message });
  }
});

fastify.get("/ping", async (request, reply) => {
  return { message: "pong" };
});

fastify.listen({ port: 4001 }, (err, address) => {
  if (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
  fastify.log.info(`Server listening on ${address}`);
});
