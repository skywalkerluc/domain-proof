import { Injectable } from '@nestjs/common';
import { resolveTxt } from 'node:dns/promises';

export const DOMAIN_VERIFICATION_DNS_OPTIONS = Symbol(
  'DOMAIN_VERIFICATION_DNS_OPTIONS',
);
export const DOMAIN_VERIFICATION_DNS_RESOLVER = Symbol(
  'DOMAIN_VERIFICATION_DNS_RESOLVER',
);

export type DomainVerificationDnsOptions = {
  timeoutMs: number;
};

export type DomainVerificationDnsResolver = {
  resolveTxt(hostname: string): Promise<string[][]>;
};

@Injectable()
export class NodeDomainVerificationDnsResolver
  implements DomainVerificationDnsResolver
{
  resolveTxt(hostname: string): Promise<string[][]> {
    return resolveTxt(hostname);
  }
}
