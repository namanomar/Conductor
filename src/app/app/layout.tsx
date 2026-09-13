import { TopBar } from "@/components/console/TopBar";
import { ChatLauncher } from "@/components/chat/ChatLauncher";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-background bg-grid">
      <TopBar />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      <ChatLauncher />
    </div>
  );
}
