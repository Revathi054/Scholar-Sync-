import React, { Component } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import "./Connections.css";

class Connections extends Component {
  state = {
    connections: [],
    pendingRequests: [],
    suggestedConnections: [],
    groups: [],
    loading: true,
    error: "",
  };

  async componentDidMount() {
    this.fetchConnections();
  }

  async fetchConnections() {
    try {
      // For now, we'll simulate connections. In a real app, you'd have endpoints for this.
      const usersRes = await API.get("/users");
      const currentUser = await API.get("/users/me");

      const allUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      const currentUserId = currentUser.data?._id;
      const myGroups = currentUser.data?.groups || [];

      // Mock connections - in reality, you'd have a connections model
      const connections = allUsers.filter(u => u?._id && u._id !== currentUserId).slice(0, 5);
      const suggested = allUsers.filter(u => u?._id && u._id !== currentUserId).slice(5, 10);

      this.setState({
        connections,
        suggestedConnections: suggested,
        groups: myGroups,
        loading: false,
      });
    } catch (err) {
      this.setState({
        error: err.response?.data?.message || "Failed to load connections",
        loading: false,
      });
    }
  }

  handleConnect = async (userId) => {
    // Mock connect - in reality, send connection request
    alert("Connection request sent!");
  };

  render() {
    const { connections, suggestedConnections, groups, loading, error } = this.state;

    if (loading) {
      return <div className="loader">Loading connections...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    return (
      <div className="connections-container">
        <h1>Your Academic Network</h1>

        {/* Current Connections */}
        <div className="section">
          <h2>Connections ({connections.length})</h2>
          {connections.length > 0 ? (
            <div className="connections-grid">
              {connections.map((user) => (
                <div key={user._id} className="connection-card">
                  <div className="avatar">{user.name?.charAt(0) || "U"}</div>
                  <h3>{user.name || "User"}</h3>
                  <p>{user.institution || "Institution not specified"}</p>
                  <p>{user.fieldOfStudy || "Field not specified"}</p>
                  <div className="actions">
                    <Link to={`/profile/${user._id}`} className="view-btn">View Profile</Link>
                    <Link to={`/chat/${user._id}`} className="message-btn">Message</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No connections yet. Start connecting with fellow academics!</p>
          )}
        </div>

        {/* My Groups Section
        <div className="section">
          <h2>My Groups</h2>
          {groups && groups.length > 0 ? (
            <div className="connections-grid">
              {groups.map((group) => (
                <div key={group._id} className="connection-card">
                  <div className="avatar">{group.name?.charAt(0) || "G"}</div>
                  <h3>{group.name}</h3>
                  <div className="actions">
                    <Link to={`/groups/${group._id}`} className="message-btn">View Group</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>You haven't joined any groups yet.</p>
          )}
        </div> */}

        {/* Suggested Connections */}
        <div className="section">
          <h2>Suggested Connections</h2>
          <div className="connections-grid">
            {suggestedConnections.map((user) => (
              <div key={user._id} className="connection-card suggested">
                <div className="avatar">{user.name?.charAt(0) || "U"}</div>
                <h3>{user.name || "User"}</h3>
                <p>{user.institution || "Institution not specified"}</p>
                <p>{user.fieldOfStudy || "Field not specified"}</p>
                <button
                  className="connect-btn"
                  onClick={() => this.handleConnect(user._id)}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default Connections;