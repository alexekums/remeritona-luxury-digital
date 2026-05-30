import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ChatWidgetContextValue = {
  totalUnread: number;
  setTotalUnread: (count: number) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openChat: () => void;
};

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);

  return (
    <ChatWidgetContext.Provider value={{ totalUnread, setTotalUnread, isOpen, setIsOpen, openChat }}>
      {children}
    </ChatWidgetContext.Provider>
  );
}

export function useChatWidget() {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) throw new Error("useChatWidget must be used within ChatWidgetProvider");
  return ctx;
}
