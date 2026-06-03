import React, { useState } from 'react';
import Chatbot from './components/chat/Chatbot';
import { Sparkles, Moon, Sun, ShoppingBag, Plus, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [isChatActive, setIsChatActive] = useState(false);
  const [prefillMessage, setPrefillMessage] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [chatKey, setChatKey] = useState(0); // Helper to reset chat session

  const handleSearchTrigger = (queryText) => {
    setPrefillMessage(queryText);
    setIsChatActive(true);
  };

  const handleResetChat = () => {
    setIsChatActive(false);
    setPrefillMessage(null);
    setChatKey(prev => prev + 1);
  };

  // Example prompts to display beautifully on landing (exact requests!)
  const suggestions = [
    { text: "Best AI laptop under ₹1 lakh", icon: "💻" },
    { text: "Minimalist home decor under ₹5000", icon: "🏡" },
    { text: "Best headphones for productivity", icon: "🎧" },
    { text: "Gaming setup under ₹2 lakh", icon: "🎮" }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#030712] text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans relative overflow-hidden transition-colors duration-500`}>
      
      {/* Premium Cyber-Luxe Background Glows (Apple/Linear style ambient spots) */}
      <div className="fixed top-[-10%] left-[-15%] w-[45rem] h-[45rem] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none animate-ambient-slow"></div>
      <div className="fixed top-[20%] right-[-15%] w-[40rem] h-[40rem] bg-violet-600/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none animate-ambient-fast"></div>
      <div className="fixed bottom-[-10%] left-[20%] w-[45rem] h-[45rem] bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none animate-ambient-slow"></div>
      
      {/* Top Header - Ultra Minimal */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between z-30">
        <button 
          onClick={handleResetChat}
          className="flex items-center space-x-2.5 group cursor-pointer"
        >
          <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-2 rounded-xl border border-white/10 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-base font-black tracking-wider uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>AuraBuy</span>
              <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded">CONCIERGE</span>
            </div>
          </div>
        </button>

        <div className="flex items-center space-x-3">
          {/* New Chat Button */}
          {isChatActive && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleResetChat}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                darkMode 
                  ? 'bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Plus size={12} />
              <span>New Search</span>
            </motion.button>
          )}

          {/* Theme Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              darkMode 
                ? 'bg-slate-900/60 border-white/5 hover:border-white/10 text-gray-400 hover:text-white' 
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800'
            }`}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="w-full flex-1 max-w-4xl mx-auto px-4 sm:px-6 flex flex-col justify-center z-20 pb-12 min-h-0 relative">
        <AnimatePresence mode="wait">
          {!isChatActive ? (
            
            /* LANDING EXPERIENCE: Hero Section with Central Search Box */
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center space-y-8 w-full py-12"
            >
              {/* Premium Branding Logo */}
              <div className="space-y-4 max-w-xl">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 px-3.5 py-1 rounded-full text-[10px] font-bold tracking-widest text-indigo-300 uppercase"
                >
                  <Sparkles size={11} className="animate-pulse text-indigo-400" />
                  <span>Internet-Scale AI Search</span>
                </motion.div>
                
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white">
                  Where should we <br />
                  <span className="text-glow-gradient">shop today?</span>
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm font-light leading-relaxed max-w-md mx-auto">
                  Describe the product you want. We will parse marketplace catalogues, analyze expert spec sheets, and discover options across the internet.
                </p>
              </div>

              {/* Large Centered Search Box wrapper */}
              <div className="w-full max-w-2xl">
                <Chatbot 
                  key={`landing-chat-${chatKey}`}
                  isMiniVersion={true}
                  onFirstSearchTrigger={handleSearchTrigger}
                  darkMode={darkMode}
                />
              </div>

              {/* Quick Prompt Suggestion Bubbles */}
              <div className="w-full max-w-2xl space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 text-center">Try Discovering</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchTrigger(s.text)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-2xl border text-left text-xs tracking-wide transition-all cursor-pointer ${
                        darkMode 
                          ? 'bg-slate-900/40 hover:bg-indigo-500/10 border-white/5 hover:border-indigo-500/25 text-slate-300 hover:text-indigo-200' 
                          : 'bg-white hover:bg-indigo-50/40 border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-900'
                      }`}
                    >
                      <span className="text-base">{s.icon}</span>
                      <span className="font-light">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>

          ) : (

            /* CHAT EXPERIENCE: Slides up into modern AI concierge thread */
            <motion.div 
              key="chat-thread"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className="w-full h-[82vh] sm:h-[80vh] flex flex-col justify-between"
            >
              <div className="flex-1 h-full min-h-0 relative">
                <Chatbot 
                  key={`active-chat-${chatKey}`}
                  isMiniVersion={false}
                  askAIPrefill={prefillMessage}
                  onPrefillHandled={() => setPrefillMessage(null)}
                  darkMode={darkMode}
                />
              </div>
            </motion.div>

          )}
        </AnimatePresence>
      </main>

    </div>
  );
}

export default App;
