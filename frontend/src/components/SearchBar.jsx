import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ImagePlus, Mic, MicOff, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';

const MAX_IMAGE_MB = 5;

/** Downscale large photos before upload so requests stay small and fast. */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 1.5e6) return resolve(reader.result);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SearchBar({ onSubmit, disabled, placeholder, size = 'lg', autoFocus = false }) {
  const { toast } = useShop();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [listening, setListening] = useState(false);
  const [dragging, setDragging] = useState(false);
  const recRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => recRef.current?.stop(), []);

  const attach = async (file) => {
    if (!file?.type?.startsWith('image/')) return toast('Please choose an image file', 'error');
    if (file.size > MAX_IMAGE_MB * 4 * 1024 * 1024) return toast('That image is too large', 'error');
    setImage(await readImage(file));
    inputRef.current?.focus();
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Voice input works in Chrome, Edge and Safari', 'error');
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => setText(Array.from(e.results).map((r) => r[0].transcript).join(''));
    rec.onerror = (e) => { if (e.error === 'not-allowed') toast('Microphone permission was blocked', 'error'); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const submit = (e) => {
    e?.preventDefault();
    const msg = text.trim() || (image ? 'Find this product or similar ones to buy' : '');
    if (!msg || disabled) return;
    recRef.current?.stop();
    onSubmit({ message: msg, image });
    setText('');
    setImage(null);
  };

  const big = size === 'lg';
  return (
    <form
      onSubmit={submit}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); attach(e.dataTransfer.files?.[0]); }}
      className={`card relative flex flex-col gap-2 transition focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10 ${big ? 'p-3' : 'p-2'} ${dragging ? 'border-brand ring-4 ring-brand/20' : ''}`}
    >
      {image && (
        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-line">
            <img src={image} alt="Attached" className="h-full w-full object-cover" />
            <button type="button" onClick={() => setImage(null)} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white cursor-pointer" aria-label="Remove image">
              <X className="h-3 w-3" />
            </button>
          </div>
          <span className="text-xs text-muted">Image attached — ask what you want, e.g. “find this cheaper” or “shoes that match”.</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => { const f = e.clipboardData?.files?.[0]; if (f) { e.preventDefault(); attach(f); } }}
          placeholder={listening ? 'Listening…' : placeholder || 'Describe what you want to buy…'}
          aria-label="What are you shopping for?"
          className={`min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted ${big ? 'py-2 text-base' : 'py-1.5 text-sm'}`}
        />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-icon" title="Search with a photo" aria-label="Search with a photo">
          <ImagePlus className="h-5 w-5" />
        </button>
        <button
          type="button" onClick={toggleMic}
          className={`btn-icon ${listening ? 'bg-danger/10 text-danger animate-pulse' : ''}`}
          title={listening ? 'Stop listening' : 'Speak'} aria-label={listening ? 'Stop voice input' : 'Voice input'}
        >
          {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button type="submit" disabled={disabled || (!text.trim() && !image)} className="btn-primary h-10 w-10 p-0" aria-label="Search">
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
