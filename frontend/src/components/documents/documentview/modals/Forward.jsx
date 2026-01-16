import React, { useState, useEffect, useMemo, useRef } from "react";
import { Modal, Button, Form, Spinner, Alert, InputGroup, Row, Col } from "react-bootstrap";
import api from "../../../../services/api";

const ForwardModal = ({ show, onHide, document, onForward, user }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // User fetching and filtering
  const [users, setUsers] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [canAccessUserList, setCanAccessUserList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  
  // Ref to maintain input focus
  const searchInputRef = useRef(null);

  // Fetch all departments and initial users when modal opens
  useEffect(() => {
    if (show) {
      if (allDepartments.length === 0) {
        fetchAllDepartments();
      }
      fetchUsers();
    }
  }, [show]);

  // Debounced search - fetch users after user stops typing
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Fetch users when filters change
  useEffect(() => {
    if (!show) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentFilter, roleFilter, statusFilter]);

  // Fetch all departments for the filter dropdown
  const fetchAllDepartments = async () => {
    try {
      // Fetch users without filters to get complete department list
      // Fetch first few pages to get most departments
      const departmentsSet = new Set();
      
      // Fetch first 3 pages to get a good sample of departments
      for (let page = 1; page <= 3; page++) {
        try {
          const res = await api.get("/user/users", { 
            params: { 
              page,
              status: "active",
              sort: "a-z"
            } 
          });
          const users = Array.isArray(res.data) ? res.data : res.data.data || [];
          users.forEach(u => {
            if (u.department) departmentsSet.add(u.department);
          });
          
          // Stop if we've reached the last page
          const lastPage = res.data.last_page || res.data.total_pages || 1;
          if (page >= lastPage) break;
        } catch (err) {
          console.error(`Failed to fetch departments page ${page}`, err);
        }
      }
      
      setAllDepartments(Array.from(departmentsSet).sort());
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const params = {
        page: 1,
        sort: "a-z"
      };
      
      // Only add search if it has a value (not empty or just whitespace)
      const trimmedSearch = searchQuery?.trim();
      if (trimmedSearch && trimmedSearch.length > 0) {
        params.search = trimmedSearch;
      }
      
      // Only add filters if they're not "all"
      if (departmentFilter !== "all") {
        params.department = departmentFilter;
      }
      
      if (roleFilter !== "all") {
        params.role = roleFilter;
      }
      
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      
      const res = await api.get("/user/users", { params });
      const fetchedUsers = Array.isArray(res.data) ? res.data : res.data.data || [];
      
      // Format users with name
      const formattedUsers = fetchedUsers.map(user => ({
        ...user,
        name: user.info 
          ? `${user.info.first_name || ""} ${user.info.last_name || ""}`.trim()
          : user.email
      }));
      
      setUsers(formattedUsers);
      setCanAccessUserList(true);
    } catch (err) {
      console.error("Failed to fetch users", err);
      console.error("Error details:", err.response?.data);
      
      if (err.response?.status === 403) {
        setCanAccessUserList(false);
        setUsers([]);
        setError("You don't have permission to access the user list.");
      } else if (err.response?.status === 401) {
        setCanAccessUserList(false);
        setUsers([]);
        setError("Please log in again.");
      } else {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to load users. Please try again.";
        setError(errorMessage);
        setCanAccessUserList(false);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!show) {
      setSelectedUser(null);
      setMessage("");
      setError(null);
      setSubmitting(false);
      setSearchQuery("");
      setDepartmentFilter("all");
      setRoleFilter("all");
      setStatusFilter("active");
      setCanAccessUserList(true);
    }
  }, [show]);

  const handleSubmit = async () => {
    if (!selectedUser) {
      setError("Please select a recipient.");
      return;
    }

    if (!document?.id) {
      setError("Document not loaded.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onForward({ 
        document_id: document.id, 
        email: selectedUser.email, 
        message: message.trim() 
      });
      setSelectedUser(null);
      setMessage("");
      onHide();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to forward document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Forward Document</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Select Recipient</Form.Label>
            
            {canAccessUserList ? (
              <>
                {/* Search Input */}
                <InputGroup className="mb-2">
                  <Form.Control
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery || ""}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or department..."
                    disabled={submitting}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearchQuery("")}
                    style={{ 
                      visibility: searchQuery ? 'visible' : 'hidden',
                      minWidth: searchQuery ? 'auto' : '0',
                      padding: searchQuery ? undefined : '0',
                      border: searchQuery ? undefined : 'none'
                    }}
                  >
                    Clear
                  </Button>
                </InputGroup>

                {/* Filters */}
                <Row className="g-2 mb-3">
                  <Col md={6}>
                    <Form.Select
                      value={departmentFilter}
                      onChange={e => setDepartmentFilter(e.target.value)}
                      disabled={submitting || loadingUsers}
                    >
                      <option value="all">All Departments</option>
                      {allDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={6}>
                    <Form.Select
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
                      disabled={submitting || loadingUsers}
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="user">User</option>
                    </Form.Select>
                  </Col>
                </Row>

                {/* User List */}
                <div 
                  style={{ 
                    maxHeight: "300px", 
                    overflowY: "auto", 
                    border: "1px solid #dee2e6", 
                    borderRadius: "0.375rem",
                    padding: "0.5rem"
                  }}
                >
                  {loadingUsers ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" /> Loading users...
                    </div>
                  ) : users.length > 0 ? (
                    users.map(userItem => (
                      <div
                        key={userItem.id}
                        onClick={() => !submitting && setSelectedUser(userItem)}
                        style={{
                          padding: "0.75rem",
                          marginBottom: "0.5rem",
                          borderRadius: "0.375rem",
                          cursor: submitting ? "not-allowed" : "pointer",
                          backgroundColor: selectedUser?.id === userItem.id ? "#e7f3ff" : "transparent",
                          border: selectedUser?.id === userItem.id ? "2px solid #0d6efd" : "1px solid #dee2e6",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          if (!submitting && selectedUser?.id !== userItem.id) {
                            e.currentTarget.style.backgroundColor = "#f8f9fa";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedUser?.id !== userItem.id) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold">{userItem.name || userItem.email}</div>
                            <div className="small text-muted">
                              {userItem.email}
                              {userItem.department && ` • ${userItem.department}`}
                              {userItem.role && ` • ${userItem.role}`}
                            </div>
                          </div>
                          {selectedUser?.id === userItem.id && (
                            <i className="bi bi-check-circle-fill text-primary"></i>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-people fs-3 mb-2 d-block"></i>
                      No users found
                    </div>
                  )}
                </div>

                {selectedUser && (
                  <div className="mt-2 p-2 bg-light rounded">
                    <small className="text-muted">Selected: </small>
                    <strong>{selectedUser.name || selectedUser.email}</strong>
                    <small className="text-muted d-block">{selectedUser.email}</small>
                  </div>
                )}
              </>
            ) : (
              <Alert variant="warning" className="mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Unable to load user list. Please refresh the page and try again.
              </Alert>
            )}
          </Form.Group>

          <Form.Group>
            <Form.Label>Message (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a message..."
              disabled={submitting}
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={!selectedUser || submitting}
        >
          {submitting ? (
            <>
              <Spinner size="sm" className="me-2" /> Forwarding...
            </>
          ) : (
            "Forward"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ForwardModal;
