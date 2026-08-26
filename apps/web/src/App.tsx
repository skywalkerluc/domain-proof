import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  type DomainVerification,
  getDomainVerification,
  startDomainVerification,
} from './start-domain-verification';

function verificationQueryKey(id: string) {
  return ['domain-verification', id] as const;
}

function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Link className="text-sm font-semibold tracking-wide" to="/">
            Domain Proof
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[1fr_25rem] lg:py-24">
        <section className="max-w-xl">
          <p className="mb-4 text-sm font-medium text-sky-400">
            Domain verification
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Prove you control your domain.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Enter a domain to begin. In the next step, you’ll add a dedicated
            DNS record that won’t affect your website or email.
          </p>
        </section>

        {children}
      </main>
    </div>
  );
}

function CopyableRecordField({
  label,
  value,
}: {
  label: 'Name' | 'Value';
  value: string;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const fieldName = label.toLowerCase();
  const buttonText = {
    copied: 'Copied',
    failed: 'Copy failed',
    idle: 'Copy',
  }[copyState];
  const accessibleLabel = {
    copied: `Record ${fieldName} copied`,
    failed: `Copy record ${fieldName} failed`,
    idle: `Copy record ${fieldName}`,
  }[copyState];

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <div className="rounded-lg bg-slate-950/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-emerald-100/60">
          {label}
        </dt>
        <button
          aria-label={accessibleLabel}
          className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-emerald-100 transition hover:border-white/20 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          onClick={copyValue}
          type="button"
        >
          {buttonText}
        </button>
      </div>
      <dd className="mt-1 break-all font-mono text-sm text-white">{value}</dd>
    </div>
  );
}

function VerificationCard({
  verification,
}: {
  verification: DomainVerification;
}) {
  return (
    <div
      className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-emerald-100">
          Verification started
        </h2>
        <span className="rounded-full bg-amber-300/15 px-2 py-1 text-xs font-medium text-amber-200">
          Pending
        </span>
      </div>
      <p className="mt-2 break-all font-mono text-sm text-white">
        {verification.domain}
      </p>
      <h3 className="mt-6 font-semibold text-emerald-100">
        Add this TXT record
      </h3>
      <p className="mt-2 text-sm leading-6 text-emerald-100/70">
        Add it in your DNS provider. We’ll look for it to confirm that you
        control this domain. This record does not change where your website or
        email traffic goes. You don't need to change any other DNS records.
      </p>
      <dl className="mt-4 space-y-3">
        <div className="rounded-lg bg-slate-950/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-emerald-100/60">
            Type
          </dt>
          <dd className="mt-1 font-mono text-sm text-white">
            {verification.dnsRecord.type}
          </dd>
        </div>
        <CopyableRecordField
          label="Name"
          value={verification.dnsRecord.name}
        />
        <CopyableRecordField
          label="Value"
          value={verification.dnsRecord.value}
        />
      </dl>
    </div>
  );
}

function StartVerificationPage() {
  const [domain, setDomain] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const verification = useMutation({
    mutationFn: startDomainVerification,
    onSuccess: (created) => {
      queryClient.setQueryData(verificationQueryKey(created.id), created);
      void navigate(`/verifications/${created.id}`);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verification.mutate(domain);
  }

  return (
    <PageLayout>
      <section
        aria-labelledby="start-verification-title"
        className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20"
      >
        <h2
          id="start-verification-title"
          className="text-lg font-semibold tracking-tight"
        >
          Start verification
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Use a root domain or subdomain you can manage in DNS.
        </p>

        <form className="mt-6" onSubmit={handleSubmit}>
          <label className="text-sm font-medium" htmlFor="domain">
            Domain
          </label>
          <input
            aria-describedby="domain-hint"
            autoComplete="off"
            className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            id="domain"
            name="domain"
            onChange={(event) => setDomain(event.target.value)}
            placeholder="example.com"
            required
            spellCheck={false}
            type="text"
            value={domain}
          />
          <p className="mt-2 text-xs leading-5 text-slate-500" id="domain-hint">
            Don’t include https://, a port, or a path.
          </p>

          <button
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={verification.isPending}
            type="submit"
          >
            {verification.isPending
              ? 'Starting verification…'
              : 'Start verification'}
          </button>
        </form>

        {verification.isError ? (
          <div
            className="mt-5 rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100"
            role="alert"
          >
            {verification.error.message}
          </div>
        ) : null}
      </section>
    </PageLayout>
  );
}

function VerificationPage() {
  const { id } = useParams<{ id: string }>();
  const verification = useQuery({
    queryKey: verificationQueryKey(id ?? ''),
    queryFn: () => getDomainVerification(id ?? ''),
    enabled: id !== undefined,
    staleTime: 30_000,
  });

  return (
    <PageLayout>
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
          <VerificationCard verification={verification.data} />
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

export function App() {
  return (
    <Routes>
      <Route element={<StartVerificationPage />} path="/" />
      <Route element={<VerificationPage />} path="/verifications/:id" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
