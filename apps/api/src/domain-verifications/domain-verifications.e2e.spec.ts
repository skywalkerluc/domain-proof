import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';

describe('POST /api/domain-verifications', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a pending verification for a normalized domain', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: ' Example.COM. ' })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      domain: 'example.com',
      status: 'pending',
      createdAt: expect.any(String),
    });
  });

  it('normalizes an internationalized domain to its DNS representation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: ' MÜNICH.example. ' })
      .expect(201);

    expect(response.body.domain).toBe('xn--mnich-kva.example');
  });

  it.each([
    { case: 'missing field', body: {} },
    { case: 'empty value', body: { domain: '' } },
    { case: 'non-string value', body: { domain: 42 } },
  ])('requires a domain for $case', async ({ body }) => {
    const response = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send(body)
      .expect(400);

    expect(response.body).toEqual({
      code: 'domain_required',
      field: 'domain',
      message: 'Enter a domain to continue.',
    });
  });

  it.each([
    'example',
    'https://example.com',
    'example.com/path',
    'example.com:443',
    '127.0.0.1',
    '-example.com',
    'example_.com',
    'example..com',
    '*.example.com',
    `${'a'.repeat(64)}.com`,
  ])('rejects an invalid public DNS hostname: %s', async (domain) => {
    const response = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain })
      .expect(400);

    expect(response.body).toEqual({
      code: 'invalid_domain',
      field: 'domain',
      message: 'Enter a domain like example.com, without a protocol or path.',
    });
  });
});
