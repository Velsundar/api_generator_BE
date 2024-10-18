
    const fastify = require('fastify')({
        logger: true,
        connectionTimeout: 30000
    });
  
    fastify.post('/vel6', async (request, reply) => {
      if (request.headers.authorization !== 'Bearer abc123') {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const headers = {"Content-Type": "application/json"};
      const body = {"name": "John Doe", "fatherName": "Robert Doe", "message": "Hello World"};
  
      reply.headers(headers).send(body);
    });
  
    fastify.listen(3002, (err, address) => {
      if (err) throw err;
      fastify.log.info(`Server listening on ${address}`);
    });
    