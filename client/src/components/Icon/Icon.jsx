import { HugeiconsIcon } from "@hugeicons/react";

export const Icon = ({ icon, size = 20, ...props }) => (
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.8} aria-hidden="true" {...props} />
);
