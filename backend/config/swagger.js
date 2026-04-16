const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SIMS Backend API',
    version: '1.0.0',
    description: 'School Information Management System API'
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    { name: 'Auth', description: 'Authentication - Login, logout, password management' },
    { name: 'Admin Users', description: 'User management by admin' },
    { name: 'Academic Records', description: 'Grades and academic performance' },
    { name: 'Timetable', description: 'Schedule and class timetables' },
    { name: 'Attendance', description: 'Student attendance tracking' },
    { name: 'Reports', description: 'Report generation and export' }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'] // Swagger will read comments from routes
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
