export function PageShell({
  title,
  eyebrow,
  children,
  actions
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? <p className="mb-1 text-sm font-medium text-moss">{eyebrow}</p> : null}
          <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-3xl">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
