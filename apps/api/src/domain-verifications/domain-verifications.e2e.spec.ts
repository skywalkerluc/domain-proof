import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { AppModule } from '../app.module';
import { PrismaService } from '../prisma.service';
import { DOMAIN_VERIFICATION_DNS_RESOLVER } from './domain-verification-dns-resolver';

type StoredDomainVerification = {
  id: string;
  domain: string;
  challengeToken: string;
  status: 'pending' | 'verified';
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  lastCheckOutcome:
    | 'verified'
    | 'record_not_found'
    | 'record_mismatch'
    | 'lookup_error'
    | null;
  createdAt: Date;
};

describe('/api/domain-verifications', () => {
  let app: INestApplication;
  let records: Map<string, StoredDomainVerification>;
  let txtRecords: string[][];
  let txtLookupError: unknown;
  let resolveTxtMock: jest.Mock<Promise<string[][]>, [string]>;

  beforeEach(async () => {
    records = new Map();
    txtRecords = [];
    txtLookupError = null;
    resolveTxtMock = jest.fn<Promise<string[][]>, [string]>(async () => {
      if (txtLookupError) {
        throw txtLookupError;
      }

      return txtRecords;
    });

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
              status: 'pending' as const,
              verifiedAt: null,
              lastCheckedAt: null,
              lastCheckOutcome: null,
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
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: {
              id: string;
              status: 'pending';
              OR: [
                { lastCheckedAt: null },
                { lastCheckedAt: { lte: Date } },
              ];
            };
            data: { lastCheckedAt: Date };
          }): { count: number } => {
            const verification = records.get(where.id);
            const cooldownThreshold = where.OR[1].lastCheckedAt.lte;

            if (
              !verification ||
              verification.status !== where.status ||
              (verification.lastCheckedAt !== null &&
                verification.lastCheckedAt > cooldownThreshold)
            ) {
              return { count: 0 };
            }

            Object.assign(verification, data);
            return { count: 1 };
          },
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<StoredDomainVerification>;
          }): StoredDomainVerification => {
            const verification = records.get(where.id);

            if (!verification) {
              throw new Error('Record not found');
            }

            Object.assign(verification, data);
            return verification;
          },
        ),
      },
    };

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(DOMAIN_VERIFICATION_DNS_RESOLVER)
      .useValue({ resolveTxt: resolveTxtMock })
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

  it('verifies ownership when DNS contains the expected TXT value', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    txtRecords = [[created.body.dnsRecord.value]];

    const response = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);

    expect(response.body).toEqual({
      ...created.body,
      status: 'verified',
      verifiedAt: expect.any(String),
      lastCheck: {
        outcome: 'verified',
        checkedAt: expect.any(String),
      },
    });
  });

  it('returns an already verified resource without querying DNS again', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    txtRecords = [[created.body.dnsRecord.value]];

    const verified = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);
    const checkedAgain = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);

    expect(checkedAgain.body).toEqual(verified.body);
    expect(resolveTxtMock).toHaveBeenCalledTimes(1);
  });

  it('records a missing TXT record and keeps the verification pending', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    txtLookupError = Object.assign(new Error('Not found'), {
      code: 'ENOTFOUND',
    });

    const checked = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);

    expect(checked.body).toEqual({
      ...created.body,
      lastCheck: {
        outcome: 'record_not_found',
        checkedAt: expect.any(String),
      },
    });

    const restored = await request(app.getHttpServer())
      .get(`/api/domain-verifications/${created.body.id}`)
      .expect(200);

    expect(restored.body).toEqual(checked.body);
  });

  it('records a mismatch when TXT values exist without the challenge', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    txtRecords = [['unrelated=value'], ['another=value']];

    const checked = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);

    expect(checked.body).toEqual({
      ...created.body,
      lastCheck: {
        outcome: 'record_mismatch',
        checkedAt: expect.any(String),
      },
    });
  });

  it('records a recoverable outcome when the DNS lookup fails', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    txtLookupError = Object.assign(new Error('Resolver unavailable'), {
      code: 'ESERVFAIL',
    });

    const checked = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);

    expect(checked.body).toEqual({
      ...created.body,
      lastCheck: {
        outcome: 'lookup_error',
        checkedAt: expect.any(String),
      },
    });
  });

  it('matches a fragmented challenge among multiple TXT values', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    const [prefix, token] = created.body.dnsRecord.value.split('=');
    txtRecords = [['unrelated=value'], [`${prefix}=`, token]];

    const checked = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);

    expect(checked.body.status).toBe('verified');
    expect(checked.body.lastCheck.outcome).toBe('verified');
  });

  it('rate limits repeated checks before querying DNS again', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/domain-verifications')
      .send({ domain: 'example.com' })
      .expect(201);
    txtRecords = [['unrelated=value']];

    await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(`/api/domain-verifications/${created.body.id}/checks`)
      .expect(429);

    expect(response.body).toEqual({
      code: 'check_cooldown',
      message: 'Wait before checking DNS again.',
      retryAfterSeconds: expect.any(Number),
    });
    expect(resolveTxtMock).toHaveBeenCalledTimes(1);
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
