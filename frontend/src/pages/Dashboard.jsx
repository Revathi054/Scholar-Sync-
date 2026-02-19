import React, { Component } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import "./Dashboard.css";

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      matches: [],
      requests: [],
      connections: [], // Add connections
      recentActivity: [], // Add activity
      loading: true,
      error: "",
    };
  }

  async componentDidMount() {
    this.fetchData();
  }

  async fetchData() {
    try {
      // Fetch current user
      const userRes = await API.get("/users/me");

      // Fetch skill matches
      const matchesRes = await API.get("/users/me/matches");

      // Fetch requests
      const requestsRes = await API.get("/requests");

      this.setState({
        user: userRes.data,
        matches: matchesRes.data,
        requests: requestsRes.data,
        loading: false,
      });
    } catch (err) {
      this.setState({
        error: err.response?.data?.message,
        loading: false,
      });
    }
  }

  // Add or update user skills
  handleUpdateSkills = async (type) => {
    try {
      const newSkill = prompt(
        `Enter a ${type === "offered" ? "skill you offer" : "skill you want"}`
      );
      if (!newSkill) return;

      const updatedUser = {
        ...this.state.user,
        [type === "offered" ? "skillsOffered" : "skillsRequired"]: [
          ...(this.state.user[
            type === "offered" ? "skillsOffered" : "skillsRequired"
          ] || []),
          newSkill,
        ],
      };
      await API.put(`/users/${this.state.user._id}`, updatedUser);

      this.setState({ user: updatedUser });
    } catch (err) {
      alert("Failed to update skills");
    }
  };
  handleUpdateResearchInterests = async () => {
    try {
      const newInterest = prompt("Enter a research interest");
      if (!newInterest) return;

      const updatedUser = {
        ...this.state.user,
        researchInterests: [
          ...(this.state.user.researchInterests || []),
          newInterest,
        ],
      };
      await API.put(`/users/${this.state.user._id}`, updatedUser);

      this.setState({ user: updatedUser });
    } catch (err) {
      alert("Failed to update research interests");
    }
  };


 handleAddPublication = async () => {
  try {
    const newPub = window.prompt(
      "Enter your publication (title / description):"
    );

    if (!newPub || !newPub.trim()) return;

    const updatedUser = {
      ...this.state.user,
      publications: [
        ...(this.state.user.publications || []),
        newPub.trim(), // ✅ store as plain text
      ],
    };

    await API.put(
      `/users/${this.state.user._id}`,
      { publications: updatedUser.publications }, // ✅ send ONLY required field
      {} // Token is now sent automatically via HTTP-only cookie
    );

    this.setState({ user: updatedUser });
  } catch (err) {
    console.error(err);
    alert("Failed to add publication");
  }
};
handleUpdateRequestStatus = async (requestId, status) => {
    try {
      await API.put(`/requests/${requestId}`, { status });
      const updatedRequests = this.state.requests.map((r) =>
        r._id === requestId ? { ...r, status } : r
      );
      this.setState({ requests: updatedRequests });
    } catch (err) {
      alert("Failed to update request status");
    }
  };

  handleSendInvite = async (userId) => {
    try {
      // For now, just show a message. In a real app, you'd send an invitation
      alert("Invitation sent! (Feature coming soon)");
    } catch (err) {
      alert("Failed to send invitation");
    }
  };

  render() {
    const { user, matches, requests, loading, error } = this.state;

    if (loading) {
      return <div className="loader">Loading dashboard...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

    return (
      <div className="dashboard-container">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div>
            <h2>Welcome back, {user?.name}!</h2>
            <p>Explore collaborations, share knowledge, and advance your research.</p>
          </div>
          <div className="quick-actions">
            {/* <Link to="/feed" className="find-matches-btn">Academic Feed</Link> */}
            <Link to="/connections" className="btn-secondary">Connections</Link>
            <Link to="/messages" className="btn-secondary">Messages</Link>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="card profile-overview">
          <h3>Your Academic Profile</h3>
          <div className="profile-info">
            {/* <div className="profile-pic">
              <img src={user?.profilePicture || "/default-avatar.png"} alt="Profile" /> {/* Use user.profilePicture */}
           
            <div className="profile-details">
              <p><strong>Institution:</strong> {user?.institution || "Not specified"}</p>
              <p><strong>Degree:</strong> {user?.degree || "Not specified"}</p>
              <p><strong>Field:</strong> {user?.fieldOfStudy || "Not specified"}</p>
              <p><strong>Bio:</strong> {user?.bio || "No bio yet"}</p>
            </div>
          </div>
          <Link to="/profile" className="view-btn">View Full Profile</Link>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-content">
          {/* Skills You Offer */}
          <div className="card">
            <h3>Skills You Offer</h3>
            <div className="skills">
              {user?.skillsOffered?.length > 0 ? (
                user.skillsOffered.map((s, i) => <span key={i}>{s}</span>)
              ) : (
                <div className="empty-state">
                  <p>No offered skills yet</p>
                </div>
              )}
            </div>
            <button
              className="view-btn"
              onClick={() => this.handleUpdateSkills("offered")}
            >
              Manage Skills
            </button>
          </div>

          {/* Research Interests */}
          <div className="card">
            <h3>Research Interests</h3>
            <div className="skills blue">
              {user?.researchInterests?.length > 0 ? (
                user.researchInterests.map((s, i) => <span key={i}>{s}</span>)
              ) : (
                <div className="empty-state">
                  <p>No research interests specified</p>
                </div>
              )}
            </div>
            <button
              className="view-btn"
              onClick={() => this.handleUpdateResearchInterests()}
            >
              Update Interests
            </button>
          </div>
        </div>

        {/* Recommended Matches */}
        <div className="card matches-section">
          <h3>Recommended Study Partners</h3>
          {matches.length > 0 ? (
            <ul className="matches-list">
              {matches.map((m) => (
                <li key={m._id}>
                  <div className="match-name">{m.name}</div>
                  <div className="match-details">
                    <p><strong>Institution:</strong> {m.institution || "Not specified"}</p>
                    <p><strong>Field:</strong> {m.fieldOfStudy || "Not specified"}</p>
                    {/* <p><strong>Compatibility:</strong> {Math.round(m.compatibilityScore * 100)}%</p> */}
                    {/* {m.overallScore && <p><strong>Overall Match:</strong> {Math.round(m.overallScore)}%</p>} */}
                  </div>
                  <div className="match-actions">
                    <Link to={`/profile/${m._id}`} className="view-btn">View Profile</Link>
                    <Link to={`/chat/${m._id}`} className="message-btn">Message</Link>
                    <button className="invite-btn" onClick={() => this.handleSendInvite(m._id)}>
                      Send Invite
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <p>No study partners found yet. Complete your profile to get better matches!</p>
            </div>
          )}
        </div>

        {/* Publications */}
       <div className="card publications-section">
  <h3>Your Publications</h3>

  {user?.publications?.length > 0 ? (
    <ul className="publications-list">
      {user.publications.map((pub, i) => (
        <li key={i} className="publication-item">
          {pub}
        </li>
      ))}
    </ul>
  ) : (
    <div className="empty-state">
      <p>No publications listed yet</p>
    </div>
  )}

  <button
    className="view-btn"
    onClick={this.handleAddPublication}
  >
    Add Publication
  </button>
</div>


        {/* Recent Requests */}
        <div className="card requests-section">
          <h3>Recent Collaboration Requests</h3>
          {requests.length > 0 ? (
            <ul className="requests-list">
              {requests.map((r) => (
                <li key={r._id}>
                  <div className="request-info">
                    <div className="request-participants">
                      {r.sender?.name} → {r.receiver?.name}
                    </div>
                    <div className="request-skills">
                      {r.skillOffered} ↔ {r.skillRequired}
                    </div>
                  </div>
                  <div className={`request-status ${r.status}`}>
                    {r.status}
                  </div>
                  {user && r.receiver?._id === user._id && r.status === "pending" && (
                    <span style={{ marginLeft: 12 }}>
                      <button className="view-btn" onClick={() => this.handleUpdateRequestStatus(r._id, "accepted")}>
                        Accept
                      </button>
                      <button className="view-btn" style={{ marginLeft: 8 }} onClick={() => this.handleUpdateRequestStatus(r._id, "rejected")}>
                        Reject
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <p>No recent requests</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default Dashboard;
