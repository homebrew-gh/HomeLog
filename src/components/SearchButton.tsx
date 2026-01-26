import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useIsMobile';

interface SearchButtonProps {
  onClick: () => void;
}

export function SearchButton({ onClick }: SearchButtonProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: Just show icon button
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className="rounded-full"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </Button>
    );
  }

  // Desktop: Show expandable search bar that looks like a button
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
      aria-label="Search"
    >
      <Search className="h-4 w-4 xl:mr-2" />
      <span className="hidden xl:inline-flex text-muted-foreground">
        Search...
      </span>
      <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden xl:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
