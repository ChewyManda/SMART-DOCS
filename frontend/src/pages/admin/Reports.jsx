import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Table, Spinner, Pagination } from 'react-bootstrap';
import api from '../../services/api';
import '../../css/admin/analytics.css';

const Reports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('documents');
  const [dateRange, setDateRange] = useState('month');
  const [reportData, setReportData] = useState(null);
  const [pagination, setPagination] = useState({});

  const reportTypes = [
    { value: 'documents', label: 'Document Activity', icon: 'bi-file-earmark-text' },
    { value: 'users', label: 'User Activity', icon: 'bi-people' },
    { value: 'workflows', label: 'Workflow Performance', icon: 'bi-diagram-3' },
    { value: 'compliance', label: 'Compliance Report', icon: 'bi-shield-check' }
  ];

  const dateRanges = [
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'quarter', label: 'Last 90 Days' },
    { value: 'year', label: 'Last Year' }
  ];

  const summaryConfig = {
    documents: [
      { key: 'total', label: 'Total Documents', icon: 'bi-file-earmark-text', bg: 'bg-green' },
      { key: 'approved', label: 'Approved', icon: 'bi-check-circle', bg: 'bg-teal' },
      { key: 'pending', label: 'Pending', icon: 'bi-hourglass-split', bg: 'bg-orange' },
      { key: 'rejected', label: 'Rejected', icon: 'bi-x-circle', bg: 'bg-blue' }
    ],
    users: [
      { key: 'total', label: 'Total Users', icon: 'bi-people', bg: 'bg-green' },
      { key: 'active', label: 'Active Users', icon: 'bi-person-check', bg: 'bg-teal' },
      { key: 'inactive', label: 'Inactive', icon: 'bi-person-slash', bg: 'bg-orange' },
      { key: 'newUsers', label: 'New Users', icon: 'bi-person-plus', bg: 'bg-blue' }
    ],
    workflows: [
      { key: 'total', label: 'Total Workflows', icon: 'bi-diagram-3', bg: 'bg-green' },
      { key: 'avgTime', label: 'Avg Time', icon: 'bi-clock-history', bg: 'bg-blue' },
      { key: 'completion', label: 'Completion Rate', icon: 'bi-check-circle', bg: 'bg-teal' },
      { key: 'bottlenecks', label: 'Bottlenecks', icon: 'bi-exclamation-triangle', bg: 'bg-orange' }
    ],
    compliance: [
      { key: 'score', label: 'Compliance Score', icon: 'bi-shield-check', bg: 'bg-green' },
      { key: 'issues', label: 'Open Issues', icon: 'bi-exclamation-circle', bg: 'bg-orange' },
      { key: 'resolved', label: 'Resolved', icon: 'bi-check-circle', bg: 'bg-teal' },
      { key: 'overdue', label: 'Overdue', icon: 'bi-clock', bg: 'bg-blue' }
    ]
  };

  useEffect(() => {
    generateReport(1);
  }, [reportType, dateRange]);

  const generateReport = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/reports', {
        params: {
          type: reportType,
          date_range: dateRange,
          page: page
        }
      });
      
      setReportData(response.data);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
      // Set empty data on error
      setReportData({
        summary: {},
        data: []
      });
      setPagination({});
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Approved': 'badge-sm badge-completed',
      'Pending': 'badge-sm badge-pending',
      'Rejected': 'badge-sm badge-failed',
      'Compliant': 'badge-sm badge-completed',
      'Review Needed': 'badge-sm badge-pending',
      'Non-Compliant': 'badge-sm badge-failed'
    };
    return <Badge className={statusClasses[status] || 'badge-sm badge-on-hold'}>{status}</Badge>;
  };

  const renderPagination = () => {
    if (!pagination.last_page || pagination.last_page <= 1) return null;

    const maxButtons = 5;
    const currentPage = pagination.current_page;
    const totalPages = pagination.last_page;

    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    const pages = [];
    if (startPage > 1)
      pages.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => generateReport(i)}>
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages)
      pages.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);

    return (
      <Pagination className="justify-content-center mb-0">
        <Pagination.First disabled={currentPage === 1} onClick={() => generateReport(1)} />
        <Pagination.Prev disabled={currentPage === 1} onClick={() => generateReport(currentPage - 1)} />
        {pages}
        <Pagination.Next disabled={currentPage === totalPages} onClick={() => generateReport(currentPage + 1)} />
        <Pagination.Last disabled={currentPage === totalPages} onClick={() => generateReport(totalPages)} />
      </Pagination>
    );
  };

  return (
    <Container fluid className="admin-dashboard-container">
      <Row className="page-header mb-4">
        <Col>
          <h2 className="dashboard-title">Reports</h2>
          <p className="dashboard-subtitle">Generate and export detailed system reports</p>
        </Col>
      </Row>

      {/* Report Controls */}
      <Card className="custom-card-recent mb-4 filter-card">
        <Card.Header className="custom-card-header-recent">
          <h5>
            <i className="bi bi-funnel me-2"></i>
            Report Options
          </h5>
        </Card.Header>
        <Card.Body className="filter-card-body">
          <Row className="align-items-end g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Report Type</Form.Label>
                <Form.Select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                >
                  {reportTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date Range</Form.Label>
                <Form.Select 
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  {dateRanges.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} className="text-md-end">
              <Button variant="primary" onClick={() => generateReport(1)}>
                <i className="bi bi-arrow-repeat me-2"></i>
                Refresh
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Generating report...</p>
        </div>
      ) : reportData && (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            {summaryConfig[reportType].map((config) => (
              <Col md={3} key={config.key}>
                <Card className="stats-card">
                  <div className={`stats-icon ${config.bg}`}>
                    <i className={`bi ${config.icon}`}></i>
                  </div>
                  <h3>{reportData.summary[config.key]}</h3>
                  <p>{config.label}</p>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Report Table */}
          <Card className="custom-card-recent" style={{ height: 'auto' }}>
            <Card.Header className="custom-card-header-recent">
              <h5>
                <i className={`bi ${reportTypes.find(r => r.value === reportType)?.icon} me-2`}></i>
                {reportTypes.find(r => r.value === reportType)?.label} Details
              </h5>
            </Card.Header>
            <Card.Body>
              <Table responsive className="dashboard-table">
                <thead>
                  <tr>
                    {reportType === 'documents' && (
                      <>
                        <th>Document Name</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Owner</th>
                      </>
                    )}
                    {reportType === 'users' && (
                      <>
                        <th>User Name</th>
                        <th>Department</th>
                        <th>Level</th>
                        <th>Actions</th>
                      </>
                    )}
                    {reportType === 'workflows' && (
                      <>
                        <th>Workflow Name</th>
                        <th>Avg. Time</th>
                        <th>Completion Rate</th>
                        <th>Volume</th>
                      </>
                    )}
                    {reportType === 'compliance' && (
                      <>
                        <th>Requirement</th>
                        <th>Status</th>
                        <th>Last Check</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.data && reportData.data.map(item => (
                    <tr key={item.id}>
                      {reportType === 'documents' && (
                        <>
                          <td><strong>{item.name}</strong></td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>{item.date}</td>
                          <td>{item.owner}</td>
                        </>
                      )}
                      {reportType === 'users' && (
                        <>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.department}</td>
                          <td><Badge className="badge-sm badge-on-review">Level {item.level}</Badge></td>
                          <td>{item.actions} actions</td>
                        </>
                      )}
                      {reportType === 'workflows' && (
                        <>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.avgTime}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px', borderRadius: '4px', background: '#e2e8f0' }}>
                                <div 
                                  className="progress-bar" 
                                  style={{ width: item.completion, background: '#16a34a', borderRadius: '4px' }}
                                ></div>
                              </div>
                              <small className="text-muted">{item.completion}</small>
                            </div>
                          </td>
                          <td>{item.volume}</td>
                        </>
                      )}
                      {reportType === 'compliance' && (
                        <>
                          <td><strong>{item.requirement}</strong></td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>{item.lastCheck}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {reportData.data && Array.from({ length: Math.max(0, 10 - reportData.data.length) }).map((_, index) => (
                    <tr key={`empty-${index}`} style={{ height: '48px' }}>
                      {reportType === 'documents' && (
                        <>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                        </>
                      )}
                      {reportType === 'users' && (
                        <>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                        </>
                      )}
                      {reportType === 'workflows' && (
                        <>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                        </>
                      )}
                      {reportType === 'compliance' && (
                        <>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
              {pagination.last_page > 1 && (
                <Card.Footer className="custom-card-list-footer d-flex justify-content-center">
                  {renderPagination()}
                </Card.Footer>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default Reports;
