import React, { Component } from "react";
import API from "../api";
import { FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { Link } from "react-router-dom";
import "./skillMatch.css";

class SkillMatch extends Component {
  state = {
    matches: [],
    searchText: "",
    locationFilter: "all",
    skillFilter: "all",
    loading: false,
    error: null,
  };

  componentDidMount() {
    this.handleFindMatches();
  }

  handleSearchChange = (e) => {
    this.setState({ searchText: e.target.value });
  };

  handleLocationChange = (e) => {
    this.setState({ locationFilter: e.target.value });
  };

  handleSkillChange = (e) => {
    this.setState({ skillFilter: e.target.value });
  };

  handleFindMatches = async () => {
    try {
      this.setState({ loading: true, error: null });
      const res = await API.get("/users/me/matches");
      const sorted = [...res.data].sort((a, b) => (b.score || 0) - (a.score || 0));
      this.setState({ matches: sorted, loading: false });
    } catch (err) {
      console.error("Error fetching matches:", err);
      this.setState({ error: "Failed to fetch matches", loading: false });
    }
  };

  handleSendRequest = async (user) => {
    try {
      const teachable = (user.requiredMatch || []); // what you can teach them
      const learnable = (user.offeredMatch || []); // what they can teach you

      if (learnable.length === 0) {
        alert("No compatible skills to request.");
        return;
      }

      const skillRequired = window.prompt(
        `Pick what you want to learn from ${user.name}:`,
        learnable[0] || ""
      );
      if (!skillRequired) return;

      let skillOffered = teachable[0] || "";
      if (teachable.length > 0) {
        const chosen = window.prompt(
          `Pick what you can teach ${user.name} (optional):`,
          skillOffered
        );
        skillOffered = chosen || skillOffered;
      }

      const payload = {
        receiver: user._id,
        skillOffered: skillOffered || "General Guidance",
        skillRequired,
      };

      await API.post("/requests", payload);
      alert("Request sent!");
    } catch (err) {
      console.error("Failed to send request", err);
      alert(err.response?.data?.message || "Failed to send request");
    }
  };

  render() {
    const { matches, searchText, locationFilter, skillFilter, loading, error } =
      this.state;

    // Filtering logic
    let filteredMatches = matches.filter((user) => {
      const q = searchText.toLowerCase();
      const matchesSearch =
        user.name?.toLowerCase().includes(q) ||
        (user.offeredMatch || []).some((s) => s.toLowerCase().includes(q)) ||
        (user.requiredMatch || []).some((s) => s.toLowerCase().includes(q));

      const matchesLocation =
        locationFilter === "all" ||
        user.location?.toLowerCase().includes(locationFilter.toLowerCase());

      const matchesSkill =
        skillFilter === "all" ||
        (user.offeredMatch || []).some((s) =>
          s.toLowerCase().includes(skillFilter.toLowerCase())
        ) ||
        (user.requiredMatch || []).some((s) =>
          s.toLowerCase().includes(skillFilter.toLowerCase())
        );

      return matchesSearch && matchesLocation && matchesSkill;
    });

    return (
      <div className="skillmatch-container">
        <h1 className="page-title">Find Your Perfect Skill Match</h1>
        <p className="subtitle">
          Connect with others who can teach you new skills while learning from
          your expertise
        </p>

        {/* Filters */}
        <div className="filters">
          <input
            type="text"
            placeholder="Search by name or skills..."
            value={searchText}
            onChange={this.handleSearchChange}
          />
          <select value={locationFilter} onChange={this.handleLocationChange}>
            <option value="all">All Locations</option>
            <option value="hyd">Hyderabad</option>
            <option value="bangalore">Bangalore</option>
            <option value="vjy">Vijayawada</option>
            <option value="vizag">Vizag</option>
            <option value="gurgaon">Gurgaon</option>
            <option value="us">US</option>
          </select>
          <select value={skillFilter} onChange={this.handleSkillChange}>
            <option value="all">All Skills</option>
            <option value="ui/ux design">UI/UX Design</option>
            <option value="aws">AWS</option>
            <option value="cloud architecture">Cloud Architecture</option>
            <option value="devops">DevOps</option>
            <option value="product management">Product Management</option>
            <option value="python">Python</option>
            <option value="data analysis">Data Analysis</option>
            <option value="machine learning">Machine Learning</option>
            <option value="react">React</option>
          </select>
        </div>

        {/* Results */}
        {loading && <p className="loading">Loading matches...</p>}
        {error && <p className="error">{error}</p>}

        <h3 className="matches-count">{filteredMatches.length} matches found</h3>

        <div className="matches-grid">
          {filteredMatches.length === 0 ? (
            <p>No matches found</p>
          ) : (
            filteredMatches.map((user, idx) => (
              <div key={idx} className="match-card">
                <div className="user-info">
                  <div className="user-style">
                    <div className="avatar">{user.name?.[0] || "U"}</div>
                    <div>
                      <h4>{user.name}</h4>
                      <p className="location">
                        <FaMapMarkerAlt style={{ marginRight: 4 }} />
                        {user.location || "Unknown"}
                      </p>
                    </div>
                  </div>
                  {/* <span className="score">
                    <FaStar style={{ marginRight: 4 }} />
                    {user.score || 0}% <small>match</small>
                  </span> */}
                </div>

                <div className="skills-section">
                  {user.offeredMatch?.length > 0 && (
                    <div>
                      <p className="label">Can teach you:</p>
                      <div className="skill-tags">
                        {user.offeredMatch.map((s, i) => (
                          <span key={i}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {user.requiredMatch?.length > 0 && (
                    <div>
                      <p className="label">You can teach:</p>
                      <div className="skill-tags blue">
                        {user.requiredMatch.map((s, i) => (
                          <span key={i}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="actions">
                  <Link to={`/profile/${user._id}`} className="btn">View Profile</Link>
                  <Link to={`/chat/${user._id}`} className="btn chat-btn">💬 Chat</Link>
                  <button className="btn secondary" onClick={() => this.handleSendRequest(user)}>Send Request</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
}

export default SkillMatch;
