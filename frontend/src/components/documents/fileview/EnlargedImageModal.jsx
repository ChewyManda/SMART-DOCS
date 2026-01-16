import React from "react";
import { Modal } from "react-bootstrap";

const EnlargedImageModal = ({ showModal, setShowModal, fileUrl, fileName }) => (
  <Modal show={showModal} onHide={() => setShowModal(false)} centered size="xl">
    <Modal.Body className="p-0" style={{ textAlign: "center", background: "#000" }}>
      <img
        src={fileUrl}
        alt={fileName}
        style={{ maxWidth: "100%", maxHeight: "90vh" }}
        onClick={() => setShowModal(false)}
      />
    </Modal.Body>
  </Modal>
);

export default EnlargedImageModal;
