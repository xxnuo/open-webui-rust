import { useAppStore } from '@/store';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import AppSidebar from './AppSidebar';

export default function MobileSidebar() {
  const { showSidebar, setShowSidebar, mobile } = useAppStore();

  if (!mobile) return null;

  return (
    <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
      <SheetContent side="left" className="w-64 p-0">
        <AppSidebar />
      </SheetContent>
    </Sheet>
  );
}

