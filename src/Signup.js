import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";

function Signup() {
  const history = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  async function submit(e) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!formData.fullName.trim()) {
      alert("Please enter your full name");
      return;
    }

    if (!formData.email.trim()) {
      alert("Please enter your email");
      return;
    }

    if (!formData.password) {
      alert("Please enter a password");
      return;
    }

    const signupData = {
      name: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/signup",
        signupData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      if (res.status === 201) {
        alert("Account created successfully!");
        history("/login");
      }
    } catch (e) {
      console.log(
        "SIGNUP ERROR:",
        e.response?.data || e.message
      );

      if (e.response?.status === 409) {
        alert(
          "This email is already registered. Please use another email."
        );
      } else if (e.response?.status === 400) {
        alert(
          e.response?.data?.error ||
            "Please check your signup details."
        );
      } else if (e.response?.status === 503) {
        alert(
          "Database is currently unavailable. Please try again."
        );
      } else if (e.response?.status === 500) {
        alert("Server error. Please try again.");
      } else if (!e.response) {
        alert(
          "Cannot connect to the backend. Make sure Flask is running on port 5000."
        );
      } else {
        alert(
          e.response?.data?.error ||
            "Signup failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-background">
        <div className="signup-glow glow-one"></div>
        <div className="signup-glow glow-two"></div>
      </div>

      <div className="signup-card">

        {/* Brand */}
        <div className="signup-brand">
          <div className="brand-icon">⚖</div>

          <div>
            <h1>Constitution RAG</h1>
            <p>AI-Powered Constitutional Research</p>
          </div>
        </div>

        {/* Heading */}
        <div className="signup-heading">
          <h2>Create your account</h2>
          <p>
            Get started with intelligent constitutional
            research and analysis.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="signup-form">

          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Confirm Password</label>

            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="signup-button"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Login */}
        <div className="login-section">
          <span>Already have an account?</span>

          <Link to="/login">
            Sign in
          </Link>
        </div>

        {/* Footer */}
        <div className="signup-footer">
          <span>🔒 Secure access</span>
          <span>•</span>
          <span>Constitutional AI Assistant</span>
        </div>

      </div>
    </div>
  );
}

export default Signup;