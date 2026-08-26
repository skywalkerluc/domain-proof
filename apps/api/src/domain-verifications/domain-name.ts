import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

import { canCreateDomainVerificationRecord } from './domain-verification-challenge';

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const URL_DELIMITER = /[/:?#@\\]/;

export function normalizeDomain(input: string): string | null {
  const withoutTrailingDot = input.trim().toLowerCase().replace(/\.$/, '');

  if (URL_DELIMITER.test(withoutTrailingDot)) {
    return null;
  }

  const domain = domainToASCII(withoutTrailingDot);

  if (
    domain === '' ||
    !canCreateDomainVerificationRecord(domain) ||
    isIP(domain) !== 0
  ) {
    return null;
  }

  const labels = domain.split('.');

  if (labels.length < 2 || labels.some((label) => !DNS_LABEL.test(label))) {
    return null;
  }

  return domain;
}
