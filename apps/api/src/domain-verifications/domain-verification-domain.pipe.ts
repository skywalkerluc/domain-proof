import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import {
  hasUnsafeDomainCharacters,
  normalizeDomain,
} from './domain-name';

@Injectable()
export class DomainVerificationDomainPipe
  implements PipeTransform<unknown, string>
{
  transform(body: unknown): string {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('domain' in body) ||
      typeof body.domain !== 'string' ||
      body.domain.trim() === ''
    ) {
      throw new BadRequestException({
        code: 'domain_required',
        field: 'domain',
        message: 'Enter a domain to continue.',
      });
    }

    if (hasUnsafeDomainCharacters(body.domain)) {
      throw new BadRequestException({
        code: 'unsafe_domain_characters',
        field: 'domain',
        message:
          'Remove spaces, invisible characters, or control characters from the domain.',
      });
    }

    const domain = normalizeDomain(body.domain);

    if (domain === null) {
      throw new BadRequestException({
        code: 'invalid_domain',
        field: 'domain',
        message: 'Enter a domain like example.com, without a protocol or path.',
      });
    }

    return domain;
  }
}
