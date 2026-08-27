import { QueryClient } from '@tanstack/react-query';

import { shouldRetryDomainVerificationRequest } from './domain-verifications-api';

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
