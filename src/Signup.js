/*import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

function Signup() {
  const history = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function submit(e) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!formData.email.endsWith("law.ac.in")) {
      alert("Only college email addresses (law.ac.in) are allowed!");
      return;
    }

    try {
      const res = await axios.post("http://localhost:8000/signup", formData);

      if (res.data === "exist") {
        alert("User already exists");
      } else if (res.data === "notexist") {
        history("/home", { state: { name: formData.fullName } });
      }
    } catch (e) {
      alert("Error saving data. Please try again!");
      console.log(e);
    }
  }

  return (
    <div style={{
      backgroundColor: "#f4f6f9",
      fontFamily: "'Segoe UI', sans-serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}>
      <div className="signup-container" style={{
        width: "100%",
        maxWidth: "400px",
        padding: "40px",
        borderRadius: "16px",
        backgroundColor: "#ffffff",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
        textAlign: "center"
      }}>
        <h2 style={{
          marginBottom: "25px",
          fontSize: "1.8rem",
          fontWeight: "600",
          color: "#333"
        }}>
          Signup to RAG
        </h2>
        <form onSubmit={submit}>
          {["fullName", "email", "password", "confirmPassword"].map((field, idx) => (
            <input
              key={idx}
              type={field.includes("password") ? "password" : "text"}
              name={field}
              placeholder={
                field === "fullName" ? "Full Name" :
                field === "email" ? "Email Address" :
                field === "password" ? "Password" :
                "Confirm Password"
              }
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                marginBottom: "16px",
                border: "1px solid #ccc",
                borderRadius: "10px",
                fontSize: "1rem",
                backgroundColor: "#fefefe"
              }}
            />
          ))}
          <button type="submit" style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: "#4a6cf7",
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background-color 0.3s ease"
          }}>
            Sign Up
          </button>
        </form>
        <p style={{ marginTop: "20px", fontSize: "0.9rem", color: "#555" }}>
          Already have an account?{" "}
          <Link to="/login" style={{
            color: "#4a6cf7",
            fontWeight: "bold",
            textDecoration: "none"
          }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;*/
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css"; // Create this file and paste the CSS below

function Signup() {
  const history = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function submit(e) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    /*if (!formData.email.endsWith("law.ac.in")) {
      alert("Only college email addresses (law.ac.in) are allowed!");
      return;
    } */

    try {
      const res = await axios.post(
          "constitution-rag-production.up.railway.app/signup",formData);

      if (res.status === 201 && res.data.message === "Signup successful") {
         history("/home", { state: { name: formData.fullName } });
      }
    } catch (e) {
      alert("Error saving data. Please try again!");
      console.log(e);
    }
  }

  return (
    <div className="container">
      <div className="top"></div>
      <div className="bottom"></div>
      <div className="center">
        <h2>Please Sign Up</h2>
        <form onSubmit={submit} style={{ width: "100%" }}>
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            style={{
              marginTop: "10px",
              padding: "10px",
              width: "100%",
              backgroundColor: "#4a6cf7",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Sign Up
          </button>
        </form>
        <p style={{ marginTop: "10px" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#4a6cf7", textDecoration: "underline" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
