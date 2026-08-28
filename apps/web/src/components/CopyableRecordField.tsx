import { useState } from 'react';

export function CopyableRecordField({
  accessibleName,
  label,
  value,
}: {
  accessibleName: string;
  label: 'Full hostname' | 'Host / name' | 'Value';
  value: string;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const buttonText = {
    copied: 'Copied',
    failed: 'Copy failed',
    idle: 'Copy',
  }[copyState];
  const accessibleLabel = {
    copied: `${accessibleName} copied`,
    failed: `Copy ${accessibleName} failed`,
    idle: `Copy ${accessibleName}`,
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
