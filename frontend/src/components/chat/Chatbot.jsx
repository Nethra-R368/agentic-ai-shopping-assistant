import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, X, RefreshCw, Globe, Search, ArrowRight, ArrowDown, Image as ImageIcon } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { chatWithAssistant } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_SEARCH_PHASES = [
  "Opening connections to internet shopping networks...",
  "Querying retail databases and catalogs...",
  "Comparing model descriptions & specifications...",
  "Running multi-agent price analysis crawlers...",
  "Summarizing real-time consumer review sentiments...",
  "Formulating optimal recommendation cards..."
];

const Chatbot = ({ isMiniVersion = false, onFirstSearchTrigger, askAIPrefill, onPrefillHandled, darkMode }) => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your AI Shopping Concierge. Describe the item, category, or aesthetic you need (e.g. "a warm wool cardigan under $150" or upload a photo of a dress and ask for matching shoes) and I will crawl the web to find recommendations.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchPhaseIndex, setSearchPhaseIndex] = useState(0);
  
  // Continuous Voice Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const recordingRef = useRef(false); // Persistent Ref to track continuous restart

  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());

  // StrictMode Batched Prefill Message Locks
  const prefillHandledRef = useRef(false);

  // Drag and Drop & Image Upload State
  const [attachedImage, setAttachedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearConversation = () => {
    setSessionId(crypto.randomUUID());
    setMessages([{ sender: 'bot', text: 'Conversation cleared. How can I help you discover products today?' }]);
    setInput('');
    setAttachedImage(null);
  };

  useEffect(() => {
    if (!isMiniVersion) {
      scrollToBottom();
    }
  }, [messages, isLoading, isMiniVersion]);

  // Synchronize searching telemetry phase
  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setSearchPhaseIndex((prev) => (prev + 1) % MOCK_SEARCH_PHASES.length);
      }, 1200);
    } else {
      setSearchPhaseIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Lock and trigger prefill messages only once per mount/session (prevents StrictMode double renders)
  useEffect(() => {
    if (askAIPrefill && !isMiniVersion && !prefillHandledRef.current) {
      prefillHandledRef.current = true;
      setInput('');
      triggerAutomatedMessage(askAIPrefill);
      if (onPrefillHandled) {
        onPrefillHandled();
      }
    }
  }, [askAIPrefill, isMiniVersion]);

  // Reset prefill handled lock when prefill is cleared
  useEffect(() => {
    if (!askAIPrefill) {
      prefillHandledRef.current = false;
    }
  }, [askAIPrefill]);

  // Initialize Speech Recognition in Continuous Mode
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        recordingRef.current = true;
      };

      rec.onresult = (e) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Stream transcripts in real-time smoothly
        const liveOutput = finalTranscript || interimTranscript;
        if (liveOutput) {
          setInput(liveOutput);
        }
      };

      rec.onerror = (err) => {
        console.error('Continuous speech recognition error:', err);
        // Do not auto-restart if we hit blocked permission or similar fatal error
        if (err.error === 'not-allowed') {
          recordingRef.current = false;
          setIsRecording(false);
        }
      };

      rec.onend = () => {
        // If recordingRef.current is still true, the speech timing-out was automatic (silence timeout) -> auto-restart!
        if (recordingRef.current) {
          try {
            rec.start();
          } catch (e) {
            console.warn("Failed to auto-restart continuous listening:", e);
          }
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current = rec;
    }

    // Clean up SpeechRecognition resources cleanly on unmount (prevents double listeners)
    return () => {
      if (recognitionRef.current) {
        recordingRef.current = false;
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Continuous speech listening is not supported in this browser. Please try Google Chrome or Safari.");
      return;
    }

    if (isRecording) {
      recordingRef.current = false; // Disable continuous restart loop
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInput('');
      recordingRef.current = true; // Activate continuous restart loop
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start SpeechRecognition:", err);
      }
      setIsRecording(true);
    }
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload or drop a valid image file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processImageFile(file);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processImageFile(file);
  };

  const removeImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerAutomatedMessage = async (textToSend) => {
    // Prevent duplicated submissions while executing RAG searches
    if (isLoading) return;

    const userMsg = { 
      sender: 'user', 
      text: textToSend,
      image: attachedImage 
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    const imageToSend = attachedImage;
    setAttachedImage(null);

    // Turn off active continuous microphone during queries
    if (isRecording && recognitionRef.current) {
      recordingRef.current = false;
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      const response = await chatWithAssistant(textToSend, imageToSend, sessionId);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: response.text,
        products: response.products || []
      }]);
    } catch (error) {
      console.warn('API connection failed.', error);
      
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `### ⚠️ Connection Interrupted\n\nI encountered a network timeout while querying the shopping channels. Please try your search again.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() && !attachedImage) return;

    const query = input;
    setInput('');
    
    if (isMiniVersion) {
      onFirstSearchTrigger(query);
    } else {
      triggerAutomatedMessage(query);
    }
  };

  return (
    <div 
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full relative ${isMiniVersion ? '' : 'h-full flex flex-col justify-between'}`}
    >
      
      {/* File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Drag Over Overlay Screen */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md border-2 border-dashed border-indigo-500/40 rounded-3xl p-6"
          >
            <ArrowDown className="text-indigo-400 w-8 h-8 animate-bounce mb-3" />
            <p className="text-white text-sm font-bold uppercase tracking-wider">Drop Image Here</p>
            <p className="text-gray-400 text-xs mt-1 font-light">to search visually for products</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Version - Landing Search bar only */}
      {isMiniVersion ? (
        <form onSubmit={handleSubmit} className="w-full relative glass-panel rounded-3xl p-2.5 shadow-2xl border border-white/5 flex flex-col space-y-2">
          
          <div className="flex items-center space-x-3 w-full pr-1.5 pl-2.5">
            <Search className="text-indigo-400 w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Ask anything... e.g. 'Best productive noise cancelling headphones'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs text-white placeholder-gray-400 focus:outline-none py-2.5 font-light"
            />

            {/* Input Actions Row */}
            <div className="flex items-center space-x-2.5">
              {/* Image Upload */}
              <button
                type="button"
                onClick={handleImageUploadClick}
                className="p-2 rounded-xl bg-slate-900/60 border border-white/5 text-gray-400 hover:text-white hover:border-white/10 transition-all cursor-pointer flex items-center justify-center"
                title="Visual Search (Drag or Select Image)"
              >
                <ImageIcon size={14} />
              </button>

              {/* Voice Input */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  isRecording 
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-450 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.25)]' 
                    : 'bg-slate-900/60 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                }`}
                title="Voice Input (Continuous)"
              >
                <Mic size={14} />
              </button>

              {/* Submit */}
              <button
                type="submit"
                disabled={!input.trim() && !attachedImage}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Attached Image Preview Row */}
          {attachedImage && (
            <div className="flex items-center pl-3 pb-1 pt-1.5 border-t border-white/5">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                <img src={attachedImage} alt="Visual Attachment" className="object-cover w-full h-full" />
                <button 
                  type="button" 
                  onClick={removeImage}
                  className="absolute top-0 right-0 bg-black/60 p-0.5 text-white rounded-bl"
                >
                  <X size={8} />
                </button>
              </div>
              <span className="text-[10px] text-gray-450 ml-2.5 font-light">Image attached. Press enter or click search.</span>
            </div>
          )}

          {/* Continuous Voice waveforms animation */}
          {isRecording && (
            <div className="flex items-center pl-3 pb-1 pt-1.5 border-t border-white/5 space-x-2 text-[10px] text-rose-450 font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Continuous Listening... Spoke transcript streams live</span>
              <div className="flex items-end space-x-0.5 h-4 ml-3">
                <div className="audio-bar h-2"></div>
                <div className="audio-bar h-4"></div>
                <div className="audio-bar h-1"></div>
                <div className="audio-bar h-3"></div>
              </div>
            </div>
          )}

        </form>
      ) : (
        
        /* Full Version - Chat Timeline */
        <div className="flex flex-col h-full w-full bg-slate-900/35 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
          
          {/* Header */}
          <div className="bg-slate-900/60 backdrop-blur-lg px-5 py-3.5 border-b border-white/5 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3.5">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-md border border-white/10 flex items-center justify-center">
                <Globe size={14} className="text-white" />
              </div>
              <div>
                <h2 className="text-xs font-black text-white uppercase tracking-wider leading-none">AuraBuy AI Concierge</h2>
                <p className="text-[9px] text-indigo-400 font-bold flex items-center mt-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1.5 animate-pulse"></span>
                  Active Chat Session
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={handleClearConversation}
                title="New Search / Clear Conversation"
                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              >
                <RefreshCw size={12} />
              </button>
              <div className="flex items-center space-x-1 text-[9px] text-gray-400 bg-white/5 border border-white/5 rounded px-2 py-0.5 font-light">
                <Globe size={9} className="text-indigo-400 animate-spin-slow" />
                <span>Web Search Enabled</span>
              </div>
            </div>
          </div>

          {/* Messages timelines */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 scroll-smooth custom-scrollbar space-y-4">
            {messages.map((msg, idx) => (
              <MessageBubble 
                key={idx} 
                message={msg} 
                onAskAI={(q) => triggerAutomatedMessage(q)} 
              />
            ))}
            
            {/* Real-time Internet Search animation (Warm, organic minimal loader) */}
            {isLoading && (
              <div className="flex flex-col items-start justify-start p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-3 mb-6 animate-pulse max-w-[85%] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-transparent pointer-events-none" />
                
                <div className="flex items-center space-x-2.5">
                  <RefreshCw size={11} className="animate-spin text-indigo-400" />
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">AI Scanning Web Channels</span>
                </div>
                
                <div className="flex items-center space-x-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 shadow-sm text-[10px]">
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  <span className="font-bold text-gray-200 tracking-wide uppercase text-[8px]">
                    {MOCK_SEARCH_PHASES[searchPhaseIndex]}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 pl-3">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form area dragging zones */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-md border-t border-white/5">
            <form onSubmit={handleSubmit} className="relative flex flex-col space-y-2 bg-slate-950/80 border border-white/5 rounded-2xl p-2.5">
              
              {/* Image attachment slot */}
              {attachedImage && (
                <div className="flex items-center pl-2 pt-1 pb-1">
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/10">
                    <img src={attachedImage} alt="Visual Attachment Preview" className="object-cover w-full h-full" />
                    <button 
                      type="button" 
                      onClick={removeImage}
                      className="absolute top-0 right-0 bg-black/60 p-0.5 text-white rounded-bl"
                    >
                      <X size={8} />
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-500 ml-2 font-light">Visual prompt ready. Ask or send immediately.</span>
                </div>
              )}

              {/* Recording transcribing text feedback */}
              {isRecording && (
                <div className="flex items-center pl-2 pt-1 pb-1 text-[9px] text-rose-450 font-bold uppercase tracking-wider space-x-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                  <span>Continuous Listening... Describe products aloud</span>
                  <div className="flex items-end space-x-0.5 h-3 ml-2.5">
                    <div className="audio-bar h-1"></div>
                    <div className="audio-bar h-3"></div>
                    <div className="audio-bar h-2"></div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2.5 pr-1.5 pl-2">
                <input
                  type="text"
                  placeholder="Ask about dynamic setups or describe target items..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none text-xs text-slate-100 placeholder-gray-500 focus:outline-none py-2.5 font-light"
                />

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Image Select */}
                  <button
                    type="button"
                    onClick={handleImageUploadClick}
                    className="p-2 rounded-xl bg-slate-900/60 border border-white/5 text-gray-400 hover:text-white hover:border-white/10 transition-all cursor-pointer flex items-center justify-center"
                    title="Upload Image (Drag and Drop supported)"
                  >
                    <ImageIcon size={13} />
                  </button>

                  {/* Microphone */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                      isRecording 
                        ? 'bg-rose-500/20 border-rose-500/30 text-rose-450 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.25)]' 
                        : 'bg-slate-900/60 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                    }`}
                    title="Voice Input (Continuous)"
                  >
                    <Mic size={13} />
                  </button>

                  {/* Send */}
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !attachedImage)}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </form>
            <div className="flex items-center justify-between text-[8px] text-gray-500 mt-2 px-1 font-light tracking-wide uppercase font-bold">
              <span>Dynamic web scans • Drag images anywhere to search</span>
              <span>Enter to Search</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default Chatbot;
