// UploadDocument.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../css/documents/uploaddocument.css';
import '../../css/admin/admin-dashboard.css';

import DocumentDetails from '../../components/documents/upload/UploadDocumentDetails';
import RecipientsPanel from '../../components/documents/upload/UploadRecipientsPanel';
import UploadGuidelines from '../../components/documents/upload/UploadGuidelines';

const ITEMS_PER_PAGE = 10;

// Load Google APIs (Picker + GIS)
const loadGoogleScripts = () =>
  new Promise((resolve) => {
    if (window.gapi && window.google && window.google.accounts) return resolve();

    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.onload = () => {
      const scriptGis = document.createElement('script');
      scriptGis.src = 'https://accounts.google.com/gsi/client';
      scriptGis.onload = () => resolve();
      document.body.appendChild(scriptGis);
    };
    document.body.appendChild(scriptGapi);
  });

const UploadDocument = ({ user }) => {
  const navigate = useNavigate();

  // FORM STATES
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('');
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // POPUPS & MODALS
  const [showSourcePopup, setShowSourcePopup] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // SCANNER
  const [scanning, setScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  // USERS & RECIPIENTS
  const [users, setUsers] = useState([]);
  const [recipients, setRecipients] = useState([]);

  // RECIPIENT UI
  const [recSearch, setRecSearch] = useState('');
  const [recDeptFilter, setRecDeptFilter] = useState('all');
  const [recLevelFilter, setRecLevelFilter] = useState('all');
  const [recPage, setRecPage] = useState(1);

  // STATUS
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load Google Scripts
  useEffect(() => { loadGoogleScripts(); }, []);

  // Fetch users
  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get('/user/users');
        if (!mounted) return;
        setUsers(Array.isArray(res.data) ? res.data : res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally { if (mounted) setLoadingUsers(false); }
    };
    fetchUsers();
    return () => { mounted = false; };
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = recSearch.trim().toLowerCase();
    return users.filter(u => {
      if (recDeptFilter !== 'all' && (u.department || '').toLowerCase() !== recDeptFilter.toLowerCase()) return false;
      if (recLevelFilter !== 'all' && String(u.access_level) !== String(recLevelFilter)) return false;
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      );
    });
  }, [users, recSearch, recDeptFilter, recLevelFilter]);

  const totalRecPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const start = (recPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, recPage]);

  // RECIPIENT HELPERS
  const handleRecipientToggle = (userId) => {
    setRecipients(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  const selectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.id);
    setRecipients(prev => Array.from(new Set([...prev, ...ids])));
  };
  const clearAllRecipients = () => setRecipients([]);

  // FILE HANDLING
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;

    const mappedFiles = newFiles.map(f => ({
      file: f,
      preview: f.type.startsWith('image/') || f.type === 'application/pdf' || f.type.startsWith('video/') || f.type.startsWith('audio/')
        ? URL.createObjectURL(f)
        : null
    }));

    setFiles(prev => [...prev, ...mappedFiles]);
    setShowSourcePopup(false);
    setIsDragging(false);
  };
  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  // CAMERA SCANNER
  const startScanner = async () => {
    setError('');
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      const video = document.getElementById('scannerVideo');
      if (video) video.srcObject = stream;
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera.');
      setScanning(false);
    }
  };
  const captureScan = () => {
    const video = document.getElementById('scannerVideo');
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `scan_${Date.now()}.png`, { type: 'image/png' });
        setFiles(prev => [...prev, { file, preview: URL.createObjectURL(file) }]);
      }
    });

    stopScanner();
  };
  const stopScanner = () => {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setScanning(false);
  };

  // GOOGLE DRIVE IMPORT (Option 1: fetch actual file)
  const importFromGoogleDrive = async () => {
    if (!window.google || !window.gapi) return setError('Google API not loaded yet.');

    setError('');
    try {
      const CLIENT_ID = '795797714030-f3j78e1k0nrg67av87nna8h0ofuab4dq.apps.googleusercontent.com';
      const API_KEY = 'AIzaSyAQkPE0gftctgxXp47Vi2wegPwm6_fD0Fo';
      const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

      // GIS token client
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (tokenResponse) => {
          const accessToken = tokenResponse.access_token;

          // Load Picker
          window.gapi.load('picker', async () => {
            const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
              .setIncludeFolders(true)
              .setSelectFolderEnabled(true);

            const picker = new window.google.picker.PickerBuilder()
              .setOAuthToken(accessToken)
              .setDeveloperKey(API_KEY)
              .addView(view)
              .setOrigin(window.location.protocol + '//' + window.location.host)
              .setCallback(async (data) => {
                if (data.action === window.google.picker.Action.PICKED) {
                  for (const doc of data.docs) {
                    try {
                      // Fetch actual file content
                      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                      });
                      const blob = await res.blob();
                      const file = new File([blob], doc.name, { type: blob.type });
                      setFiles(prev => [...prev, {
                        file,
                        preview: blob.type.startsWith('image/') || blob.type === 'application/pdf'
                          ? URL.createObjectURL(blob)
                          : null
                      }]);
                    } catch (err) {
                      console.error('Failed to fetch file', doc.name, err);
                    }
                  }
                }
              })
              .build();

            picker.setVisible(true);
          });
        },
      });

      tokenClient.requestAccessToken();
    } catch (err) {
      console.error('Drive import error', err);
      setError('Failed to import from Google Drive.');
    }
  };

  // SUBMIT DOCUMENT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) return setError('Document title is required.');
    if (!files.length) return setError('Please select at least one file.');
    if (!recipients.length) return setError('Select at least one recipient.');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      if (classification) {
        fd.append('classification', classification);
      }
      files.forEach(f => fd.append('files[]', f.file));
      recipients.forEach(id => fd.append('recipients[]', id));

      await api.post('/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setSuccess('Document(s) uploaded successfully!');
      setTitle(''); setDescription(''); setClassification(''); setFiles([]); setRecipients([]);
      setRecSearch(''); setRecDeptFilter('all'); setRecLevelFilter('all'); setRecPage(1);
      setTimeout(() => navigate('/document'), 1400);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload document.');
    } finally { setLoading(false); }
  };

  const deptOptions = useMemo(() => ['all', ...Array.from(new Set(users.map(u => u.department).filter(Boolean)))], [users]);
  const accessLevelOptions = useMemo(() => ['all', ...Array.from(new Set(users.map(u => u.access_level).filter(v => v !== undefined && v !== null))).sort((a,b)=>a-b)], [users]);
  const recipientLabel = (count) => `${count} ${count === 1 ? 'recipient' : 'recipients'}`;

  return (
    <div className="user-dashboard-container">
    <Container>
      <Row className="mb-4">
        <Col>
          <h2 className="upload-title">Upload Document</h2>
          <p className="upload-subtitle">Upload and distribute documents</p>
        </Col>
      </Row>

      <Form onSubmit={handleSubmit}>
        <Row className="g-4">
          <Col lg={8}>
            <DocumentDetails
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              classification={classification} setClassification={setClassification}
              files={files} setFiles={setFiles}
              isDragging={isDragging} setIsDragging={setIsDragging}
              handleFileChange={handleFileChange} removeFile={removeFile}
              showSourcePopup={showSourcePopup} setShowSourcePopup={setShowSourcePopup}
              scanning={scanning} startScanner={startScanner} captureScan={captureScan} stopScanner={stopScanner}
              showCameraModal={showCameraModal} setShowCameraModal={setShowCameraModal}
              importFromGoogleDrive={importFromGoogleDrive}
              loading={loading} error={error} setError={setError} success={success} setSuccess={setSuccess}
            />
          </Col>

          <Col lg={4}>
            <RecipientsPanel
              users={users} filteredUsers={filteredUsers} paginatedUsers={paginatedUsers}
              loadingUsers={loadingUsers} recipients={recipients} handleRecipientToggle={handleRecipientToggle}
              selectAllFiltered={selectAllFiltered} clearAllRecipients={clearAllRecipients}
              recSearch={recSearch} setRecSearch={setRecSearch}
              recDeptFilter={recDeptFilter} setRecDeptFilter={setRecDeptFilter}
              recLevelFilter={recLevelFilter} setRecLevelFilter={setRecLevelFilter}
              recPage={recPage} setRecPage={setRecPage}
              deptOptions={deptOptions} accessLevelOptions={accessLevelOptions}
              ITEMS_PER_PAGE={ITEMS_PER_PAGE} recipientLabel={recipientLabel}
              loading={loading}
            />
            <UploadGuidelines />
          </Col>
        </Row>
      </Form>
    </Container>
    </div>
  );
};

export default UploadDocument;
