// components/ActivityTimeline.jsx
import React from 'react';
import { Card, Button } from 'react-bootstrap';

const ActivityTimeline = ({ currentActivities, activityPage, setActivityPage, totalActivityPages, getActivityIcon, formatDate }) => {
  return (
    <Card className="shadow-sm border-0 activity-card mb-4">
      <Card.Header className="bg-white border-0">
        <h5><i className="bi bi-clock-history me-2"></i>Activity Timeline</h5>
      </Card.Header>
      <Card.Body>
        {currentActivities.length > 0 ? currentActivities.map(a => (
          <div key={a.id} className="d-flex mb-3">
            <div className="me-3">
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ height: 48, width: 48, borderRadius: '10px' }}>
                <i className={`bi bi-${getActivityIcon(a.activity_type)}`} style={{ fontSize: '1.25rem' }}></i>
              </div>
            </div>
            <div className="flex-grow-1">
              <p className="mb-1"><strong>{a.user?.name}</strong> {a.activity_type} this document</p>
              <small className="text-muted">{formatDate(a.created_at)}</small>
            </div>
          </div>
        )) : <p className="text-center text-muted">No activities</p>}

        {totalActivityPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <Button variant="outline-secondary" size="sm" disabled={activityPage === 1} onClick={() => setActivityPage(prev => prev - 1)}>
              <i className="bi bi-chevron-left"></i> Previous
            </Button>
            <span className="text-muted small">Page {activityPage} of {totalActivityPages}</span>
            <Button variant="outline-secondary" size="sm" disabled={activityPage === totalActivityPages} onClick={() => setActivityPage(prev => prev + 1)}>
              Next <i className="bi bi-chevron-right"></i>
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ActivityTimeline;
