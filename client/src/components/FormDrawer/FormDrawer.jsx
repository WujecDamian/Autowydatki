import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const FormDrawer = ({ open, onOpenChange, title, description, children }) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="text-sm">
      <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="font-heading text-lg">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        {children}
      </div>
    </DrawerContent>
  </Drawer>
);
