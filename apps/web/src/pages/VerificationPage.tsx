import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageLayout } from '../components/PageLayout';
import { VerificationCard } from '../components/VerificationCard';
import {
  checkDomainVerification,
  getDomainVerification,
  isVerificationNotFoundError,
} from '../domain-verifications-api';
import { clearRecentVerification } from '../recent-verification';
import { verificationQueryKey } from '../verification-query-key';

export function VerificationPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const verification = useQuery({
    queryKey: verificationQueryKey(id ?? ''),
    queryFn: () => getDomainVerification(id ?? ''),
    enabled: id !== undefined,
    staleTime: 30_000,
  });
  const check = useMutation({
    mutationFn: () => checkDomainVerification(id ?? ''),
    onSuccess: (checked) => {
      queryClient.setQueryData(verificationQueryKey(checked.id), checked);
    },
  });

  useEffect(() => {
    if (id && isVerificationNotFoundError(verification.error)) {
      clearRecentVerification(id);
    }
  }, [id, verification.error]);

  return (
    <PageLayout
      description="Add the TXT record in DNS, then check when it’s ready."
      title="Complete your verification."
    >
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
        {verification.isPending ? (
          <p className="text-sm text-slate-300" role="status">
            Loading verification…
          </p>
        ) : null}

        {verification.isError ? (
          <div
            className="rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100"
            role="alert"
          >
            {verification.error.message}
          </div>
        ) : null}

        {verification.isSuccess ? (
          <VerificationCard
            checkError={check.error}
            isChecking={check.isPending}
            onCheck={() => check.mutate()}
            verification={verification.data}
          />
        ) : null}

        <Link
          className="mt-5 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
          to="/"
        >
          Start another verification
        </Link>
      </section>
    </PageLayout>
  );
}
