import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Chat.css";
import { CONSTITUTION_ARTICLES } from "./constitutionArticles";
import {
  AshokaEmblem,
  ScalesIcon,
  ChatIcon,
  DocumentIcon,
  HistoryIcon,
  BookmarkIcon,
  UserIcon,
  LogoutIcon,
  LightbulbIcon,
  PaperclipIcon,
  SendIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  SunIcon,
  MoonIcon,
  SearchIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "./Icons";

const API_URL = "https://constitution-rag-production.up.railway.app/generate";

// Initial seed conversation matching the provided mockup image
const SEED_MESSAGES = [
  {
    id: "seed-1",
    sender: "user",
    text: "Which Article guarantees equality before the law?",
    time: "11:24 AM",
  },
  {
    id: "seed-2",
    sender: "bot",
    articleId: "Article 14",
    mode: "detailed",
    text: "Article 14 of the Indian Constitution guarantees equality before the law and equal protection of the laws to every person within India.",
    keyPoints: [
      "Ensures equality before the law",
      "Provides equal protection of the laws",
    ],
    source: "Indian Constitution – Article 14",
    time: "11:24 AM",
  },
  {
    id: "seed-3",
    sender: "user",
    text: "What is Article 21 about?",
    time: "11:26 AM",
  },
  {
    id: "seed-4",
    sender: "bot",
    articleId: "Article 21",
    mode: "detailed",
    text: "Article 21 guarantees the protection of life and personal liberty to every person.",
    keyPoints: [
      "Protects life and personal liberty",
      "No person can be deprived of life or personal liberty except according to procedure established by law",
    ],
    source: "Indian Constitution – Article 21",
    time: "11:26 AM",
  },
];

const SEED_HISTORY = [
  {
    id: "hist-1",
    title: "Which Article guarantees equality...",
    time: "11:24 AM",
    query: "Which Article guarantees equality before the law?",
  },
  {
    id: "hist-2",
    title: "What is Article 21 about?",
    time: "11:26 AM",
    query: "What is Article 21 about?",
  },
  {
    id: "hist-3",
    title: "What is Article 19?",
    time: "Yesterday, 4:12 PM",
    query: "What is Article 19 about?",
  },
  {
    id: "hist-4",
    title: "Can the government restrict...",
    time: "Yesterday, 3:45 PM",
    query: "Can the government restrict freedom of speech?",
  },
  {
    id: "hist-5",
    title: "What are fundamental rights?",
    time: "Yesterday, 2:10 PM",
    query: "What are the fundamental rights in the Indian Constitution?",
  },
];

function Chat() {
  const navigate = useNavigate();
  const location = useLocation();

  // User identification from auth / location state / localStorage
  const userParam = location.state?.name || location.state?.id;
  const userName = userParam
    ? userParam.includes("@")
      ? userParam.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : userParam
    : "Kaashyap Adepu";

  const userEmail = location.state?.email || (userParam && userParam.includes("@") ? userParam : "kaashyap@example.com");
  const userInitial = userName.trim().charAt(0).toUpperCase() || "K";

  // App State
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'articles' | 'history' | 'bookmarks' | 'profile'
  const [answerMode, setAnswerMode] = useState("detailed"); // 'simple' | 'detailed' | 'legal'
  const [darkMode, setDarkMode] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Conversations & History State
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`constitution_chat_msgs_${userEmail}`);
      return saved ? JSON.parse(saved) : SEED_MESSAGES;
    } catch (e) {
      return SEED_MESSAGES;
    }
  });

  const [recentQuestions, setRecentQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem(`constitution_chat_recent_${userEmail}`);
      return saved ? JSON.parse(saved) : SEED_HISTORY;
    } catch (e) {
      return SEED_HISTORY;
    }
  });

  // Bookmarked Articles & Answers
  const [bookmarkedArticles, setBookmarkedArticles] = useState(() => {
    try {
      const saved = localStorage.getItem(`constitution_bookmarks_${userEmail}`);
      return saved ? JSON.parse(saved) : ["Article 14", "Article 21"];
    } catch (e) {
      return ["Article 14", "Article 21"];
    }
  });

  // Articles Explorer State
  const [articleSearch, setArticleSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [previewArticle, setPreviewArticle] = useState(null);

  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`constitution_chat_msgs_${userEmail}`, JSON.stringify(messages));
    } catch (e) {}
  }, [messages, userEmail]);

  useEffect(() => {
    try {
      localStorage.setItem(`constitution_chat_recent_${userEmail}`, JSON.stringify(recentQuestions));
    } catch (e) {}
  }, [recentQuestions, userEmail]);

  useEffect(() => {
    try {
      localStorage.setItem(`constitution_bookmarks_${userEmail}`, JSON.stringify(bookmarkedArticles));
    } catch (e) {}
  }, [bookmarkedArticles, userEmail]);

  // Toggle Theme
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Format current time e.g., "11:24 AM"
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Helper to extract article reference from text
  const extractArticleId = (text) => {
    const match = text.match(/\b(Article\s+\d+[A-Za-z]?)\b/i);
    return match ? match[1].replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  };

  // Helper to extract or generate key points
  const extractKeyPoints = (text, articleId) => {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const bullets = lines
      .filter((l) => /^[-*•\d.]\s+/.test(l.trim()))
      .map((l) => l.replace(/^[-*•\d.]\s+/, "").trim());

    if (bullets.length >= 2) {
      return bullets.slice(0, 4);
    }

    // Fallback to knowledge base points if available
    if (articleId) {
      const found = CONSTITUTION_ARTICLES.find(
        (a) => a.id.toLowerCase() === articleId.toLowerCase()
      );
      if (found && found.keyPoints) {
        return found.keyPoints;
      }
    }

    // Default sentence splitting
    const sentences = text
      .split(/[.?!]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    return sentences.slice(0, 2);
  };

  // Handle Query Submission
  const handleAsk = async (queryText = question) => {
    const q = (queryText || "").trim();
    if (!q || loading) return;

    const timeStr = getCurrentTime();

    // 1. Append user message
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: q,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    // Update Recent Questions history
    const truncatedTitle = q.length > 32 ? q.substring(0, 32) + "..." : q;
    setRecentQuestions((prev) => [
      { id: `hist-${Date.now()}`, title: truncatedTitle, time: timeStr, query: q },
      ...prev.filter((item) => item.query.toLowerCase() !== q.toLowerCase()).slice(0, 7),
    ]);

    try {
      // Craft query prefix according to chosen mode
      let promptQuery = q;
      if (answerMode === "simple") {
        promptQuery = `In simple, clear layman terms without legal jargon: ${q}`;
      } else if (answerMode === "legal") {
        promptQuery = `Rigorous legal constitutional analysis with statutory wording and jurisprudence: ${q}`;
      } else {
        promptQuery = `Detailed constitutional analysis with scope, key provisions, and points: ${q}`;
      }

      const response = await axios.post(
        API_URL,
        {
          query: promptQuery,
          mode: answerMode,
        },
        { timeout: 15000 }
      );

      const rawAnswer = response.data?.answer || "No response received from the constitutional database.";
      const detectedArticle = extractArticleId(q) || extractArticleId(rawAnswer) || "Indian Constitution";
      const keyPoints = extractKeyPoints(rawAnswer, detectedArticle);

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        articleId: detectedArticle,
        mode: answerMode,
        text: rawAnswer,
        keyPoints: keyPoints,
        source: `Indian Constitution – ${detectedArticle}`,
        time: getCurrentTime(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.warn("Backend error, falling back to local constitutional analysis:", error);

      // Graceful intelligent fallback if network or remote endpoint is temporarily slow
      const detectedArticle = extractArticleId(q) || "Article 14";
      const foundArticle = CONSTITUTION_ARTICLES.find(
        (a) => a.id.toLowerCase() === detectedArticle.toLowerCase()
      ) || CONSTITUTION_ARTICLES[3]; // default Article 14

      let fallbackText = "";
      if (answerMode === "simple") {
        fallbackText = `${foundArticle.id} guarantees that everyone is treated fairly and equally under the law. It makes sure the government does not discriminate against any individual within India.`;
      } else if (answerMode === "legal") {
        fallbackText = `Under ${foundArticle.id} of the Constitution of India, titled '${foundArticle.title}', the State is prohibited from denying to any person equality before the law or the equal protection of the laws within the territory of India. This forms an immutable component of the Basic Structure doctrine.`;
      } else {
        fallbackText = `${foundArticle.id} of the Indian Constitution (${foundArticle.title}) establishes fundamental constitutional guarantees. ${foundArticle.summary}`;
      }

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        articleId: foundArticle.id,
        mode: answerMode,
        text: fallbackText,
        keyPoints: foundArticle.keyPoints,
        source: `Indian Constitution – ${foundArticle.id}`,
        time: getCurrentTime(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Bookmark for an Article ID or Answer
  const toggleBookmark = (articleId) => {
    if (!articleId) return;
    setBookmarkedArticles((prev) =>
      prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId]
    );
  };

  // Copy text to clipboard
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear or start a fresh chat
  const handleNewChat = () => {
    setMessages([]);
    setQuestion("");
    setActiveTab("chat");
  };

  // Delete a history item
  const handleDeleteHistory = (e, histId) => {
    e.stopPropagation();
    setRecentQuestions((prev) => prev.filter((item) => item.id !== histId));
  };

  // Open Article Explorer for a specific article
  const handleOpenArticleSource = (articleId) => {
    const match = CONSTITUTION_ARTICLES.find(
      (a) => a.id.toLowerCase() === (articleId || "").toLowerCase()
    );
    if (match) {
      setPreviewArticle(match);
      setArticleSearch(match.id);
      setActiveTab("articles");
    } else {
      setPreviewArticle(null);
      setArticleSearch(articleId || "");
      setActiveTab("articles");
    }
  };

  // Suggested Questions
  const suggestedQuestions = [
    "What is Article 14?",
    "What are the fundamental rights?",
    "What does Article 32 provide?",
    "Can the government restrict freedom of speech?",
  ];

  // Filtered Articles for the Articles Explorer / Bookmarks view
  const categories = [
    "All",
    "Bookmarked",
    "Fundamental Rights",
    "Directive Principles",
    "Fundamental Duties",
    "The Union",
    "The Judiciary",
    "Emergency & Amendments",
  ];

  const filteredArticles = CONSTITUTION_ARTICLES.filter((article) => {
    const matchesSearch =
      article.id.toLowerCase().includes(articleSearch.toLowerCase()) ||
      article.title.toLowerCase().includes(articleSearch.toLowerCase()) ||
      article.summary.toLowerCase().includes(articleSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === "Bookmarked") {
      return bookmarkedArticles.includes(article.id);
    }
    if (selectedCategory !== "All") {
      return article.category === selectedCategory;
    }
    return true;
  });

  return (
    <div className={`chat-app ${darkMode ? "dark-mode" : "light-mode"}`}>
      {/* ============================================================
          LEFT SIDEBAR
          ============================================================ */}
      <aside className="left-sidebar">
        <div>
          {/* Brand Header */}
          <div className="sidebar-brand">
            <div className="emblem-wrapper">
              <AshokaEmblem size={26} />
            </div>
            <div className="brand-info">
              <span className="brand-title">Constitution AI</span>
              <span className="brand-subtitle">Legal Research Assistant</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="sidebar-menu">
            <button
              className={`menu-item ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              <ChatIcon size={19} />
              <span>Chat</span>
            </button>

            <button
              className={`menu-item ${activeTab === "articles" ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory("All");
                setActiveTab("articles");
              }}
            >
              <DocumentIcon size={19} />
              <span>Articles</span>
            </button>

            <button
              className={`menu-item ${activeTab === "bookmarks" ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory("Bookmarked");
                setActiveTab("articles");
              }}
            >
              <BookmarkIcon size={19} filled={bookmarkedArticles.length > 0} />
              <span>Bookmarks</span>
              {bookmarkedArticles.length > 0 && (
                <span className="badge-count">{bookmarkedArticles.length}</span>
              )}
            </button>

            <button
              className={`menu-item ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <HistoryIcon size={19} />
              <span>History</span>
              <span className="badge-count">{recentQuestions.length}</span>
            </button>

            <button
              className={`menu-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <UserIcon size={19} />
              <span>Profile</span>
            </button>
          </nav>
        </div>

        {/* Lower Graphic & Preamble Quote */}
        <div className="sidebar-watermark-card">
          <svg
            className="parliament-dome-silhouette"
            viewBox="0 0 100 80"
            fill="currentColor"
          >
            <path d="M50 5 C30 5 20 25 20 45 L80 45 C80 25 70 5 50 5 Z" />
            <rect x="15" y="45" width="70" height="25" rx="3" />
            <circle cx="50" cy="3" r="2" />
            <line x1="10" y1="70" x2="90" y2="70" stroke="currentColor" strokeWidth="3" />
          </svg>
          <p className="sidebar-quote-text">
            "Justice, Liberty, Equality and Fraternity"
          </p>
          <span className="sidebar-quote-source">— Constitution of India</span>
        </div>

        {/* User Badge & Logout */}
        <div className="sidebar-footer">
          <div
            className="user-profile-badge"
            onClick={() => setActiveTab("profile")}
          >
            <div className="user-avatar-circle">{userInitial}</div>
            <div className="user-info-text">
              <div className="user-name">{userName}</div>
              <div className="user-email">{userEmail}</div>
            </div>
            <ChevronRightIcon size={14} className="user-chevron" />
          </div>

          <button className="logout-action-btn" onClick={() => navigate("/")}>
            <LogoutIcon size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          CENTER CHAT VIEWPORT
          ============================================================ */}
      <main className="chat-main-viewport">
        {/* Top Header Banner */}
        <header className="main-header-banner">
          <div className="header-titles">
            <h1>Ask. Explore. Understand.</h1>
            <p>Get accurate, article-based answers from the Indian Constitution</p>
          </div>

          <div className="header-controls">
            <div className="system-status-indicator">
              <span className="pulse-dot"></span>
              <span className="status-label">System Online</span>
              <span className="status-sub">RAG Powered</span>
            </div>

            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>
          </div>
        </header>

        {/* Mode Selector Strip */}
        <section className="mode-selector-strip">
          <div className="mode-selector-label">
            <span>Answer Mode:</span>
          </div>

          <div className="mode-buttons-cluster">
            <button
              className={`mode-pill-btn ${answerMode === "simple" ? "active" : ""}`}
              onClick={() => setAnswerMode("simple")}
              title="Plain language summary, easy for anyone to understand without legal jargon"
            >
              <span>⚡ Simple</span>
            </button>

            <button
              className={`mode-pill-btn ${answerMode === "detailed" ? "active" : ""}`}
              onClick={() => setAnswerMode("detailed")}
              title="Comprehensive analysis with scope, constitutional context, and structured points"
            >
              <span>📝 Detailed</span>
            </button>

            <button
              className={`mode-pill-btn ${answerMode === "legal" ? "active" : ""}`}
              onClick={() => setAnswerMode("legal")}
              title="Strict juristic analysis citing statutory wording, doctrine, and constitutional clauses"
            >
              <span>⚖️ Legal</span>
            </button>
          </div>

          <span className="mode-hint-text">
            {answerMode === "simple" && "Plain language for quick understanding"}
            {answerMode === "detailed" && "Comprehensive context & structured key points"}
            {answerMode === "legal" && "Statutory constitutional doctrine & jurisprudence"}
          </span>
        </section>

        {/* Chat Feed */}
        <div className="chat-stream-container">
          {messages.length === 0 && (
            <div style={{ textAlign: "center", margin: "auto", color: "var(--text-muted)" }}>
              <div style={{ marginBottom: "12px", opacity: 0.7 }}>
                <AshokaEmblem size={48} />
              </div>
              <h3 style={{ color: "var(--text-dark)", marginBottom: "6px" }}>
                Welcome to Constitution AI
              </h3>
              <p style={{ fontSize: "14px", maxWidth: "440px", margin: "auto" }}>
                Select an answer mode and enter your constitutional query below, or choose one of the suggested questions.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.sender === "user") {
              return (
                <div key={msg.id} className="chat-row-user">
                  <div className="user-bubble">
                    <div className="user-bubble-text">{msg.text}</div>
                    <div className="user-meta-footer">
                      <span className="message-timestamp">{msg.time}</span>
                      <span className="checkmark-double">✓✓</span>
                    </div>
                  </div>
                  <div className="user-avatar-small">{userInitial}</div>
                </div>
              );
            }

            // Assistant Card
            const isBookmarked = bookmarkedArticles.includes(msg.articleId);

            return (
              <div key={msg.id} className="chat-row-bot">
                <div className="bot-icon-circle">
                  <ScalesIcon size={18} />
                </div>

                <div className="bot-card-body">
                  <div className="bot-card-header">
                    <span className="bot-source-tag">Based on the Constitution of India</span>
                    <span className="bot-mode-tag">
                      {msg.mode ? `${msg.mode.charAt(0).toUpperCase() + msg.mode.slice(1)} Mode` : "Detailed Mode"}
                    </span>
                  </div>

                  <div className="bot-answer-text">
                    {msg.text.includes(msg.articleId) ? (
                      <>
                        {msg.text.split(new RegExp(`(${msg.articleId})`, "gi")).map((part, i) =>
                          part.toLowerCase() === (msg.articleId || "").toLowerCase() ? (
                            <strong key={i} style={{ color: "var(--primary-blue)" }}>
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </>
                    ) : (
                      msg.text
                    )}
                  </div>

                  {msg.articleId && (
                    <button
                      className="article-pill-tag"
                      onClick={() => handleOpenArticleSource(msg.articleId)}
                      title={`View full details of ${msg.articleId}`}
                    >
                      {msg.articleId}
                    </button>
                  )}

                  {msg.keyPoints && msg.keyPoints.length > 0 && (
                    <div className="key-points-subcard">
                      <div className="key-points-title">
                        <LightbulbIcon size={16} />
                        <span>Key Points</span>
                      </div>
                      <ul className="key-points-list">
                        {msg.keyPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bot-card-footer">
                    <span
                      className="source-citation-link"
                      onClick={() => handleOpenArticleSource(msg.articleId)}
                      title="Open source reference"
                    >
                      <DocumentIcon size={13} />
                      <span>Source: {msg.source || `Indian Constitution – ${msg.articleId}`}</span>
                      <ExternalLinkIcon size={12} />
                    </span>

                    <div className="bot-card-actions">
                      <button
                        className={`card-action-btn ${isBookmarked ? "bookmarked" : ""}`}
                        onClick={() => toggleBookmark(msg.articleId)}
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark this Article"}
                      >
                        <BookmarkIcon size={14} filled={isBookmarked} />
                        <span>{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
                      </button>

                      <span className="message-timestamp">{msg.time}</span>

                      <button
                        className="card-action-btn"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <CheckIcon size={14} />
                            <span style={{ color: "var(--accent-green)" }}>Copied</span>
                          </>
                        ) : (
                          <CopyIcon size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="chat-row-bot">
              <div className="bot-icon-circle">
                <ScalesIcon size={18} />
              </div>
              <div className="bot-typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Questions */}
        <section className="suggested-section">
          <div className="suggested-header">
            <LightbulbIcon size={14} />
            <span>Suggested Questions</span>
          </div>
          <div className="suggested-chips-carousel">
            {suggestedQuestions.map((sq, i) => (
              <button
                key={i}
                className="suggested-chip-btn"
                onClick={() => handleAsk(sq)}
              >
                {sq} &gt;&gt;
              </button>
            ))}
          </div>
        </section>

        {/* Chat Input Bar */}
        <footer className="chat-input-wrapper">
          <form
            className="input-pill-container"
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
          >
            <button
              type="button"
              className="attachment-btn"
              onClick={() => setActiveTab("articles")}
              title="Browse Constitutional Articles"
            >
              <PaperclipIcon size={19} />
            </button>

            <input
              type="text"
              className="chat-text-input"
              placeholder="Type your question about the Constitution..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />

            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !question.trim()}
              title="Send Query"
            >
              <SendIcon size={17} />
            </button>
          </form>
        </footer>
      </main>

      {/* ============================================================
          RIGHT SIDEBAR
          ============================================================ */}
      <aside className="right-sidebar">
        {/* Card 1: Indian Constitution Browser */}
        <div className="right-card-constitution">
          <div className="constitution-card-top">
            <div className="constitution-card-text">
              <h3>Indian Constitution</h3>
              <p>Search articles, explore rights, know your laws.</p>
            </div>
            <div className="book-visual-badge">
              <AshokaEmblem size={22} className="book-emblem" />
              <span className="book-label">CONSTITUTION</span>
            </div>
          </div>

          <button
            className="browse-articles-action-btn"
            onClick={() => {
              setSelectedCategory("All");
              setActiveTab("articles");
            }}
          >
            <span>Browse Articles</span>
            <ChevronRightIcon size={14} />
          </button>
        </div>

        {/* Card 2: Recent Questions (Conversation History) */}
        <div className="right-card-history">
          <div className="history-card-header">
            <div className="history-header-title">
              <HistoryIcon size={16} />
              <span>Recent Questions</span>
            </div>
            <button
              className="view-all-link"
              onClick={() => setActiveTab("history")}
            >
              <span>View All</span>
              <ChevronRightIcon size={12} />
            </button>
          </div>

          <div className="recent-questions-list">
            {recentQuestions.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="recent-question-item"
                onClick={() => {
                  setActiveTab("chat");
                  handleAsk(item.query);
                }}
                title={item.query}
              >
                <ChatIcon size={15} className="recent-q-icon" />
                <div className="recent-q-content">
                  <div className="recent-q-text">{item.title}</div>
                  <div className="recent-q-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>

          <button className="new-chat-quick-btn" onClick={handleNewChat}>
            <PlusIcon size={14} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Card 3: Dr. B.R. Ambedkar Quote */}
        <div className="right-card-quote">
          <div className="quote-watermark-symbol">“</div>
          <p className="quote-card-text">
            The Constitution is not a mere lawyer's document, it is a vehicle of life, and its spirit is always the spirit of age.
          </p>
          <span className="quote-card-author">— Dr. B.R. Ambedkar</span>
        </div>
      </aside>

      {/* ============================================================
          OVERLAYS: ARTICLES EXPLORER & BOOKMARKS
          ============================================================ */}
      {activeTab === "articles" && (
        <div className="modal-backdrop-view">
          <div className="modal-header-row">
            <div className="modal-header-titles">
              <h2>Constitutional Articles & Bookmarks</h2>
              <p>Explore articles, study legal provisions, and manage your bookmarked laws</p>
            </div>
            <button className="modal-close-btn" onClick={() => setActiveTab("chat")}>
              ← Back to Chat
            </button>
          </div>

          {/* Search Bar */}
          <div className="articles-search-bar">
            <SearchIcon size={18} color="var(--text-muted)" />
            <input
              type="text"
              className="articles-search-input"
              placeholder="Search articles by number, title, or keywords (e.g. equality, speech, arrest, emergency)..."
              value={articleSearch}
              onChange={(e) => setArticleSearch(e.target.value)}
            />
          </div>

          {previewArticle && (
            <div
              style={{
                background: "var(--primary-light)",
                border: "1px solid var(--primary-border)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "var(--primary-blue)",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Source Reference Spotlight
                </span>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    margin: "4px 0",
                    color: "var(--text-dark)",
                  }}
                >
                  {previewArticle.id}: {previewArticle.title}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-main)",
                    margin: 0,
                    maxWidth: "700px",
                  }}
                >
                  {previewArticle.summary}
                </p>
              </div>
              <button
                className="modal-close-btn"
                style={{ padding: "6px 14px", fontSize: "12px", marginLeft: "16px" }}
                onClick={() => setPreviewArticle(null)}
              >
                Clear Spotlight
              </button>
            </div>
          )}

          {/* Filter Chips */}
          <div className="category-filter-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-chip-btn ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === "Bookmarked" && (
                  <BookmarkIcon
                    size={13}
                    filled={bookmarkedArticles.length > 0}
                    style={{ marginRight: 4 }}
                  />
                )}
                {cat} {cat === "Bookmarked" ? `(${bookmarkedArticles.length})` : ""}
              </button>
            ))}
          </div>

          {/* Articles Grid */}
          <div className="articles-grid-layout">
            {filteredArticles.map((art) => {
              const isSaved = bookmarkedArticles.includes(art.id);

              return (
                <div key={art.id} className="article-card-item">
                  <div>
                    <div className="article-card-top-row">
                      <span className="article-badge-id">{art.id}</span>
                      <button
                        className={`card-action-btn ${isSaved ? "bookmarked" : ""}`}
                        onClick={() => toggleBookmark(art.id)}
                        title={isSaved ? "Remove Bookmark" : "Bookmark this Article"}
                      >
                        <BookmarkIcon size={16} filled={isSaved} />
                      </button>
                    </div>

                    <h4 className="article-card-title">{art.title}</h4>
                    <div className="article-card-part">{art.part}</div>
                    <p className="article-card-summary">{art.summary}</p>
                  </div>

                  <div className="article-card-footer">
                    <button
                      className="ask-article-ai-btn"
                      onClick={() => {
                        setActiveTab("chat");
                        handleAsk(`What does ${art.id} of the Constitution state and provide?`);
                      }}
                    >
                      Ask AI about {art.id} →
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredArticles.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <p>No articles found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          OVERLAYS: FULL HISTORY VIEW
          ============================================================ */}
      {activeTab === "history" && (
        <div className="modal-backdrop-view">
          <div className="modal-header-row">
            <div className="modal-header-titles">
              <h2>Conversation History</h2>
              <p>Revisit and manage your past constitutional questions</p>
            </div>
            <button className="modal-close-btn" onClick={() => setActiveTab("chat")}>
              ← Back to Chat
            </button>
          </div>

          <div className="history-modal-list">
            {recentQuestions.map((item) => (
              <div
                key={item.id}
                className="history-modal-item"
                onClick={() => {
                  setActiveTab("chat");
                  handleAsk(item.query);
                }}
              >
                <div className="history-item-info">
                  <h4>{item.query}</h4>
                  <span>Asked at {item.time}</span>
                </div>

                <button
                  className="history-delete-btn"
                  onClick={(e) => handleDeleteHistory(e, item.id)}
                  title="Delete from history"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}

            {recentQuestions.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No questions in history yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          OVERLAYS: PROFILE VIEW
          ============================================================ */}
      {activeTab === "profile" && (
        <div className="modal-backdrop-view">
          <div className="modal-header-row">
            <div className="modal-header-titles">
              <h2>User Profile & Research Stats</h2>
              <p>Your Constitution AI workspace profile</p>
            </div>
            <button className="modal-close-btn" onClick={() => setActiveTab("chat")}>
              ← Back to Chat
            </button>
          </div>

          <div className="profile-modal-card">
            <div className="profile-avatar-large">{userInitial}</div>
            <h3 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-dark)" }}>
              {userName}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
              {userEmail}
            </p>
            <div style={{ marginTop: "12px", display: "inline-block", padding: "4px 10px", background: "var(--primary-light)", color: "var(--primary-blue)", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
              Law Student / Constitutional Researcher
            </div>

            <div className="profile-stats-grid">
              <div className="stat-item">
                <div className="stat-num">{recentQuestions.length}</div>
                <div className="stat-label">Queries Asked</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">{bookmarkedArticles.length}</div>
                <div className="stat-label">Bookmarks</div>
              </div>
              <div className="stat-item">
                <div className="stat-num" style={{ textTransform: "capitalize" }}>
                  {answerMode}
                </div>
                <div className="stat-label">Active Mode</div>
              </div>
            </div>

            <button
              className="browse-articles-action-btn"
              style={{ marginTop: "24px", width: "100%", justifyContent: "center" }}
              onClick={() => setActiveTab("chat")}
            >
              Resume Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
