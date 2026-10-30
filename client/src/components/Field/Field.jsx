import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Label + input pair used by every form; extra props go to the input.
// `error` is the message for this field; it is linked to the input for screen readers.
export const Field = ({ id, label, className, error, ...props }) => (
  <div className={cn("grid gap-2", className)}>
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      // When focus scrolls the input into view, leave room above it so its label stays visible.
      className="h-11 scroll-mt-10 text-base"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    />
    {error ? (
      <p id={`${id}-error`} className="text-sm text-destructive">
        {error}
      </p>
    ) : null}
  </div>
);
