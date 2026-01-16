import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert, Badge, Table, Row, Col, Card } from "react-bootstrap";
import api from "../../../../services/api";

const AuditTrailModal = ({ show, onHide, document }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    activity_type: "",
    user_id: "",
    from_date: "",
    to_date: "",
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [expandedActivity, setExpandedActivity] = useState(null);

  useEffect(() => {
    if (show && document?.id) {
      fetchAuditTrail();
    }
  }, [show, document?.id, filters, pagination.current_page]);

  const fetchAuditTrail = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        ),
      });

      const response = await api.get(`/document/${document.id}/audit-trail?${params}`);
      setActivities(response.data.activities || []);
      setPagination(response.data.pagination || pagination);
    } catch (err) {
      console.error("Failed to fetch audit trail:", err);
      setError("Failed to load audit trail. Please try again.");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const getActivityTypeBadge = (type) => {
    const colors = {
      uploaded: "primary",
      viewed: "info",
      downloaded: "secondary",
      acknowledged: "success",
      approved: "success",
      rejected: "danger",
      held: "warning",
      forwarded: "primary",
      sent_back: "warning",
      classified: "info",
      modified: "secondary",
      status_changed: "primary",
      title_updated: "secondary",
      description_updated: "secondary",
      classification_updated: "info",
      deleted: "danger",
      recipient_added: "success",
      recipient_removed: "warning",
      file_added: "success",
      file_deleted: "danger",
    };
    return colors[type] || "secondary";
  };

  const formatActivityType = (type) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpand = (activityId) => {
    setExpandedActivity(expandedActivity === activityId ? null : activityId);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-shield-check me-2"></i>
          Audit Trail - {document?.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-3">
          <Card.Body>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-2">
                  <Form.Label>Activity Type</Form.Label>
                  <Form.Select
                    value={filters.activity_type}
                    onChange={(e) => handleFilterChange("activity_type", e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="uploaded">Uploaded</option>
                    <option value="viewed">Viewed</option>
                    <option value="downloaded">Downloaded</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="held">Held</option>
                    <option value="forwarded">Forwarded</option>
                    <option value="sent_back">Sent Back</option>
                    <option value="classified">Classified</option>
                    <option value="modified">Modified</option>
                    <option value="status_changed">Status Changed</option>
                    <option value="deleted">Deleted</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-2">
                  <Form.Label>From Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.from_date}
                    onChange={(e) => handleFilterChange("from_date", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-2">
                  <Form.Label>To Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.to_date}
                    onChange={(e) => handleFilterChange("to_date", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setFilters({
                      activity_type: "",
                      user_id: "",
                      from_date: "",
                      to_date: "",
                    });
                    setPagination((prev) => ({ ...prev, current_page: 1 }));
                  }}
                  className="w-100"
                >
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Audit Trail Table */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : activities.length === 0 ? (
          <Alert variant="info" className="text-center">
            No audit trail entries found.
          </Alert>
        ) : (
          <>
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th style={{ width: "15%" }}>Date & Time</th>
                    <th style={{ width: "15%" }}>User</th>
                    <th style={{ width: "15%" }}>Activity</th>
                    <th style={{ width: "35%" }}>Details</th>
                    <th style={{ width: "10%" }}>IP Address</th>
                    <th style={{ width: "10%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <React.Fragment key={activity.id}>
                      <tr>
                        <td>
                          <small>{formatDate(activity.created_at)}</small>
                        </td>
                        <td>
                          <div>
                            <strong>{activity.user?.name || activity.user?.email}</strong>
                            <br />
                            <small className="text-muted">{activity.user?.email}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={getActivityTypeBadge(activity.activity_type)}>
                            {formatActivityType(activity.activity_type)}
                          </Badge>
                        </td>
                        <td>
                          <div>{activity.details}</div>
                          {activity.old_value && activity.new_value && (
                            <small className="text-muted">
                              <strong>Changed:</strong> {activity.old_value} → {activity.new_value}
                            </small>
                          )}
                        </td>
                        <td>
                          <small>{activity.ip_address || "N/A"}</small>
                        </td>
                        <td>
                          {(activity.metadata ||
                            activity.old_value ||
                            activity.new_value ||
                            activity.user_agent) && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => toggleExpand(activity.id)}
                            >
                              {expandedActivity === activity.id ? (
                                <i className="bi bi-chevron-up"></i>
                              ) : (
                                <i className="bi bi-chevron-down"></i>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                      {expandedActivity === activity.id && (
                        <tr>
                          <td colSpan={6}>
                            <Card className="bg-light">
                              <Card.Body>
                                <Row>
                                  {activity.old_value && (
                                    <Col md={6}>
                                      <strong>Old Value:</strong>
                                      <pre className="bg-white p-2 rounded mt-1">
                                        {activity.old_value}
                                      </pre>
                                    </Col>
                                  )}
                                  {activity.new_value && (
                                    <Col md={6}>
                                      <strong>New Value:</strong>
                                      <pre className="bg-white p-2 rounded mt-1">
                                        {activity.new_value}
                                      </pre>
                                    </Col>
                                  )}
                                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                    <Col md={12} className="mt-2">
                                      <strong>Metadata:</strong>
                                      <pre className="bg-white p-2 rounded mt-1">
                                        {JSON.stringify(activity.metadata, null, 2)}
                                      </pre>
                                    </Col>
                                  )}
                                  {activity.user_agent && (
                                    <Col md={12} className="mt-2">
                                      <strong>User Agent:</strong>
                                      <div className="bg-white p-2 rounded mt-1">
                                        <small>{activity.user_agent}</small>
                                      </div>
                                    </Col>
                                  )}
                                </Row>
                              </Card.Body>
                            </Card>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{" "}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{" "}
                  {pagination.total} entries
                </div>
                <div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={pagination.current_page === 1}
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    className="me-2"
                  >
                    Previous
                  </Button>
                  <span className="mx-2">
                    Page {pagination.current_page} of {pagination.last_page}
                  </span>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={pagination.current_page === pagination.last_page}
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={fetchAuditTrail}>
          <i className="bi bi-arrow-clockwise me-2"></i>Refresh
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AuditTrailModal;
