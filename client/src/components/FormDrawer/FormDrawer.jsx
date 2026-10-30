import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const FormDrawer = ({ open, onOpenChange, title, description, className, children }) => (
  // handleOnly: vaul captures the pointer on any press inside a draggable drawer, which stops
  // native date pickers from opening. Dragging is limited to the handle bar instead.
  <Drawer open={open} onOpenChange={onOpenChange} handleOnly>
    <DrawerContent className="text-sm">
      <div
        className={cn(
          "mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
          className,
        )}
      >
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="font-heading text-lg">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        {children}
      </div>
    </DrawerContent>
  </Drawer>
);
