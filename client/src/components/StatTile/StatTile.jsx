// A small glowing figure card: label on top, big value, optional hint. `order` staggers the entrance.
export const StatTile = ({ label, value, hint, order = 0 }) => (
  <div
    data-glow=""
    style={{ "--i": order }}
    className="reveal grid content-start gap-1 rounded-2xl border bg-card px-5 py-4"
  >
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="font-heading text-xl font-semibold tracking-tight tabular-nums">{value}</div>
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);
