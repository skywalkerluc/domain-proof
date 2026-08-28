import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function PageLayout({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
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
            {title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            {description}
          </p>
        </section>

        {children}
      </main>
    </div>
  );
}
