import { QueryClient } from '@tanstack/react-query';

import { shouldRetryDomainVerificationRequest } from './start-domain-verification';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryDomainVerificationRequest,
        retryDelay: 500,
      },
    },
  });
}
