import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [page, setPage] = useState("home");
  const [messages, setMessages] = useState([]);
  const [simplifyMessages, setSimplifyMessages] = useState([]);
  const [input, setInput] = useState("");
  const [simplifyInput, setSimplifyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const simplifyEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    simplifyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [simplifyMessages]);

  const handleAsk = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/ask`, {
        question: userMessage,
      });
      const answer = response.data.answer || response.data.error;
      setMessages((prev) => [...prev, { role: "bot", text: answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Something went wrong. Please try again." },
      ]);
    }
    setLoading(false);
  };
  const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  setSimplifyMessages((prev) => [
    ...prev,
    { role: "user", text: `📷 Uploaded image: ${file.name}` },
  ]);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`${API_URL}/extract-text`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response.data.text) {
      setSimplifyInput(response.data.text);
      setSimplifyMessages((prev) => [
        ...prev,
        { role: "bot", text: `✅ Text extracted from image! Review it in the input box below and click send when ready.` },
      ]);
    } else {
      setSimplifyMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry I could not extract text from that image. Please try typing the note instead." },
      ]);
    }
  } catch (err) {
    setSimplifyMessages((prev) => [
      ...prev,
      { role: "bot", text: "Something went wrong while reading the image. Please try again." },
    ]);
  }
  setLoading(false);
};
  const handleSimplify = async () => {
    if (!simplifyInput.trim() || loading) return;
    const userMessage = simplifyInput.trim();
    setSimplifyInput("");
    setSimplifyMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/simplify`, {
        clinical_note: userMessage,
      });
      const result = response.data.simplified || response.data.error;
      setSimplifyMessages((prev) => [...prev, { role: "bot", text: result }]);
    } catch (err) {
      setSimplifyMessages((prev) => [
        ...prev,
        { role: "bot", text: "Something went wrong. Please try again." },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e, type) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (type === "ask") handleAsk();
      else handleSimplify();
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo">OrthoClear</h1>
          <p className="tagline">Understanding your physiotherapy notes made simple</p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <button className={`nav-btn ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Home</button>
        <button className={`nav-btn ${page === "simplify" ? "active" : ""}`} onClick={() => setPage("simplify")}>Simplify Note</button>
        <button className={`nav-btn ${page === "ask" ? "active" : ""}`} onClick={() => setPage("ask")}>Ask a Question</button>
        <button className={`nav-btn ${page === "about" ? "active" : ""}`} onClick={() => setPage("about")}>About</button>
      </nav>

      {/* Main Content */}
      <main className="main">

        {/* Home Page */}
        {page === "home" && (
          <div className="page home-page">
            <div className="welcome-card">
              <h2>Welcome to OrthoClear</h2>
              <p>Did your physiotherapist give you a note full of medical words you do not understand? You are in the right place.</p>
              <p>OrthoClear helps you understand your orthopaedic physiotherapy notes and answers your questions in simple everyday English.</p>
              <div className="home-buttons">
                <button className="primary-btn" onClick={() => setPage("simplify")}>Simplify My Clinical Note</button>
                <button className="secondary-btn" onClick={() => setPage("ask")}>Ask a Question</button>
              </div>
            </div>
            <div className="features">
              <div className="feature-card">
                <div className="feature-icon">📋</div>
                <h3>Simplify Notes</h3>
                <p>Paste your clinical note and get a simple explanation instantly</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <h3>Ask Questions</h3>
                <p>Ask anything about your condition or treatment in plain English</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏥</div>
                <h3>Medically Accurate</h3>
                <p>Answers are based on verified orthopaedic physiotherapy knowledge</p>
              </div>
            </div>
          </div>
        )}

        {/* Simplify Note Chat Page */}
        {page === "simplify" && (
          <div className="chat-page">
            <div className="chat-header">
              <h2>Simplify My Clinical Note</h2>
              <p>Paste your clinical note and we will explain it in simple English</p>
            </div>
            <div className="chat-window">
              {simplifyMessages.length === 0 && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">📋</div>
                  <p>Paste your clinical note below to get started</p>
                </div>
              )}
              {simplifyMessages.map((msg, index) => (
                <div key={index} className={`chat-bubble-wrap ${msg.role}`}>
                  <div className={`chat-bubble ${msg.role}`}>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-bubble-wrap bot">
                  <div className="chat-bubble bot typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={simplifyEndRef} />
            </div>
            <div className="chat-input-area">
  <label className="upload-btn" title="Upload image of clinical note">
    📷
    <input
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={handleImageUpload}
    />
  </label>
  <textarea
    className="chat-input"
    placeholder="Paste your clinical note here or upload a photo... (Press Enter to send)"
    value={simplifyInput}
    onChange={(e) => setSimplifyInput(e.target.value)}
    onKeyDown={(e) => handleKeyDown(e, "simplify")}
    rows={3}
  />
  <button className="send-btn" onClick={handleSimplify} disabled={loading}>
    {loading ? "..." : "➤"}
  </button>
</div>
          </div>
        )}

        {/* Ask a Question Chat Page */}
        {page === "ask" && (
          <div className="chat-page">
            <div className="chat-header">
              <h2>Ask a Question</h2>
              <p>Ask anything about your condition, treatment or exercises</p>
            </div>
            <div className="chat-window">
              {messages.length === 0 && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">💬</div>
                  <p>Ask me anything about orthopaedic physiotherapy</p>
                  <div className="suggestions">
                    <button className="suggestion-btn" onClick={() => setInput("What is an ACL tear?")}>What is an ACL tear?</button>
                    <button className="suggestion-btn" onClick={() => setInput("What exercises help with lower back pain?")}>Exercises for lower back pain?</button>
                    <button className="suggestion-btn" onClick={() => setInput("What does LBP mean?")}>What does LBP mean?</button>
                  </div>
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`chat-bubble-wrap ${msg.role}`}>
                  <div className={`chat-bubble ${msg.role}`}>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-bubble-wrap bot">
                  <div className="chat-bubble bot typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                placeholder="Type your question here... (Press Enter to send)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "ask")}
                rows={3}
              />
              <button className="send-btn" onClick={handleAsk} disabled={loading}>
                {loading ? "..." : "➤"}
              </button>
            </div>
          </div>
        )}

        {/* About Page */}
        {page === "about" && (
          <div className="page">
            <div className="about-card">
              <h2>About OrthoClear</h2>
              <p>OrthoClear is a B.Tech final year project built to help patients understand their orthopaedic physiotherapy clinical notes using Artificial Intelligence.</p>
              <p>It uses a technology called RAG which stands for Retrieval Augmented Generation. This means the AI does not just guess. It first searches a specialized database of orthopaedic physiotherapy knowledge before giving you an answer.</p>
              <p>This app is for educational purposes only. Always consult your physiotherapist or doctor for medical advice.</p>
              <div className="disclaimer">
                <strong>Disclaimer:</strong> OrthoClear is not a substitute for professional medical advice, diagnosis or treatment.
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="footer">
        <p>OrthoClear © 2025 | For educational purposes only</p>
      </footer>
    </div>
  );
}

export default App;