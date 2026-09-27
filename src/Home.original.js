import React, { useState } from "react";
import "./web.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = "constitution-rag-production.up.railway.app/generate";

  const handleAsk = async () => {
    if (question.trim() === "") return;

    setLoading(true);
    try {
      const response = await axios.post(API_URL, {
      query: question
    });
    console.log("Response:", response.data);
    setAnswer(response.data.answer);
    } catch (error) {
      console.error("Error fetching answer:", error);
      setAnswer(
        "Error connecting to the RAG system. Please ensure the Colab notebook is running and the ngrok URL is correct."
      );
    }
    setLoading(false);
  };

  const handleClear = () => {
    setQuestion("");
    setAnswer("");
  };

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="layout">
      {/* Sidebar */} 
      <aside className="sidebar">
        <h2 className="sidebar-logo">ARTICLE-ASSIST</h2>
        <nav className="sidebar-nav">
          <button className="sidebar-link" onClick={handleLogout}>Home</button>
          <button className="sidebar-link" onClick={handleLogout}>Logout</button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="home-container">
        <div className="welcome-box">
          <h1 className="welcome-title">Welcome back, User</h1>
          <div className="input-bar">
            <input
              type="text"
              placeholder="Enter your Query"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button onClick={handleAsk} className="start-chat-btn" disabled={loading}>
              {loading ? "..." : "→"}
            </button>
          </div>

          {answer && (
            <div className="answer-box">
              <textarea readOnly value={answer} />
              <button onClick={handleClear} className="clear-chat-btn">
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        &copy; {new Date().getFullYear()} AI Chat. All rights reserved.
      </footer>
    </div>
  );
}

export default Home;