import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

import { canCreateDomainVerificationRecord } from './domain-verification-challenge';

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const URL_DELIMITER = /[/:?#@\\]/;
const UNSAFE_DOMAIN_CHARACTER = /(?![\u200c\u200d])[\p{Cc}\p{Cf}\p{Z}]/u;

export type DomainParseFailureCode =
  | 'domain_required'
  | 'unsafe_domain_characters'
  | 'invalid_domain';

export type DomainParseResult =
  | { ok: true; domain: string }
  | { ok: false; code: DomainParseFailureCode };

function hasUnsafeDomainCharacters(input: string): boolean {
  return UNSAFE_DOMAIN_CHARACTER.test(input.trim());
}

export function parseDomain(input: unknown): DomainParseResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, code: 'domain_required' };
  }

  if (hasUnsafeDomainCharacters(input)) {
    return { ok: false, code: 'unsafe_domain_characters' };
  }

  const withoutTrailingDot = input.trim().toLowerCase().replace(/\.$/, '');

  if (URL_DELIMITER.test(withoutTrailingDot)) {
    return { ok: false, code: 'invalid_domain' };
  }

  const domain = domainToASCII(withoutTrailingDot);

  if (
    domain === '' ||
    !canCreateDomainVerificationRecord(domain) ||
    isIP(domain) !== 0
  ) {
    return { ok: false, code: 'invalid_domain' };
  }

  const labels = domain.split('.');

  if (labels.length < 2 || labels.some((label) => !DNS_LABEL.test(label))) {
    return { ok: false, code: 'invalid_domain' };
  }

  return { ok: true, domain };
}

export function normalizeDomain(input: string): string | null {
  const parsed = parseDomain(input);

  return parsed.ok ? parsed.domain : null;
}
