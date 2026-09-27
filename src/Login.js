/*import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const history = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/login", {
        email,
        password,
      });

      if (res.data === "exist") {
        history("/home", { state: { id: email } });
      } else {
        alert("Invalid credentials");
      }
    } catch (e) {
      alert("Login failed");
      console.log(e);
    }
  }

  return (
    <div style={{
      backgroundColor: "#ffffff",
      color: "#000",
      fontFamily: "Segoe UI, sans-serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      margin: 0
    }}>
      <div className="login-container" style={{
        width: "100%",
        maxWidth: "400px",
        padding: "40px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        boxShadow: "0 0 10px rgba(0,0,0,0.05)"
      }}>
        <h2 style={{
          marginBottom: "24px",
          textAlign: "center",
          fontSize: "1.8rem"
        }}>Login to RAG</h2>

        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="Email Address"
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "16px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "1rem"
            }}
          />
          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "16px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "1rem"
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#000",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
              transition: "0.3s ease"
            }}
          >
            Login
          </button>
        </form>

        <p style={{
          textAlign: "center",
          marginTop: "16px",
          fontSize: "0.9rem"
        }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "#000", textDecoration: "underline" }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;*/
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css"; // Make sure this file exists and includes the CSS below

function Login() {
  const history = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await axios.post("constitution-rag-production.up.railway.app/login", {
        email,
        password,
      });

      if (res.status === 200 && res.data.message === "Login successful") {
          history("/home", { state: { id: email } });
      } else {
          alert("Invalid credentials");
       }
    } catch (e) {
      alert("Login failed");
      console.log(e);
    }
  }

  return (
    <div className="container" onClick={() => {}}>
      <div className="top"></div>
      <div className="bottom"></div>
      <div className="center">
        <h2>Please Sign In</h2>
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" style={{ marginTop: "10px", padding: "10px", width: "100%" }}>
            Login
          </button>
        </form>
        <p style={{ marginTop: "10px" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "#000", textDecoration: "underline" }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
