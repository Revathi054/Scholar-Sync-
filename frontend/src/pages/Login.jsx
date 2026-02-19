import React, { Component } from "react";
import API from "../api";
import socketService from "../services/socketService";
import './Login.css'

class Login extends Component {
  state = {
    email: "",
    password: "",
    error: "",
    loading: false
  };

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    try {
      this.setState({ loading: true, error: "" });
      const res = await API.post("/users/login", {
        email: this.state.email,
        password: this.state.password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.name);
      localStorage.setItem("userId", res.data._id);
      
      // Initialize socket connection after successful login
      socketService.connect(res.data.token);
      
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error, error?.response?.data);
      // Prefer server message, else show network/error.message
      const serverMsg = error?.response?.data?.message;
      const fallback = error?.message || "Network or server error";
      this.setState({ error: serverMsg || fallback });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    return (
      <div className="page-container">
      <div className="login-card">
        <h2>Login</h2>
        {this.state.error && <p style={{ color: "red" }}>{this.state.error}</p>}
        <form onSubmit={this.handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={this.state.email}
            onChange={this.handleChange}
          /><br/>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={this.state.password}
            onChange={this.handleChange}
          /><br/>
          <button type="submit" disabled={this.state.loading}>{this.state.loading ? 'Logging in...' : 'Login'}</button>
        </form>
        </div>
      </div>
    );
  }
}

export default Login;
