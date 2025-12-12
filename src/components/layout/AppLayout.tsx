import React from "react";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/layout/TopNav";
import { NotificationListener } from "@/components/notifications/NotificationListener";
type AppLayoutProps = {
  children: React.ReactNode;
  container?: boolean;
  className?: string;
  contentClassName?: string;
};
export function AppLayout({ children, container = false, className, contentClassName }: AppLayoutProps): JSX.Element {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <NotificationListener />
      <TopNav />
      <main className="flex-1 pb-24 md:pb-28">
        {container ? (
          <div className={"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12" + (contentClassName ? ` ${contentClassName}` : "")}>
            {children}
          </div>
        ) : (
          children
        )}
      </main>
      <BottomNav />
    </div>
  );
}