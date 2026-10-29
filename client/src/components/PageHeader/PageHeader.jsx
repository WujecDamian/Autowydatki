export const PageHeader = ({ title, description }) => (
  <div className="grid gap-1">
    <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
    {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
  </div>
);
