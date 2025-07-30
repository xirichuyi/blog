/**
 * 聊天功能相关 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { chatApi } from '@/services/api';
import { storage, errorUtils } from '@/utils/common';
import { STORAGE_KEYS, CHAT_CONFIG } from '@/constants';
import type { Message } from '@/types/blog';

export const useChatState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // 从本地存储加载聊天历史
    const savedMessages = storage.get<Message[]>(STORAGE_KEYS.CHAT_HISTORY);
    if (savedMessages && savedMessages.length > 0) {
      return savedMessages;
    }
    
    // 默认欢迎消息
    return [{
      id: '1',
      content: CHAT_CONFIG.WELCOME_MESSAGE,
      isUser: false,
      timestamp: new Date(),
    }];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 保存消息到本地存储
  useEffect(() => {
    storage.set(STORAGE_KEYS.CHAT_HISTORY, messages);
  }, [messages]);

  // 滚动到最新消息
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setIsLoading(true);

    try {
      // 获取最近的对话历史
      const recentMessages = messages.slice(-CHAT_CONFIG.MAX_HISTORY_LENGTH);
      
      // 发送到 API
      const response = await chatApi.sendMessage(content.trim(), recentMessages);

      // 添加 AI 回复
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response || "I'm sorry, I couldn't process your request right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      // 模拟打字延迟
      setTimeout(() => {
        addMessage(aiMessage);
      }, CHAT_CONFIG.TYPING_DELAY);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      
      setTimeout(() => {
        addMessage(errorMessage);
      }, CHAT_CONFIG.TYPING_DELAY);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, addMessage]);

  const clearHistory = useCallback(() => {
    const welcomeMessage: Message = {
      id: '1',
      content: CHAT_CONFIG.WELCOME_MESSAGE,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    setIsOpen,
    toggleChat,
    messages,
    isLoading,
    messagesEndRef,
    addMessage,
    sendMessage,
    clearHistory,
    scrollToBottom,
  };
};

/**
 * 快捷问题 Hook
 */
export const useQuickQuestions = () => {
  const [questions] = useState(CHAT_CONFIG.QUICK_QUESTIONS);

  const getRandomQuestions = useCallback((count: number = 3) => {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [questions]);

  return {
    questions,
    getRandomQuestions,
  };
};

/**
 * 聊天输入 Hook
 */
export const useChatInput = (onSend: (message: string) => void) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSend(inputValue);
      setInputValue('');
    }
  }, [inputValue, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return {
    inputValue,
    setInputValue,
    inputRef,
    handleSubmit,
    handleKeyDown,
    focusInput,
  };
};
