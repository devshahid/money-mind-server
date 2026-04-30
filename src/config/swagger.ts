import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Money Mind API',
      version: '1.0.0',
      description:
        'Personal finance management API with AI-powered insights. Manage transactions, budgets, debts, and goals with intelligent categorization and recommendations.',
      contact: {
        name: 'API Support',
        email: 'support@moneymind.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
      {
        url: process.env.API_BASE_URL || 'https://api.moneymind.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'number',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'number',
              example: 200,
            },
            output: {
              type: 'object',
            },
            message: {
              type: 'string',
              example: 'Success',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'AI',
        description: 'AI-powered features (categorization, chat, recommendations)',
      },
      {
        name: 'Transactions',
        description: 'Transaction management and tracking',
      },
      {
        name: 'Budgets',
        description: 'Budget planning and monitoring',
      },
      {
        name: 'Debts',
        description: 'Debt tracking and payment management',
      },
      {
        name: 'Goals',
        description: 'Financial goals and savings targets',
      },
      {
        name: 'Analytics',
        description: 'Financial analytics and insights',
      },
      {
        name: 'Income',
        description: 'Income tracking and management',
      },
      {
        name: 'Expenses',
        description: 'Expense tracking and categorization',
      },
      {
        name: 'Members',
        description: 'Saved members and payees',
      },
    ],
  },
  apis: [
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.controller.ts',
    './src/shared/core/*.ts',
    './src/routes/*.ts', // Legacy routes during migration
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger documentation for the Express app
 * @param app - Express application instance
 */
export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Money Mind API Documentation',
    })
  );

  // JSON spec endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
}

export { swaggerSpec };
