import React, { Component } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import './CompleteProfile.css'

class CompleteProfile extends Component {
  state = {
    phone: "",
    bio: "",
    institution: "",
    degree: "",
    fieldOfStudy: "",
    graduationYear: "",
    researchInterests: "",
    publications: "",
    learningPreferences: "",
    subjectStrengths: "",
    academicGoals: "",
    studyHabits: "",
    availability: {
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
      sunday: ""
    },
    error: "",
    loading: false
  };

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ loading: true });
    try {
      const userId = localStorage.getItem("userId");
      const data = {
        phone: this.state.phone,
        bio: this.state.bio,
        institution: this.state.institution,
        degree: this.state.degree,
        fieldOfStudy: this.state.fieldOfStudy,
        graduationYear: this.state.graduationYear ? parseInt(this.state.graduationYear) : null,
        researchInterests: this.state.researchInterests.split(",").map(s => s.trim()).filter(s => s),
        publications: this.state.publications.split(",").map(s => s.trim()).filter(s => s),
        learningPreferences: this.state.learningPreferences.split(",").map(s => s.trim()).filter(s => s),
        subjectStrengths: this.state.subjectStrengths.split(",").map(s => s.trim()).filter(s => s),
        academicGoals: this.state.academicGoals.split(",").map(s => s.trim()).filter(s => s),
        studyHabits: this.state.studyHabits.split(",").map(s => s.trim()).filter(s => s),
        availability: Object.fromEntries(
          Object.entries(this.state.availability).filter(([_, v]) => v.trim())
        ),
        profileCompleted: true
      };
      await API.put(`/users/${userId}`, data);
      window.location.href = "/dashboard";
    } catch (err) {
      this.setState({ error: err.response?.data?.message || "Failed to update profile", loading: false });
    }
  };

  render() {
    return (
      <div className="auth-container">
        <div className="auth-card profile-card">
          <h2>Complete Your Profile</h2>
          {this.state.error && <p style={{ color: "red" }}>{this.state.error}</p>}
          <form onSubmit={this.handleSubmit}>
            <h3>Personal Details</h3>
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              value={this.state.phone}
              onChange={this.handleChange}
            /><br/>
            <textarea
              name="bio"
              placeholder="Bio"
              value={this.state.bio}
              onChange={this.handleChange}
              rows="3"
            /><br/>

            <h3>Educational Details</h3>
            <input
              type="text"
              name="institution"
              placeholder="Institution"
              value={this.state.institution}
              onChange={this.handleChange}
            /><br/>
            <input
              type="text"
              name="degree"
              placeholder="Degree (e.g., Bachelor's, Master's)"
              value={this.state.degree}
              onChange={this.handleChange}
            /><br/>
            <input
              type="text"
              name="fieldOfStudy"
              placeholder="Field of Study"
              value={this.state.fieldOfStudy}
              onChange={this.handleChange}
            /><br/>
            <input
              type="number"
              name="graduationYear"
              placeholder="Graduation Year"
              value={this.state.graduationYear}
              onChange={this.handleChange}
            /><br/>
            <input
              type="text"
              name="researchInterests"
              placeholder="Research Interests (comma separated)"
              value={this.state.researchInterests}
              onChange={this.handleChange}
            /><br/>
            <input
              type="text"
              name="publications"
              placeholder="Publications (comma separated URLs or titles)"
              value={this.state.publications}
              onChange={this.handleChange}
            /><br/>

            <h3>Learning Profile</h3>
            <input
              type="text"
              name="learningPreferences"
              placeholder="Learning Preferences (comma separated: visual, auditory, kinesthetic, etc.)"
              value={this.state.learningPreferences}
              onChange={this.handleChange}
            /><br/>
            <input
              type="text"
              name="subjectStrengths"
              placeholder="Subject Strengths (comma separated)"
              value={this.state.subjectStrengths}
              onChange={this.handleChange}
            /><br/>
            <input
              type="text"
              name="academicGoals"
              placeholder="Academic Goals (comma separated)"
              value={this.state.academicGoals}
              onChange={this.handleChange}
            /><br/>
            <input
              type="text"
              name="studyHabits"
              placeholder="Study Habits (comma separated: morning person, group study, etc.)"
              value={this.state.studyHabits}
              onChange={this.handleChange}
            /><br/>

            <h3>Availability</h3>
            {Object.keys(this.state.availability).map(day => (
              <div key={day}>
                <label>{day.charAt(0).toUpperCase() + day.slice(1)}:</label>
                <input
                  type="text"
                  placeholder="e.g., 9-11, 2-4"
                  value={this.state.availability[day]}
                  onChange={(e) => this.setState({
                    availability: {
                      ...this.state.availability,
                      [day]: e.target.value
                    }
                  })}
                /><br/>
              </div>
            ))}
            <button type="submit" className="btn" disabled={this.state.loading}>
              {this.state.loading ? "Saving..." : "Complete Profile"}
            </button>
          </form>
          <p className="switch"> 
            <Link to="/dashboard">Skip for now</Link>
          </p>
        </div>
      </div>
    );
  }
}

export default CompleteProfile;