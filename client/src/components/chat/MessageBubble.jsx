import ReactMarkdown from 'react-markdown';

/**
 * Renders a single chat message bubble.
 * role: 'user' | 'assistant'
 */
export default function MessageBubble({ role, text, children }) {
  const isUser = role === 'user';

  return (
    <div className={`msg-row ${isUser ? 'msg-row--user' : 'msg-row--ai'}`}>
      <div className={`msg-bubble ${isUser ? 'msg-bubble--user' : 'msg-bubble--ai'}`}>
        <ReactMarkdown>{text}</ReactMarkdown>
        {children}
      </div>
    </div>
  );
}
