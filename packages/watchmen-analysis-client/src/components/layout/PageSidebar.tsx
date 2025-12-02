import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  disabled?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface PageSidebarProps {
  sections: MenuSection[];
  className?: string;
}

const PageSidebar: React.FC<PageSidebarProps> = ({ sections, className }) => {
  return (
    <div className={cn(
      "w-64 h-full bg-background border-r border-border/50 flex flex-col",
      className
    )}>
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && <Separator className="mb-4" />}
              <div className="mb-3">
                <h3 className="text-sm font-medium text-muted-foreground px-2">
                  {section.title}
                </h3>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={item.variant || 'ghost'}
                      className={cn(
                        "w-full justify-start gap-2 h-9 px-2",
                        item.variant === 'destructive' && "text-destructive hover:text-destructive"
                      )}
                      onClick={item.onClick}
                      disabled={item.disabled}
                    >
                      <IconComponent size={16} />
                      <span className="text-sm">{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PageSidebar;
export type { MenuItem, MenuSection, PageSidebarProps };