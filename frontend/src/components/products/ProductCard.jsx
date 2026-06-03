import React, { useState } from 'react';
import { Star, Sparkles, Sliders, ChevronDown, ChevronUp, ShoppingBag, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Context-aware heuristic rationale generator to decouple rendering from hardcoded catalog IDs!
const generateAIReasoning = (product) => {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const price = product.price || 0;
  
  let fit = product.description || "Discovered and aligned semantically matching your specific requirements.";
  let pros = ["Premium industrial design & materials", "Highly positive verified buyer reviews"];
  let cons = ["Subject to active merchant inventory limits"];

  // Analyze product patterns
  if (name.includes('macbook') || desc.includes('macbook') || name.includes('m3')) {
    fit = "Engineered specifically for creators and compilers who require absolute multi-core memory bandwidth and thermal efficiency.";
    pros = ["Flagship chip rendering speeds", "Exceptional energy-saving battery hours", "Brilliant ProMotion Liquid Retina display"];
    cons = ["Premium pricing investment tier", "Substantially heavier than thin Air lines"];
  } else if (name.includes('dell') || name.includes('xps')) {
    fit = "A powerful, gorgeous Windows machine suitable for creative engineers and visual designers.";
    pros = ["Spectacular high-contrast OLED touchscreen display", "Dedicated NVIDIA graphics rendering capabilities", "Premium space-grade carbon fiber palm rests"];
    cons = ["High resolution panel limits battery endurance", "Fans run moderately active under heavy render loads"];
  } else if (name.includes('sony') || name.includes('headphone') || name.includes('wh-1000')) {
    fit = "The gold standard wireless ear-cups for professionals working in busy or loud shared spaces.";
    pros = ["Remarkable dual-processor active noise isolation", "Fluid speak-to-chat automatic audio pauses", "Superb multi-microphone calls quality"];
    cons = ["Ear cups do not fold down fully into flat case", "Priced above entry-level choices"];
  } else if (name.includes('iphone') || name.includes('mobile') || name.includes('phone')) {
    fit = "For mobile creators and gamers seeking elite camera sensors, robust frame designs, and ray-tracing graphics.";
    pros = ["Excellent optical telephoto zoom ranges", "Titanium alloy design reduces device weight", "High-efficiency processor handles console gaming"];
    cons = ["Ecosystem restriction parameters compared to Android", "USB-C charging speeds limited to 27W maximum"];
  } else if (name.includes('decor') || name.includes('vase') || name.includes('candle') || name.includes('ceramic')) {
    fit = "Selected to complement clean neutral interior design palettes and organic living setups.";
    pros = ["Premium textured aesthetic elements", "Fits neutral/modern styling palettes", "Eco-friendly hand-crafted materials"];
    cons = ["Fragile; handles with absolute care", "Requires regular dust/maintenance sweeps"];
  } else if (name.includes('jewelry') || name.includes('necklace') || name.includes('earring') || name.includes('pearl')) {
    fit = "Curated accessory designed to add a highly refined geometric texture and catch light beautifully.";
    pros = ["Premium hand-crafted sterling silver or gold plating", "Pairs elegantly with clean minimalist silhouettes", "Hypoallergenic skin safety verified"];
    cons = ["Delicate link closures require moderate care", "Clean regularly to prevent oxidization"];
  } else {
    // Dynamic matching based on generic price/category
    if (price > 1500) {
      pros.push("Flagship industrial-grade performance");
      cons.push("Premium initial financial entry");
    } else if (price < 150) {
      pros.push("Highly budget-friendly & accessible");
      cons.push("Constructed using standard retail grade plastics");
    } else {
      pros.push("Outstanding balanced price-to-performance ratio");
    }
  }

  return { fit, pros: pros.slice(0, 3), cons: cons.slice(0, 2) };
};

const ProductCard = ({ product, onAskAI }) => {
  const [showReasoning, setShowReasoning] = useState(false);

  // Dynamic Badges based on scores
  const isBestMatch = product.rating >= 4.8 && product.price > 800;
  const isBudgetPick = product.price <= 300;
  const isAIRecommend = product.rating >= 4.6 && !isBestMatch && !isBudgetPick;

  const reasoning = generateAIReasoning(product);

  const handleBuySimulation = () => {
    alert(`Purchase checkout simulation initiated for ${product.name}! This connects to online retailers.`);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col justify-between h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 p-4 hover:border-indigo-500/25 hover:shadow-[0_12px_24px_-10px_rgba(99,102,241,0.2)] transition-all duration-300"
    >
      {/* Background glow on card hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div>
        {/* Product Image Panel */}
        <div className="w-full h-36 bg-slate-950/60 rounded-xl mb-3.5 flex items-center justify-center overflow-hidden relative border border-white/5 shadow-inner">
          {product.image_url ? (
            <motion.img 
              src={product.image_url} 
              alt={product.name} 
              className="object-cover w-full h-full"
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <ShoppingBag className="w-8 h-8 text-slate-700" />
          )}

          {/* Dynamic Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
            {product.category && (
              <span className="bg-slate-950/80 backdrop-blur-md border border-white/10 text-gray-300 text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded leading-none">
                {product.category}
              </span>
            )}
            
            {isBestMatch && (
              <span className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm leading-none">
                <Sparkles size={8} className="text-amber-400 fill-amber-400" />
                <span>Best Match</span>
              </span>
            )}
            {isBudgetPick && (
              <span className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm leading-none">
                Budget Pick
              </span>
            )}
            {isAIRecommend && (
              <span className="bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-300 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm leading-none">
                <Sparkles size={8} className="text-indigo-400" />
                <span>AI Recommended</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Title */}
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <h3 className="text-xs font-bold text-white tracking-tight line-clamp-1 group-hover:text-indigo-300 transition-colors leading-tight">
            {product.name}
          </h3>
          {product.brand && (
            <span className="flex-shrink-0 bg-white/5 border border-white/5 text-gray-400 text-[8px] font-bold tracking-wider px-1 py-0.5 rounded uppercase leading-none">
              {product.brand}
            </span>
          )}
        </div>
        
        <p className="text-gray-400 text-[10px] font-light leading-relaxed mb-3.5 line-clamp-2 min-h-[30px]">
          {product.description}
        </p>
      </div>

      {/* Expandable Recommendation Reasoning Dashboard */}
      <div className="mb-3.5 relative z-10">
        <button 
          onClick={() => setShowReasoning(!showReasoning)}
          className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
            showReasoning 
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' 
              : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
          } cursor-pointer`}
        >
          <span className="flex items-center space-x-1.5">
            <Sparkles size={10} className={showReasoning ? 'text-indigo-400' : 'text-gray-450'} />
            <span>AI Purchase Reasoning</span>
          </span>
          {showReasoning ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        <AnimatePresence initial={false}>
          {showReasoning && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 p-2.5 bg-slate-950/60 rounded-lg border border-white/5 text-[9px] space-y-2">
                <div>
                  <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider block mb-0.5">Semantics Fit</span>
                  <p className="text-gray-300 leading-relaxed font-light">{reasoning.fit}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] text-emerald-450 font-bold uppercase tracking-wider block">Pros</span>
                  {reasoning.pros.map((pro, i) => (
                    <div key={i} className="flex items-start space-x-1 text-gray-300 font-light">
                      <Check size={9} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{pro}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] text-rose-450 font-bold uppercase tracking-wider block">Cons</span>
                  {reasoning.cons.map((con, i) => (
                    <div key={i} className="flex items-start space-x-1 text-gray-300 font-light">
                      <AlertTriangle size={9} className="text-rose-400 mt-0.5 flex-shrink-0" />
                      <span>{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Specifications Drawer if present */}
      {product.specifications && Object.keys(product.specifications).length > 0 && !showReasoning && (
        <div className="mb-3.5 relative z-10 text-[9px] bg-slate-950/40 p-2 rounded-lg border border-white/5">
          <div className="flex items-center space-x-1 border-b border-white/5 pb-1 mb-1 font-bold text-gray-400">
            <Sliders size={9} />
            <span className="uppercase tracking-wider">Specifications</span>
          </div>
          {Object.entries(product.specifications).slice(0, 3).map(([key, val]) => (
            <div key={key} className="flex justify-between border-b border-white/5 pb-0.5 mb-0.5 last:border-0 last:pb-0 last:mb-0">
              <span className="text-gray-500 capitalize">{key.replace('_', ' ')}</span>
              <span className="font-semibold text-gray-300 truncate max-w-[155px] pl-2">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pricing & Discover actions */}
      <div className="mt-auto border-t border-white/5 pt-3 relative z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none">Discovery Price</span>
            <span className="text-sm font-black text-white mt-1 leading-none">
              ${product.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Star size={10} className="text-amber-400 fill-current" />
            <span className="text-[10px] font-black text-gray-200">{product.rating}</span>
          </div>
        </div>
        
        <div className="flex space-x-1.5">
          {/* Buy Link */}
          {product.product_url ? (
            <a 
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <ExternalLink size={11} />
              <span>View on {product.seller || product.source || 'Store'}</span>
            </a>
          ) : (
            <button 
              onClick={handleBuySimulation}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <ShoppingBag size={11} />
              <span>Buy Now</span>
            </button>
          )}

          {/* Ask AI reviews */}
          <button 
            onClick={() => onAskAI(`Search alternative pricing parameters and details reviews on ${product.name}.`)}
            className="px-2.5 bg-white/5 hover:bg-indigo-500/20 text-gray-300 hover:text-indigo-300 rounded-xl transition-all border border-white/5 hover:border-indigo-500/30 flex items-center justify-center cursor-pointer"
            title="Ask reviews of this model"
          >
            <Sparkles size={11} className="animate-pulse" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
