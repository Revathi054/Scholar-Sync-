import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaUsers, FaUser, FaComments, FaRss, FaUserFriends } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import API from "../api";
import socketService from "../services/socketService";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [username, setUsername] = useState("User");
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const isLoggedIn = Boolean(token);

  const handleLogout = () => {
    if (socketService && typeof socketService.disconnect === "function") {
      socketService.disconnect();
    }

    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("userId");
    setToken(null);
    navigate("/login");
  };

  useEffect(() => {
    setToken(localStorage.getItem("token"));

    const fetchUserData = async () => {
      if (localStorage.getItem("token")) {
        try {
          const response = await API.get("/users/me");
          setUsername(
            response.data?.name || localStorage.getItem("name") || "User"
          );

          if (socketService && !socketService.getConnectionStatus()) {
            socketService.connect(localStorage.getItem("token"));
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          setUsername(localStorage.getItem("name") || "User");
        }
      } else {
        setUsername("User");
        if (socketService && typeof socketService.disconnect === "function") {
          socketService.disconnect();
        }
      }
    };

    fetchUserData();
  }, [isLoggedIn]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") setToken(e.newValue);
      if (e.key === "name") setUsername(e.newValue || "User");
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <nav className="navbar">
      {/* Left: Brand */}
      <div className="navbar-left">
        <Link to="/" className="logo">
          Scholar<span>Sync</span>
        </Link>
      </div>

      {/* Center: ONLY when logged in */}
      {isLoggedIn && (
        <div className="navbar-center">
          <Link
            to="/dashboard"
            className={`nav-link ${
              location.pathname === "/dashboard" ? "active" : ""
            }`}
          >
            <FaHome className="nav-icon" />
            Dashboard
          </Link>

          

          <Link
            to="/connections"
            className={`nav-link ${
              location.pathname === "/connections" ? "active" : ""
            }`}
          >
            <FaUserFriends className="nav-icon" />
            Connections
          </Link>

          <Link
            to="/groups"
            className={`nav-link ${
              location.pathname === "/groups" ? "active" : ""
            }`}
          >
            <FaUsers className="nav-icon" />
            Study Groups
          </Link>

          <Link
            to="/match"
            className={`nav-link ${
              location.pathname === "/match" ? "active" : ""
            }`}
          >
            <FaUsers className="nav-icon" />
            Skill Match
          </Link>

          <Link
            to="/messages"
            className={`nav-link ${
              location.pathname === "/messages" ||
              location.pathname.startsWith("/chat")
                ? "active"
                : ""
            }`}
          >
            <FaComments className="nav-icon" />
            Messages
          </Link>

          <Link
            to="/profile"
            className={`nav-link ${
              location.pathname === "/profile" ? "active" : ""
            }`}
          >
            <FaUser className="nav-icon" />
            My Profile
          </Link>
        </div>
      )}

      {/* Right */}
      <div className="navbar-right">
        {!isLoggedIn ? (
          <>
            <Link to="/login" className="nav-link">
              Login
            </Link>
            <Link to="/register" className="signup-btn">
              Signup
            </Link>
          </>
        ) : (
          <>
            <div className="user-info">
              <div className="avatar">
                {username && username.charAt ? username.charAt(0) : "U"}
              </div>
              <span className="username">{username}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FiLogOut className="logout-icon" />
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
