import React, { useState, useRef, useEffect } from 'react';
import { Send, ShoppingBag, Sparkles } from 'lucide-react';
import MessageBubble from './MessageBubble';
import Loader from './Loader';
import { chatWithAssistant } from '../services/api';

const AGENT_STATUSES = [
  "Analyzing user intent...",
  "Searching FAISS vector database...",
  "Retrieving product specifications...",
  "Comparing features and prices...",
  "Summarizing user reviews...",
  "Formulating recommendations..."
];

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your AI Shopping Assistant. What are you looking for today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatusIndex, setAgentStatusIndex] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setAgentStatusIndex((prev) => (prev + 1) % AGENT_STATUSES.length);
      }, 1500);
    } else {
      setAgentStatusIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Live API call to FastAPI -> LangGraph -> Gemini
      const response = await chatWithAssistant(input);
      
      const botMsg = { 
        sender: 'bot', 
        text: response.text,
        products: response.products || []
      };
      setMessages(prev => [...prev, botMsg]);
      setIsLoading(false);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I encountered an error connecting to the backend. Please ensure the FastAPI server is running.' }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-gray-50/50 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center shadow-sm z-10">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl mr-4 shadow-md">
          <ShoppingBag className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Agentic E-commerce Assistant</h1>
          <p className="text-sm text-green-500 font-medium flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Online & Ready to Help
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {isLoading && (
          <div className="flex flex-col items-start justify-start p-4 space-y-4 mb-6 animate-pulse">
            <Loader />
            <div className="flex items-center space-x-2 text-indigo-500 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 shadow-sm ml-2">
              <Sparkles size={16} className="animate-spin-slow text-indigo-600" />
              <span className="text-xs font-semibold tracking-wide uppercase">
                {AGENT_STATUSES[agentStatusIndex]}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            className="w-full pl-5 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner text-gray-700 placeholder-gray-400"
            placeholder="E.g., I need a gaming laptop under $2000..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-3">
          AI agents can make mistakes. Always verify product details.
        </p>
      </div>

    </div>
  );
};

export default Chatbot;
