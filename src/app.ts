import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { ApiError } from './core/ApiError';
import router from './routes/index';

process.on('uncaughtException', (e) => {
  console.error(e);
});

const app = express();

// Create health route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send({ message: 'Server is running' });
});

// Apply parser middleware to parse data in json and url form
// app.ts or server.ts
app.use(express.json({ limit: '10mb' })); // or higher, like '50mb'
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Apply cors and helmet middlewares
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'accessToken', 'accesstoken'],
  })
);
app.use(helmet());

// Middleware to log requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Received ${req.method} request at ${req.originalUrl}`);
  if (req.body) console.log('Request Body:', req.body); // Logs request body
  if (req.params) console.log('Request Parameters:', req.params); // Logs request body
  if (req.query) console.log('Request Query:', req.query); // Logs request body
  next();
});

// Routes
app.use('/api/v1', router);

// // catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => next(new Error('Route not found')));

// Middleware Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    console.error(
      `${err.date} - ${err.statusCode} - ${JSON.stringify(err.message)} - ${req.originalUrl} - ${
        req.method
      } - ${req.ip}`
    );
    ApiError.errorResponse(err, res);
  } else {
    if (err.message) {
      console.error(
        `${new Date()} - ${500} - ${JSON.stringify(err.message)} - ${req.originalUrl} - ${
          req.method
        } - ${req.ip}`
      );
      res.status(500).json(err.message);
    } else {
      console.error(
        `${new Date()} - ${500} - ${'Internal Server Error'} - ${req.originalUrl} - ${
          req.method
        } - ${req.ip}`
      );
      res.status(500).json('Internal Server Error');
    }
    next();
  }
});

export default app;
