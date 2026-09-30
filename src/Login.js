import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await axios.post("https://legal-rag-total-updated-production.up.railway.app/login", {
        email: cleanEmail,
        password,
      });

      if (res.status === 200 && res.data.message === "Login successful") {
        const userObj = {
          id: cleanEmail,
          email: res.data.email || cleanEmail,
          name: res.data.name || cleanEmail,
        };

        try {
          localStorage.setItem("user", JSON.stringify(userObj));
        } catch (storageErr) {
          console.error("Failed to save user in localStorage:", storageErr);
        }

        navigate("/home", { state: userObj });
      } else {
        setError(res.data?.error || "Invalid credentials");
      }
    } catch (e) {
      console.log("Login error:", e);
      setError(e.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="top"></div>
      <div className="bottom"></div>
      <div className="center">
        <h2>Please Sign In</h2>

        {error && (
          <div
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: "12px",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #f87171",
              borderRadius: "6px",
              fontSize: "0.88rem",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ width: "100%" }}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            disabled={loading}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            disabled={loading}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "12px",
              padding: "12px",
              width: "100%",
              backgroundColor: loading ? "#93c5fd" : "#4a6cf7",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p style={{ marginTop: "14px", fontSize: "0.92rem" }}>
          Don't have an account?{" "}
          <Link
            to="/signup"
            style={{ color: "#4a6cf7", textDecoration: "underline", fontWeight: "600" }}
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
