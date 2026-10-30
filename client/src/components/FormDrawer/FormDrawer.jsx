import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const FormDrawer = ({ open, onOpenChange, title, description, children }) => (
  // handleOnly: vaul captures the pointer on any press inside a draggable drawer, which stops
  // native date pickers from opening. Dragging is limited to the handle bar instead.
  <Drawer open={open} onOpenChange={onOpenChange} handleOnly>
    <DrawerContent className="text-sm">
      <div className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="font-heading text-lg">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        {children}
      </div>
    </DrawerContent>
  </Drawer>
);
