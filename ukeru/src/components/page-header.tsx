export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="border-b bg-card px-8 py-5">
      <h1 className="text-brand-navy text-2xl font-bold dark:text-brand-gold">
        {title}
      </h1>
      {description ? (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      ) : null}
    </header>
  );
}
