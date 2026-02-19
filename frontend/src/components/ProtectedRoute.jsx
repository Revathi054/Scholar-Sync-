import React, { Component } from "react";
import { Navigate } from "react-router-dom";

class ProtectedRoute extends Component {
  render() {
    const isLoggedIn = localStorage.getItem("token");
    return isLoggedIn ? this.props.children : <Navigate to="/login" />;
  }
}

export default ProtectedRoute;
