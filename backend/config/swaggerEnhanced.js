// This code enhances the Swagger configuration by adding a function to infer tags based on the path.
// It also includes a comprehensive description of the API, security schemes, and schemas for error handling.
// The schemas are auto-generated from Mongoose models, ensuring they are always up-to-date.

const schemas = require('../utils/generateSchemas')();

const swaggerEnhanced = {
  openapi: "3.0.0",
  info: {
    title: 'Gram Sabha Management System API',
    description: `
## Comprehensive API for Digital Village Governance

This API serves both Admin Portal (panchayat management) and Citizen Portal (services & issue reporting).

### Features:
- **Biometric Authentication** - Facial recognition login
- **Panchayat & Ward Management** - Complete CRUD operations
- **Issue Tracking** - Rich content reporting with images/audio
- **Multi-language Support** - English & Hindi
- **Member Management** - CSV import, bulk operations

### Authentication:
Most endpoints require JWT Bearer token authentication.

### File Uploads:
Endpoints support multipart/form-data for images, audio, and documents.
    `,
    version: '1.0.0',
  },
  servers: [
    {
      url: process.env.BACKEND_URL || 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://egramsabha.empowerpanchayat.org/',
      description: 'Production server',
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT Bearer token'
      },
    },
    schemas: {
      ...schemas, // Auto-generated from Mongoose models
      Authentication: {
        title: "Authentication",
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "admin" },
          password: { type: "string", example: "yourpassword" }
        }
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          error: { type: 'string' },
          status: { type: 'number' }
        }
      },
      Success: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          data: { type: 'object' },
          status: { type: 'number' }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
    tags: [
    { name: 'Authentication', description: 'Authentication and login operations' },
    { name: 'Citizens', description: 'Citizen profile and identity operations' },
    { name: 'Gram Sabhas', description: 'Gram Sabha meeting management' },
    { name: 'Issues', description: 'Issue reporting and resolution' },
    { name: 'Officials', description: 'Gram Sabha official functions' },
    { name: 'Panchayats', description: 'Panchayat configuration and data' },
    { name: 'Users', description: 'User account management' },
    { name: 'Platform Configs', description: 'Platform-wide configuration settings' },
    ],

};

module.exports = swaggerEnhanced;