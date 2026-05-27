import React from 'react';
import Markdown from 'markdown-to-jsx';
import clsx from 'clsx';
import ProductCard from './ProductCard';
import { Bot, User } from 'lucide-react';

const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={clsx("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx("flex max-w-[85%] sm:max-w-[75%]", isUser ? "flex-row-reverse" : "flex-row")}>
        
        {/* Avatar */}
        <div className={clsx("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center", 
          isUser ? "bg-blue-600 ml-3" : "bg-gradient-to-br from-purple-600 to-blue-600 mr-3 shadow-md")}>
          {isUser ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
        </div>

        {/* Message Content */}
        <div className="flex flex-col space-y-4">
          {message.text && (
            <div className={clsx(
              "px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
              isUser 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
            )}>
              {isUser ? (
                message.text
              ) : (
                <div className="prose prose-sm prose-blue max-w-none">
                  <Markdown>{message.text}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* Render Tool Results / Products if available */}
          {message.products && message.products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {message.products.map((product, idx) => (
                <ProductCard key={idx} product={product} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MessageBubble;
