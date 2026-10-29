import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Label + input pair used by every form; extra props go to the input.
export const Field = ({ id, label, className, ...props }) => (
  <div className={cn("grid gap-2", className)}>
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} className="h-11 text-base" {...props} />
  </div>
);
