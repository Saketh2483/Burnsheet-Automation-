import { useState, useRef, useEffect } from 'react'
import './Chatbot.css'

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hi! I\'m Virtual Bot. How can I help you with the dashboard today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNewMessagesIndicator, setShowNewMessagesIndicator] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  const checkIfNearBottom = () => {
    if (!messagesContainerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    return scrollHeight - scrollTop - clientHeight < 100
  }

  const handleScroll = () => {
    const nearBottom = checkIfNearBottom()
    setIsNearBottom(nearBottom)
    if (nearBottom) {
      setShowNewMessagesIndicator(false)
    }
  }

  const scrollToBottom = () => {
    setIsNearBottom(true)
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isNearBottom])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputValue.trim()) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate bot response delay
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        text: generateBotResponse(inputValue),
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMessage])
      setIsLoading(false)

      // Check if user is near bottom, if not show indicator
      if (!isNearBottom) {
        setShowNewMessagesIndicator(true)
      }
    }, 800)
  }

  const generateBotResponse = (userInput) => {
    const input = userInput.toLowerCase()
    
    if (input.includes('rate') || input.includes('burn')) {
      return 'The Monthly Burn Comparison shows your overall rates and individual employee burn rates. You can select different views to analyze Monthly Rate vs Actual Rate. Would you like to know more about a specific view?'
    } else if (input.includes('classification')) {
      return 'The Classification Distribution displays how your data is distributed across different classifications. The pie chart shows the percentage breakdown of each classification category.'
    } else if (input.includes('resource') || input.includes('flag')) {
      return 'The Resource Flags section helps you identify and manage resource classifications. It provides insights into your resource distribution and potential issues.'
    } else if (input.includes('filter') || input.includes('custom')) {
      return 'The Custom View allows you to filter data by specific parameters like Location, Tower, ACT/PCT, and more. Select a parameter and then choose a value to see filtered results.'
    } else if (input.includes('help') || input.includes('how')) {
      return 'I can help you with:\n• Understanding the Monthly Burn Comparison\n• Explaining the Classification Distribution\n• Navigating the custom filters\n• Analyzing resource data\n\nWhat would you like to know?'
    } else if (input.includes('dashboard')) {
      return 'The Rate Analysis Dashboard provides a comprehensive view of your rate and resource data. It includes Monthly Burn analysis, Classification distribution, and Resource flagging capabilities. What aspect would you like to explore?'
    } else {
      return 'I can help you understand the dashboard features. Feel free to ask me about:\n• Rate analysis\n• Classifications\n• Custom filters\n• Resource management\n\nWhat can I help you with?'
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        className="chatbot-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Open Chat"
      >
        <img src="/robot-icon.png" alt="Robot" className="chatbot-float-icon" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-title-wrapper">
              <h3>How can I help you?</h3>
              <button
                className="chatbot-close-btn"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chatbot-messages-wrapper">
            <div
              className="chatbot-messages"
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-wrapper ${message.sender}`}
                >
                  <div className={`message ${message.sender}`}>
                    <p>{message.text}</p>
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="message-wrapper bot">
                  <div className="message bot loading">
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                </div>
              )}

              {showNewMessagesIndicator && (
                <button
                  className="new-messages-indicator"
                  onClick={scrollToBottom}
                >
                  New messages ↓
                </button>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <form className="chatbot-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Ask me about the dashboard..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="chatbot-send-btn"
              disabled={isLoading || !inputValue.trim()}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default Chatbot
