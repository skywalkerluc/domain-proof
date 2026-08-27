import { resolveTxt } from 'node:dns/promises';

export const DOMAIN_VERIFICATION_DNS_RESOLVER = Symbol(
  'DOMAIN_VERIFICATION_DNS_RESOLVER',
);

export type DomainVerificationDnsResolver = {
  resolveTxt(hostname: string): Promise<string[][]>;
};

export class NodeDomainVerificationDnsResolver
  implements DomainVerificationDnsResolver
{
  resolveTxt(hostname: string): Promise<string[][]> {
    return resolveTxt(hostname);
  }
}
