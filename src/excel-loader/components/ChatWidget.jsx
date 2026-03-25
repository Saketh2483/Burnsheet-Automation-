import React from 'react';

export const ChatWidget = ({
  isChatOpen,
  setIsChatOpen,
  chatMessages,
  chatInput,
  setChatInput,
  onSendMessage
}) => {
  return (
    <>
      {/* Chat Icon Button */}
      <button 
        className="chat-icon-btn"
        onClick={() => setIsChatOpen(!isChatOpen)}
        title={isChatOpen ? "Close chat" : "Open chat support"}
      >
        {isChatOpen ? (
          <span className="chat-icon-close">✕</span>
        ) : (
          <img src="/logo.png" alt="Chat" className="chat-icon-image" />
        )}
      </button>

      {/* Chat Modal Window */}
      {isChatOpen && (
        <div className="chat-modal">
          <div className="chat-modal-messages">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-content">{msg.text}</div>
              </div>
            ))}
          </div>
          
          <div className="chat-modal-input-area">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
              placeholder="Type your message here..."
              className="chat-modal-input"
              autoFocus
            />
            <button onClick={onSendMessage} className="chat-modal-send-btn" title="Send message">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
