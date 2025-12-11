import {ApplicationConfig, ChatApplication} from './application';
import {createServer} from 'http';
import {WebSocketServer} from './websocket';

export * from './application';

export async function main(options: ApplicationConfig = {}) {
  const app = new ChatApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  // Set up WebSocket server
  const httpServer = createServer(app.restServer.requestHandler);
  const wsServer = new WebSocketServer(httpServer, app);
  
  // Start HTTP server for WebSocket on a different port
  const wsPort = +(process.env.WS_PORT ?? 3002);
  httpServer.listen(wsPort, () => {
    console.log(`WebSocket server is running at ws://localhost:${wsPort}`);
  });

  return app;
}

if (require.main === module) {
  // Run the application
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3000),
      host: process.env.HOST || '127.0.0.1',
      // The `gracePeriodForClose` provides a graceful close for http/https
      // servers with keep-alive clients. The default value is `Infinity`
      // (don't force-close). If you want to immediately destroy all sockets
      // upon stop, set its value to `0`.
      // See https://www.npmjs.com/package/stoppable
      gracePeriodForClose: 5000, // 5 seconds
      openApiSpec: {
        // useful when used with OpenAPI-to-GraphQL to locate your application
        setServersFromRequest: true,
      },
      cors: {
        origin: ['http://localhost:4200', 'http://localhost:4201'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
    },
  };
  main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
