import { Link } from 'react-router-dom';

export default function ChatHeader({ isVoiceEnabled, onToggleVoice }) {
  return (
    <header className="chat-header-bar">
      <div className="chat-header-inner">
        {/* Top-left brand pill */}
        <Link to="/" className="chat-brand-pill" aria-label="StylistAI Home">
          <span className="chat-brand-main">STYLIST</span>
          <span className="chat-brand-highlight">AI</span>
        </Link>

        {/* Top-right actions */}
        <div className="chat-header-right-actions">
          {/* Voice Response Toggle Button (100% Free) */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`chat-voice-pill-btn ${isVoiceEnabled ? 'chat-voice-pill-btn--active' : ''}`}
            title={isVoiceEnabled ? "Voice Output Active (Click to mute)" : "Voice Output Muted (Click to enable)"}
            aria-label="Toggle voice output"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {isVoiceEnabled ? 'volume_up' : 'volume_off'}
            </span>
            <span>{isVoiceEnabled ? 'VOICE ON' : 'MUTED'}</span>
          </button>

          {/* Admin pill button */}
          <Link to="/admin" className="chat-admin-pill-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>admin_panel_settings</span>
            ADMIN
          </Link>
        </div>
      </div>
    </header>
  );
}
