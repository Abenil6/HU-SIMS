const express = require('express');
const request = require('supertest');
const { validateBody, validateQuery, validateParams } = require('../../utils/validateInput');

const buildApp = (routePath, ...middleware) => {
  const app = express();
  app.use(express.json());
  app.post(routePath, ...middleware, (req, res) => {
    res.json({ success: true, body: req.body, query: req.query, params: req.params });
  });
  app.get(routePath, ...middleware, (req, res) => {
    res.json({ success: true, body: req.body, query: req.query, params: req.params });
  });
  return app;
};

describe('validateInput middleware', () => {
  it('validates required body fields and returns 400 on missing values', async () => {
    const app = buildApp(
      '/login',
      validateBody({
        email: { required: true, type: 'string', format: 'email' },
        password: { required: true, type: 'string', minLength: 8 },
      })
    );

    const response = await request(app).post('/login').send({ email: 'test@example.com' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toContain('password is required');
  });

  it('normalizes query numbers and booleans', async () => {
    const app = buildApp(
      '/items',
      validateQuery({
        page: { type: 'number', min: 1 },
        unreadOnly: { type: 'boolean' },
      })
    );

    const response = await request(app).get('/items?page=2&unreadOnly=true');
    expect(response.status).toBe(200);
    expect(response.body.query.page).toBe(2);
    expect(response.body.query.unreadOnly).toBe(true);
  });

  it('validates params objectId', async () => {
    const app = buildApp(
      '/users/:id',
      validateParams({
        id: { required: true, type: 'objectId' },
      })
    );

    const invalid = await request(app).get('/users/not-an-id');
    expect(invalid.status).toBe(400);
    expect(invalid.body.errors).toContain('id must be a valid objectId');
  });

  it('rejects unknown fields when allowUnknown is false', async () => {
    const app = buildApp(
      '/strict',
      validateBody(
        {
          name: { required: true, type: 'string' },
        },
        { allowUnknown: false }
      )
    );

    const response = await request(app).post('/strict').send({ name: 'A', extra: 'x' });
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('Unexpected field: extra');
  });

  it('supports abortEarly option', async () => {
    const app = buildApp(
      '/early',
      validateBody(
        {
          email: { required: true, type: 'string', format: 'email' },
          age: { required: true, type: 'number', min: 18 },
        },
        { abortEarly: true }
      )
    );

    const response = await request(app).post('/early').send({ email: 'bad-email', age: 10 });
    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBe(1);
  });
});
