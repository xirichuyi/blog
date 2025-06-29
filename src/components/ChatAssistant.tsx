"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 自定义滚动条样式
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.7);
  }

  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(107, 114, 128, 0.5);
  }

  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.7);
  }

  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }

  .dark .custom-scrollbar {
    scrollbar-color: rgba(107, 114, 128, 0.5) transparent;
  }
`;

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatAssistantProps {
  className?: string;
}

export default function ChatAssistant({ className = '' }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm Cyrus's AI assistant. I can help you learn more about Cyrus, navigate the blog, or discuss technology topics. How can I assist you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 预设快捷问题
  const quickQuestions = [
    "Tell me about Cyrus",
    "What are his technical skills?",
    "Show me recent blog posts",
    "How can I contact him?"
  ];

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 发送消息
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory: messages.slice(-5) // 发送最近5条消息作为上下文
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I'm sorry, I couldn't process your request right now. Please try again.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  // 处理快捷问题点击
  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <>
      {/* 自定义滚动条样式 */}
      <style jsx>{scrollbarStyles}</style>

      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {/* 聊天窗口 */}
        <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-80 sm:w-96 h-96 bg-apple-gray-50 dark:bg-apple-gray-800 rounded-2xl shadow-2xl border border-apple-gray-200 dark:border-apple-gray-700 flex flex-col overflow-hidden"
          >
            {/* 头部 */}
            <div className="bg-apple-gray-100 dark:bg-apple-gray-700 p-4 border-b border-apple-gray-200 dark:border-apple-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-apple-gray-900 dark:text-apple-gray-100">Cyrus&apos;s AI Assistant</h3>
                    <p className="text-xs text-apple-gray-600 dark:text-apple-gray-400">Online</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-apple-gray-500 hover:text-apple-gray-700 dark:text-apple-gray-400 dark:hover:text-apple-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      message.isUser
                        ? 'bg-primary text-white'
                        : 'bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-800 dark:text-apple-gray-100 border border-apple-gray-200 dark:border-apple-gray-600'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {/* 加载指示器 */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-apple-gray-100 dark:bg-apple-gray-700 p-3 rounded-2xl border border-apple-gray-200 dark:border-apple-gray-600">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-apple-gray-500 dark:bg-apple-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-apple-gray-500 dark:bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-apple-gray-500 dark:bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 快捷问题 */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs px-3 py-1 bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-700 dark:text-apple-gray-200 rounded-full hover:bg-apple-gray-200 dark:hover:bg-apple-gray-600 transition-colors border border-apple-gray-200 dark:border-apple-gray-600"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 输入区域 */}
            <div className="p-4 border-t border-apple-gray-200 dark:border-apple-gray-600 bg-apple-gray-100 dark:bg-apple-gray-700">
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-sm border border-apple-gray-300 dark:border-apple-gray-500 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-apple-gray-50 dark:bg-apple-gray-600 text-apple-gray-900 dark:text-white placeholder-apple-gray-500 dark:placeholder-apple-gray-300 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 聊天按钮 */}
      <motion.div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 bg-primary text-white rounded-full shadow-2xl hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all duration-300 flex items-center justify-center relative overflow-hidden"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* 脉冲动画背景 */}
          <motion.div
            className="absolute inset-0 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 0.3, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* 图标容器 */}
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.svg
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="chat"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </div>
        </motion.button>

        {/* 提示标签 */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: 2 }}
            className="absolute right-20 top-1/2 transform -translate-y-1/2 bg-apple-gray-900 dark:bg-apple-gray-100 text-white dark:text-apple-gray-900 px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
          >
            Chat with Cyrus&apos;s AI
            <div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 w-0 h-0 border-l-4 border-l-apple-gray-900 dark:border-l-apple-gray-100 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
          </motion.div>
        )}
      </motion.div>
    </div>
    </>
  );
}
