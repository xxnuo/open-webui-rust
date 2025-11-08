import { useState } from 'react';
import Chat from '@/components/chat/Chat';
import AppSidebar from '@/components/layout/AppSidebar';
import TopNav from '@/components/layout/TopNav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function ChatPage() {
  const [selectedModel, setSelectedModel] = useState('');

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-full w-full flex-col">
          <TopNav 
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            showModelSelector={true}
          />
          <main className="flex-1 overflow-hidden">
            <Chat 
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
