import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { parseDomain } from './domain-name';

const DOMAIN_PARSE_ERRORS = {
  domain_required: {
    code: 'domain_required',
    field: 'domain',
    message: 'Enter a domain to continue.',
  },
  unsafe_domain_characters: {
    code: 'unsafe_domain_characters',
    field: 'domain',
    message:
      'Remove spaces, invisible characters, or control characters from the domain.',
  },
  invalid_domain: {
    code: 'invalid_domain',
    field: 'domain',
    message: 'Enter a domain like example.com, without a protocol or path.',
  },
} as const;

@Injectable()
export class DomainVerificationDomainPipe
  implements PipeTransform<unknown, string>
{
  transform(body: unknown): string {
    const domain =
      typeof body === 'object' && body !== null && 'domain' in body
        ? body.domain
        : undefined;
    const parsed = parseDomain(domain);

    if (!parsed.ok) {
      throw new BadRequestException(DOMAIN_PARSE_ERRORS[parsed.code]);
    }

    return parsed.domain;
  }
}
