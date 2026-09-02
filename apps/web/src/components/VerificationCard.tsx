import type { DomainVerification } from '@domain-proof/contracts';

import { CopyableRecordField } from './CopyableRecordField';

const CHECK_OUTCOME_COPY = {
  lookup_error: {
    description:
      "We couldn't query DNS right now. The record may be correct; wait a moment and try again.",
    title: "DNS lookup couldn't be completed",
  },
  record_mismatch: {
    description:
      'We found TXT records at this name, but none matched the expected value. Check that you copied it exactly.',
    title: "TXT record doesn't match",
  },
  record_not_found: {
    description:
      "We couldn't find the TXT record yet. DNS changes can take time to propagate. Confirm the record name and try again.",
    title: 'TXT record not found yet',
  },
} as const;

export function VerificationCard({
  checkError,
  isChecking,
  onCheck,
  verification,
}: {
  checkError: Error | null;
  isChecking: boolean;
  onCheck: () => void;
  verification: DomainVerification;
}) {
  const isVerified = verification.status === 'verified';
  const pendingOutcome =
    verification.status === 'pending'
      ? verification.lastCheck?.outcome
      : undefined;
  const outcomeCopy = pendingOutcome
    ? CHECK_OUTCOME_COPY[pendingOutcome]
    : undefined;
  const recordNameSuffix = `.${verification.domain}`;
  const relativeRecordName = verification.dnsRecord.name.endsWith(
    recordNameSuffix,
  )
    ? verification.dnsRecord.name.slice(0, -recordNameSuffix.length)
    : verification.dnsRecord.name;

  return (
    <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-emerald-100">
          {isVerified ? 'Domain ownership verified' : 'Verification started'}
        </h2>
        <span
          className={
            isVerified
              ? 'rounded-full bg-emerald-300/15 px-2 py-1 text-xs font-medium text-emerald-100'
              : 'rounded-full bg-amber-300/15 px-2 py-1 text-xs font-medium text-amber-200'
          }
          role="status"
        >
          {isVerified ? 'Verified' : 'Pending'}
        </span>
      </div>
      <p className="mt-2 break-all font-mono text-sm text-white">
        {verification.domain}
      </p>
      <h3 className="mt-6 font-semibold text-emerald-100">
        {isVerified ? 'Verified TXT record' : 'Add this TXT record'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-emerald-100/70">
        {isVerified
          ? 'We found this record in public DNS and used it to confirm that you control this domain.'
          : "Add it in your DNS provider. We’ll look for it to confirm that you control this domain. This record does not change where your website or email traffic goes. You don't need to change any other DNS records."}
      </p>
      <p className="mt-4 text-xs leading-5 text-emerald-100/60">
        DNS providers handle this field differently. Use the full hostname
        unless yours appends a DNS zone automatically. If it already appends{' '}
        {verification.domain}, use the short host/name. If it appends a
        different zone, remove that suffix from the full hostname.
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
          accessibleName="record name"
          label="Host / name"
          value={relativeRecordName}
        />
        <CopyableRecordField
          accessibleName="full record hostname"
          label="Full hostname"
          value={verification.dnsRecord.name}
        />
        <CopyableRecordField
          accessibleName="record value"
          label="Value"
          value={verification.dnsRecord.value}
        />
      </dl>

      {isVerified ? (
        <p className="mt-5 text-sm leading-6 text-emerald-100">
          Ownership verification is complete.
        </p>
      ) : (
        <>
          <div aria-label="DNS check result" role="status">
            {outcomeCopy ? (
              <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">
                <h4 className="text-sm font-semibold">{outcomeCopy.title}</h4>
                <p className="mt-1 text-sm leading-6 text-amber-100/80">
                  {outcomeCopy.description}
                </p>
              </div>
            ) : null}
          </div>
          <p className="mt-5 text-sm leading-6 text-emerald-100/70">
            DNS changes can take time to appear. Check after you’ve added the
            record; if it isn’t visible yet, you can try again.
          </p>
          <button
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isChecking}
            onClick={onCheck}
            type="button"
          >
            {isChecking
              ? 'Checking DNS…'
              : verification.lastCheck
                ? 'Check again'
                : 'Check DNS'}
          </button>
        </>
      )}

      {checkError ? (
        <p className="mt-4 text-sm leading-6 text-red-100" role="alert">
          {checkError.message}
        </p>
      ) : null}
    </div>
  );
}
