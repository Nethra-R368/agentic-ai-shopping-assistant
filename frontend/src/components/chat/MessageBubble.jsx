import React, { useState, useEffect } from 'react';
import Markdown from 'markdown-to-jsx';
import clsx from 'clsx';
import ProductCard from '../products/ProductCard';
import { Bot, User, Volume2, VolumeX, Sparkles, ArrowRightLeft, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageBubble = ({ message, onAskAI }) => {
  const isUser = message.sender === 'user';
  const fullText = message.text || '';
  
  // Speech Synthesis & Clipboard State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Live Typing Simulation State
  const [text, setText] = useState(isUser ? fullText : '');
  
  useEffect(() => {
    if (isUser || !fullText) {
      setText(fullText);
      return;
    }
    
    // If it's a bot message, simulate typing effect
    let currentIndex = 0;
    // Faster typing for longer texts, slower for short texts
    const speed = Math.max(2, Math.min(15, 300 / fullText.length)); 
    
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex += 3; // Chunk characters to simulate faster real-time generation
      } else {
        clearInterval(interval);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [fullText, isUser]);

  // Stop speaking on unmount to release audio resources cleanly
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleSpeakToggle = () => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // 1. Strip markdown tags so it sounds natural
      const cleanSpokenText = fullText
        .replace(/[#*`_~]/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/p\d/g, ''); // Remove item IDs

      // 2. Split response into sentence-based chunks to avoid browser silent pause timeout bugs!
      const sentences = cleanSpokenText.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleanSpokenText];
      
      let chunkIndex = 0;
      setIsSpeaking(true);

      const speakNextChunk = () => {
        // If we finished all sentences, reset speaking state
        if (chunkIndex >= sentences.length) {
          setIsSpeaking(false);
          return;
        }

        const chunkText = sentences[chunkIndex].trim();
        if (!chunkText) {
          chunkIndex++;
          speakNextChunk();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunkText);
        
        utterance.onend = () => {
          chunkIndex++;
          speakNextChunk();
        };

        utterance.onerror = (err) => {
          console.error("SpeechSynthesis chunk error:", err);
          setIsSpeaking(false);
        };

        // Select a premium voice standard if loaded
        const voices = window.speechSynthesis.getVoices();
        const engVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')));
        if (engVoice) {
          utterance.voice = engVoice;
        }

        window.speechSynthesis.speak(utterance);
      };

      // Cancel any ongoing speaking and start our sentence queue
      window.speechSynthesis.cancel();
      speakNextChunk();
    }
  };

  const handleCopyText = () => {
    if (navigator.clipboard && fullText) {
      navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Dynamic RAG dynamic product lists
  const products = message.products || [];
  const isComparison = fullText.toLowerCase().includes('comparison') || fullText.toLowerCase().includes('compare') || products.length >= 2;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}
    >
      <div className={clsx("flex w-full max-w-[94%] sm:max-w-[88%]", isUser ? "flex-row-reverse" : "flex-row")}>
        
        {/* Sleek Avatar */}
        <div className={clsx("flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border", 
          isUser 
            ? "bg-slate-800 border-white/5 text-indigo-400 ml-3 shadow-inner" 
            : "bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-400 border-indigo-400/25 mr-3 shadow-lg shadow-indigo-500/10")}>
          {isUser ? <User className="w-4 h-4 text-indigo-300" /> : <Bot className="w-4 h-4 text-white" />}
        </div>

        {/* Message Container */}
        <div className="flex-1 flex flex-col space-y-3.5 min-w-0">
          
          {/* Bubble Panel */}
          {text && (
            <div className={clsx(
              "px-4.5 py-4 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-xl border relative group overflow-hidden",
              isUser 
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-500/20 rounded-tr-none shadow-indigo-600/10" 
                : "bg-slate-900/60 text-slate-200 border-white/5 rounded-tl-none shadow-slate-950/40 backdrop-blur-md"
            )}>
              {/* Decorative top border */}
              {!isUser && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500/25 via-purple-500/25 to-cyan-500/25 pointer-events-none" />
              )}

              {/* Speech / Clipboard Actions Row */}
              {!isUser && (
                <div className="absolute right-3.5 top-3.5 flex items-center space-x-1.5 opacity-100 transition-all z-20 bg-slate-950/60 border border-white/5 px-1.5 py-1 rounded-xl shadow-md">
                  {/* Text-to-speech speaker button */}
                  <button
                    onClick={handleSpeakToggle}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
                    title={isSpeaking ? "Mute Spoken Feed" : "Listen Spoken Review"}
                  >
                    {isSpeaking ? <VolumeX size={12} className="text-indigo-400 animate-pulse" /> : <Volume2 size={12} />}
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={handleCopyText}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
                    title="Copy response markdown"
                  >
                    {isCopied ? <Check size={12} className="text-emerald-400 animate-pulse" /> : <Copy size={12} />}
                  </button>

                  {/* Pulsing Audio Equalizer Waveform indicator while reading */}
                  {isSpeaking && (
                    <div className="flex items-end space-x-0.5 h-3 px-1">
                      <div className="audio-bar h-1"></div>
                      <div className="audio-bar h-3"></div>
                      <div className="audio-bar h-2"></div>
                    </div>
                  )}
                </div>
              )}

              {isUser ? (
                <div className="space-y-3">
                  {/* Visually show visually selected image attachment */}
                  {message.image && (
                    <div className="w-28 h-28 rounded-lg overflow-hidden border border-white/10 mb-2 shadow-md">
                      <img src={message.image} alt="User Visual Search" className="object-cover w-full h-full" />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap font-light tracking-wide">{text}</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none 
                  prose-headings:text-white prose-headings:font-bold prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-widest prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-indigo-300
                  prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-3 prose-p:font-light
                  prose-strong:text-indigo-200 prose-strong:font-semibold
                  prose-ul:list-disc prose-ul:pl-4.5 prose-ul:mb-3 prose-li:text-slate-300 prose-li:mb-1.5 prose-li:font-light">
                  <Markdown>{text}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* Dynamic product card grid attachments */}
          {products.length > 0 && (
            <div className="space-y-3 mt-1">
              
              <div className="flex items-center space-x-2 pl-1">
                {isComparison ? (
                  <div className="flex items-center space-x-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded leading-none">
                    <ArrowRightLeft size={9} />
                    <span>Internet Discovery Comparison Grid</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded leading-none">
                    <Sparkles size={9} />
                    <span>AI Shopping Discovered Matches</span>
                  </div>
                )}
              </div>

              {/* Dynamic products side-by-side or stacked grid */}
              <div className={clsx(
                "grid gap-4 w-full",
                products.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-1 sm:grid-cols-2"
              )}>
                {products.map((product, idx) => (
                  <ProductCard 
                    key={product.id || idx} 
                    product={product} 
                    onAskAI={onAskAI} 
                  />
                ))}
              </div>

            </div>
          )}

        </div>

      </div>
    </motion.div>
  );
};

export default MessageBubble;
