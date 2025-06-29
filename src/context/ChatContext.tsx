"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MESSAGES: 'cyrus-chat-messages',
  IS_OPEN: 'cyrus-chat-is-open'
};

const initialMessage: Message = {
  id: '1',
  content: "Hi! I'm Cyrus's AI assistant. I can help you learn more about Cyrus, navigate the blog, or discuss technology topics. How can I assist you today?",
  isUser: false,
  timestamp: new Date()
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpenState] = useState(false);
  const [messages, setMessagesState] = useState<Message[]>([initialMessage]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从localStorage加载数据
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const savedIsOpen = localStorage.getItem(STORAGE_KEYS.IS_OPEN);

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // 转换timestamp字符串回Date对象
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessagesState(messagesWithDates);
      }

      if (savedIsOpen) {
        setIsOpenState(JSON.parse(savedIsOpen));
      }
    } catch (error) {
      console.error('Error loading chat data from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 保存isOpen状态到localStorage
  const setIsOpen = (open: boolean) => {
    setIsOpenState(open);
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.IS_OPEN, JSON.stringify(open));
      } catch (error) {
        console.error('Error saving isOpen to localStorage:', error);
      }
    }
  };

  // 保存messages到localStorage
  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    const updatedMessages = typeof newMessages === 'function' ? newMessages(messages) : newMessages;
    setMessagesState(updatedMessages);
    
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
      } catch (error) {
        console.error('Error saving messages to localStorage:', error);
      }
    }
  };

  // 添加单条消息
  const addMessage = (message: Message) => {
    setMessagesState(prevMessages => {
      const newMessages = [...prevMessages, message];

      // 保存到localStorage
      if (isLoaded) {
        try {
          localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(newMessages));
        } catch (error) {
          console.error('Error saving messages to localStorage:', error);
        }
      }

      return newMessages;
    });
  };

  // 清空消息
  const clearMessages = () => {
    setMessages([initialMessage]);
  };

  const value: ChatContextType = {
    isOpen,
    setIsOpen,
    messages,
    setMessages,
    addMessage,
    clearMessages
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
