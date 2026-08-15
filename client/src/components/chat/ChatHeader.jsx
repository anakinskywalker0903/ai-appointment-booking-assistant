import { Link } from 'react-router-dom';

export default function ChatHeader() {
  return (
    <header className="chat-header-bar">
      <div className="chat-header-inner">
        <Link to="/" className="chat-brand">StylistAI</Link>

        <nav className="chat-nav">
          <Link to="/admin" className="chat-nav-link">My appointments</Link>
          <a href="#" className="chat-nav-link">Help</a>
        </nav>

        <button className="chat-account-btn" aria-label="Account">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
}
