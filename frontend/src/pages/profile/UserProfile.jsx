import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from "react-bootstrap";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import api from "../../services/api";
import "../../css/profile/profile.css";
import "../../css/admin/admin-dashboard.css";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone_number: "",
    position: "",
  });
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Load user profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/profile");
      const data = res.data;
      setUser(data);

      const info = data.info || {};
      setForm({
        first_name: info.first_name || "",
        middle_name: info.middle_name || "",
        last_name: info.last_name || "",
        phone_number: info.phone_number || "",
        position: info.position || "",
      });

      setPreview(data.avatar || data.info?.profile_picture || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });
  const togglePasswordVisibility = (field) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and +
    const filteredValue = value.replace(/[^0-9+]/g, '');
    setForm({ ...form, phone_number: filteredValue });
  };
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  // Update profile info
  const updateProfile = async () => {
    setError("");
    setSuccess("");
    try {
      await api.put("/profile", form);
      setSuccess("Profile updated successfully.");
      loadProfile(); // refresh
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update profile.");
    }
  };

  // Update password
  const updatePassword = async () => {
    setError("");
    setSuccess("");

    // Frontend validation
    if (!passwords.current_password) {
      return setError("Current password is required.");
    }

    if (!passwords.new_password) {
      return setError("New password is required.");
    }

    if (passwords.new_password.length < 8) {
      return setError("New password must be at least 8 characters long.");
    }

    if (passwords.new_password !== passwords.confirm_password) {
      return setError("Passwords do not match.");
    }

    try {
      await api.put("/profile/password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
        new_password_confirmation: passwords.confirm_password,
      });
      setSuccess("Password updated successfully.");
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      console.error(err);
      // Handle different error response formats
      const errorMessage = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        (err.response?.data?.errors && Object.values(err.response.data.errors).flat().join(", ")) ||
        "Password update failed.";
      setError(errorMessage);
    }
  };

  // Upload avatar
  const uploadAvatar = async () => {
    if (!avatar) return;

    const fd = new FormData();
    fd.append("avatar", avatar);

    try {
      const response = await api.post("/profile/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Avatar updated successfully.");
      setAvatar(null);
      // Update preview with the new profile picture URL from response
      if (response.data.profile_picture || response.data.avatar) {
        setPreview(response.data.profile_picture || response.data.avatar);
      }
      loadProfile();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Avatar upload failed.");
    }
  };

  if (loading)
    return (
      <div className="user-dashboard-container">
        <Container>
          <div className="profile-loading">
            <Spinner animation="border" />
            <p>Loading profile...</p>
          </div>
        </Container>
      </div>
    );

  if (!user)
    return (
      <div className="user-dashboard-container">
        <Container>
          <Alert variant="danger">
            Failed to load profile.
          </Alert>
        </Container>
      </div>
    );

  const fullName = user.info 
    ? `${user.info.first_name || ""} ${user.info.middle_name || ""} ${user.info.last_name || ""}`.trim() || user.email
    : user.email;

  return (
    <div className="user-dashboard-container">
    <Container>
      {/* Page Header */}
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">My Profile</h2>
          <p className="dashboard-subtitle">Manage your account settings and preferences</p>
        </Col>
      </Row>

      {/* Alert Messages */}
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        {/* 1. Profile Picture Card */}
        <Col lg={4} className="mb-4">
          <Card className="profile-card">
            <Card.Header>
              <h5>
                <i className="bi bi-image"></i>
                Profile Picture
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="avatar-section">
                <div className="avatar-wrapper">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Profile Avatar"
                      className="profile-avatar"
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      <i className="bi bi-person-fill"></i>
                    </div>
                  )}
                </div>
                <div className="avatar-upload-wrapper">
                  <Form.Control 
                    type="file" 
                    onChange={handleAvatarChange} 
                    accept="image/*"
                  />
                  <Button 
                    variant="primary" 
                    onClick={uploadAvatar}
                    disabled={!avatar}
                  >
                    <i className="bi bi-upload me-2"></i>
                    Upload Avatar
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* 2. Profile Information Card */}
        <Col lg={8} className="mb-4">
          <Card className="profile-card">
            <Card.Header>
              <h5>
                <i className="bi bi-person-circle"></i>
                Profile Information
              </h5>
            </Card.Header>
            <Card.Body>
              <Form className="profile-form">
                <Row>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>First Name</Form.Label>
                      <Form.Control 
                        name="first_name" 
                        value={form.first_name} 
                        onChange={handleFormChange}
                        placeholder="Enter first name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Middle Name</Form.Label>
                      <Form.Control 
                        name="middle_name" 
                        value={form.middle_name} 
                        onChange={handleFormChange}
                        placeholder="Enter middle name"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control 
                        name="last_name" 
                        value={form.last_name} 
                        onChange={handleFormChange}
                        placeholder="Enter last name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control 
                        type="tel"
                        name="phone_number" 
                        value={form.phone_number} 
                        onChange={handlePhoneChange}
                        placeholder="Enter phone number (e.g., +1234567890)"
                        pattern="[0-9+]*"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Position</Form.Label>
                      <Form.Control 
                        name="position" 
                        value={form.position} 
                        onChange={handleFormChange}
                        placeholder="Enter position"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Button variant="success" onClick={updateProfile}>
                  <i className="bi bi-check-circle me-2"></i>
                  Save Profile
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* 3. Account Information Card */}
        <Col lg={4} className="mb-4">
          <Card className="profile-card">
            <Card.Header>
              <h5>
                <i className="bi bi-info-circle"></i>
                Account Information
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="user-info-section">
                <div className="user-info-item">
                  <div className="user-info-label">Email</div>
                  <div className="user-info-value">{user.email}</div>
                </div>
                <div className="user-info-item">
                  <div className="user-info-label">Role</div>
                  <div className="user-info-value">
                    <Badge className="badge-sm" style={{ 
                      backgroundColor: '#f97316', 
                      color: '#ffffff'
                    }}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
                {user.department && (
                  <div className="user-info-item">
                    <div className="user-info-label">Department</div>
                    <div className="user-info-value">{user.department}</div>
                  </div>
                )}
                {user.access_level && (
                  <div className="user-info-item">
                    <div className="user-info-label">Access Level</div>
                    <div className="user-info-value">{user.access_level}</div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* 4. Change Password Card */}
        <Col lg={8} className="mb-4">
          <Card className="profile-card">
            <Card.Header>
              <h5>
                <i className="bi bi-shield-lock"></i>
                Change Password
              </h5>
            </Card.Header>
            <Card.Body className="password-card">
              <Form className="password-form">
                <Form.Group>
                  <Form.Label>Current Password</Form.Label>
                  <div className="password-wrapper">
                    <Form.Control
                      type={showPasswords.current ? "text" : "password"}
                      name="current_password"
                      placeholder="Enter current password"
                      value={passwords.current_password}
                      onChange={handlePasswordChange}
                    />
                    {passwords.current_password && (
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => togglePasswordVisibility("current")}
                      >
                        {showPasswords.current ? <BsEyeSlash /> : <BsEye />}
                      </button>
                    )}
                  </div>
                </Form.Group>
                <Form.Group>
                  <Form.Label>New Password</Form.Label>
                  <div className="password-wrapper">
                    <Form.Control
                      type={showPasswords.new ? "text" : "password"}
                      name="new_password"
                      placeholder="Enter new password"
                      value={passwords.new_password}
                      onChange={handlePasswordChange}
                    />
                    {passwords.new_password && (
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => togglePasswordVisibility("new")}
                      >
                        {showPasswords.new ? <BsEyeSlash /> : <BsEye />}
                      </button>
                    )}
                  </div>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Confirm New Password</Form.Label>
                  <div className="password-wrapper">
                    <Form.Control
                      type={showPasswords.confirm ? "text" : "password"}
                      name="confirm_password"
                      placeholder="Confirm new password"
                      value={passwords.confirm_password}
                      onChange={handlePasswordChange}
                    />
                    {passwords.confirm_password && (
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => togglePasswordVisibility("confirm")}
                      >
                        {showPasswords.confirm ? <BsEyeSlash /> : <BsEye />}
                      </button>
                    )}
                  </div>
                </Form.Group>
                <Button variant="warning" onClick={updatePassword}>
                  <i className="bi bi-key me-2"></i>
                  Update Password
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
    </div>
  );
};

export default Profile;
