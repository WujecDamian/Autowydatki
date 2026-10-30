import { Button } from "@/components/ui/button";

// The desktop stand-in for FormDrawer: the form stays open beside the list. When an entry is
// being edited, onReset (if given) switches the panel back to a new one.
// It fades up after the stat tiles and the first list rows.
// The panel never grows taller than the screen: the header stays put and only the form scrolls.
// The scroll area uses the drawer's px-4 / pb-6 padding, which the sticky total bar of ServiceForm relies on.
export const FormPanel = ({ title, onReset, children }) => (
  <aside
    data-glow=""
    style={{ "--i": 5 }}
    className="reveal sticky top-24 grid max-h-[calc(100svh-7rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-3xl border border-primary/30 bg-card"
  >
    <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-3">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {onReset ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Dodaj nowe
        </Button>
      ) : null}
    </div>
    <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-6">{children}</div>
  </aside>
);
