"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  farmerId: string;
  from: "me" | "farmer";
  text: string;
  productId?: string;
  createdAt: string;
}

interface ChatState {
  messagesByFarmer: Record<string, ChatMessage[]>;
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  sendMessage: (farmerId: string, text: string, productId?: string) => void;
  receiveMessage: (farmerId: string, text: string, productId?: string) => void;
  clearConversation: (farmerId: string) => void;
  getConversation: (farmerId: string) => ChatMessage[];
  getConversationIds: () => string[];
}

function createMessage(
  farmerId: string,
  from: ChatMessage["from"],
  text: string,
  productId?: string
): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    farmerId,
    from,
    text: text.trim(),
    productId,
    createdAt: new Date().toISOString(),
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messagesByFarmer: {},
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      sendMessage: (farmerId, text, productId) => {
        const clean = text.trim();
        if (!clean) return;
        const msg = createMessage(farmerId, "me", clean, productId);
        set((state) => ({
          messagesByFarmer: {
            ...state.messagesByFarmer,
            [farmerId]: [...(state.messagesByFarmer[farmerId] ?? []), msg],
          },
        }));
      },

      receiveMessage: (farmerId, text, productId) => {
        const clean = text.trim();
        if (!clean) return;
        const msg = createMessage(farmerId, "farmer", clean, productId);
        set((state) => ({
          messagesByFarmer: {
            ...state.messagesByFarmer,
            [farmerId]: [...(state.messagesByFarmer[farmerId] ?? []), msg],
          },
        }));
      },

      clearConversation: (farmerId) =>
        set((state) => {
          const next = { ...state.messagesByFarmer };
          delete next[farmerId];
          return { messagesByFarmer: next };
        }),

      getConversation: (farmerId) => get().messagesByFarmer[farmerId] ?? [],

      getConversationIds: () => Object.keys(get().messagesByFarmer),
    }),
    {
      name: "tanihub-chat",
      partialize: (state) => ({ messagesByFarmer: state.messagesByFarmer }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);
