import { useRef, useEffect, useState } from 'react';

/**
 * Chat input bar with voice support.
 * onSend(text: string) — called when user submits
 */
export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setListening(true);
    rec.onend   = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (transcript) setValue(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    recognitionRef.current = rec;
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
    } else {
      try { recognitionRef.current.start(); } catch { /* already started */ }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit} aria-label="Send a message">
      <input
        ref={inputRef}
        className={`chat-input-field ${listening ? 'chat-input-field--listening' : ''}`}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={listening ? 'Listening… speak now 🎙️' : 'Or type your request here...'}
        disabled={disabled}
        aria-label="Chat message"
      />

      <div className="chat-input-actions">
        <button
          type="button"
          className={`chat-mic-btn ${listening ? 'chat-mic-btn--active' : ''}`}
          onClick={toggleMic}
          title={listening ? 'Stop listening' : 'Voice input'}
          aria-label="Voice input"
        >
          <span className="material-symbols-outlined">{listening ? 'stop_circle' : 'mic'}</span>
        </button>

        <button
          type="submit"
          className="chat-send-btn"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </form>
  );
}
