import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { AppModule } from '../app.module';
import { PrismaService } from '../prisma.service';

type StoredDomainVerification = {
  id: string;
  domain: string;
  challengeToken: string;
  createdAt: Date;
};

describe('/api/domain-verifications', () => {
  let app: INestApplication;
  let records: Map<string, StoredDomainVerification>;

  beforeEach(async () => {
    records = new Map();

    const prisma = {
      domainVerification: {
        create: jest.fn(
          ({
            data,
          }: {
            data: { domain: string; challengeToken: string };
          }): StoredDomainVerification => {
            const verification = {
              id: randomUUID(),
              domain: data.domain,
              challengeToken: data.challengeToken,
              createdAt: new Date(),
            };

            records.set(verification.id, verification);
            return verification;
          },
        ),
        findUnique: jest.fn(
          ({ where }: { where: { id: string } }) =>
            records.get(where.id) ?? null,
        ),
      },
    };

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

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
      dnsRecord: {
        type: 'TXT',
        name: '_domain-proof.example.com',
        value: expect.stringMatching(/^domain-proof=[A-Za-z0-9_-]{43}$/),
      },
    });
  });

  it('retrieves a created verification by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/domain-verifications/${created.body.id}`)
      .expect(200);

    expect(response.body).toEqual(created.body);
  });

  it('does not accept a client-selected challenge', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({
        domain: 'example.com',
        challengeToken: 'client-selected-token',
      })
      .expect(201);

    expect(response.body.dnsRecord.value).not.toBe(
      'domain-proof=client-selected-token',
    );
  });

  it('generates a distinct challenge for each verification', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);

    expect(second.body.dnsRecord.value).not.toBe(first.body.dnsRecord.value);
  });

  it('returns an actionable response when a verification does not exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/domain-verifications/4f0c4f08-5c04-48aa-a9fd-b3a340582a95')
      .expect(404);

    expect(response.body).toEqual({
      code: 'verification_not_found',
      message: 'This domain verification could not be found.',
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
    `${'a'.repeat(63)}.${'a'.repeat(63)}.${'a'.repeat(63)}.${'a'.repeat(48)}`,
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
