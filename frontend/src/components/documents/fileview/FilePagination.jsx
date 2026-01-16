import React from "react";
import { Button, Card } from "react-bootstrap";

const FilePagination = ({ files, currentIndex, goToPage }) => {
  if (files.length <= 1) return null;

  return (
    <Card.Footer className="d-flex justify-content-center align-items-center gap-2 flex-wrap">
      <Button onClick={() => goToPage(currentIndex - 1)} disabled={currentIndex === 0}>
        ← Prev
      </Button>

      {files.map((f, idx) => (
        <Button
          key={idx}
          variant={currentIndex === idx ? "primary" : "outline-primary"}
          onClick={() => goToPage(idx)}
        >
          {idx + 1}
        </Button>
      ))}

      <Button
        onClick={() => goToPage(currentIndex + 1)}
        disabled={currentIndex === files.length - 1}
      >
        Next →
      </Button>
    </Card.Footer>
  );
};

export default FilePagination;
