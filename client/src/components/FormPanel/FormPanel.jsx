import { Button } from "@/components/ui/button";

// The desktop stand-in for FormDrawer: the form stays open beside the list. When an entry is
// being edited, onReset (if given) switches the panel back to a new one.
export const FormPanel = ({ title, onReset, children }) => (
  <aside
    data-glow=""
    className="sticky top-24 grid gap-4 rounded-3xl border border-primary/30 bg-card p-5"
  >
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {onReset ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Dodaj nowe
        </Button>
      ) : null}
    </div>
    {children}
  </aside>
);
