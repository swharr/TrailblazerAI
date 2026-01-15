import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'TrailBlazer AI API',
        version: '1.0.0',
        description:
          'API for TrailBlazer AI - an overland route planning and trail analysis application',
        contact: {
          name: 'TrailBlazer AI',
        },
      },
      servers: [
        {
          url: process.env.NEXTAUTH_URL || 'http://localhost:3636',
          description: 'Current server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'User', description: 'User profile management' },
        { name: 'Vehicles', description: 'Vehicle profile management' },
        { name: 'Analysis', description: 'Trail photo analysis' },
        { name: 'Routes', description: 'Route planning and management' },
        { name: 'Admin', description: 'Admin-only endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token from NextAuth session',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string', nullable: true },
              email: { type: 'string' },
              image: { type: 'string', nullable: true },
              role: { type: 'string', enum: ['user', 'admin'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Vehicle: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string', nullable: true },
              make: { type: 'string' },
              model: { type: 'string' },
              year: { type: 'integer', nullable: true },
              features: { type: 'string', nullable: true },
              suspensionBrand: { type: 'string', nullable: true },
              suspensionTravel: { type: 'string', nullable: true },
              isDefault: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          TrailAnalysis: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              terrain: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  condition: { type: 'string' },
                  obstacles: { type: 'array', items: { type: 'string' } },
                },
              },
              difficulty: {
                type: 'object',
                properties: {
                  overall: { type: 'string' },
                  technical: { type: 'integer', minimum: 1, maximum: 10 },
                },
              },
              recommendations: {
                type: 'object',
                properties: {
                  vehicleRequirements: { type: 'array', items: { type: 'string' } },
                  tips: { type: 'array', items: { type: 'string' } },
                },
              },
              vehicleAssessment: {
                type: 'object',
                nullable: true,
              },
              fuelEstimate: {
                type: 'object',
                nullable: true,
              },
              emergencyComms: {
                type: 'object',
                nullable: true,
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          PlannedRoute: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              status: { type: 'string', enum: ['draft', 'planned', 'completed'] },
              waypoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                    name: { type: 'string' },
                    notes: { type: 'string' },
                  },
                  required: ['lat', 'lng'],
                },
              },
              totalDistance: { type: 'number', nullable: true },
              estimatedTime: { type: 'number', nullable: true },
              elevationGain: { type: 'number', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
    },
  });
  return spec;
};
