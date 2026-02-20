import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function SlidePage() {
  const [fileUrl, setFileUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 임직원 세션 확인
  useEffect(() => {
    const employee = sessionStorage.getItem('employee');
    if (!employee) navigate('/');
  }, []);

  // 교육자료 URL 불러오기
  useEffect(() => {
    axios.get('http://192.168.117.4:4000/api/education/material')
      .then((res) => setFileUrl(res.data.fileUrl))
      .catch(() => setError('등록된 교육자료가 없습니다. 관리자에게 문의하세요.'));
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    } else {
      // 마지막 페이지면 퀴즈로 이동
      navigate('/quiz');
    }
  };

  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>

        <div style={styles.header}>
          <h2 style={styles.title}>📄 보안교육 자료</h2>
          <p style={styles.subtitle}>
            {numPages ? `${currentPage} / ${numPages} 페이지` : '자료 불러오는 중...'}
          </p>
        </div>

        {error ? (
          <div style={styles.errorBox}>{error}</div>
        ) : (
          <>
            {/* PDF 뷰어 */}
            <div style={styles.pdfWrapper}>
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<p style={styles.loading}>📄 자료 불러오는 중...</p>}
                error={<p style={styles.errorText}>❌ 자료를 불러올 수 없습니다.</p>}
              >
                <Page
                  pageNumber={currentPage}
                  width={Math.min(window.innerWidth * 0.7, 700)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>

            {/* 페이지 이동 버튼 */}
            <div style={styles.buttonRow}>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: currentPage > 1 ? '#888' : '#ccc',
                  cursor: currentPage > 1 ? 'pointer' : 'not-allowed',
                }}
                onClick={handlePrev}
                disabled={currentPage === 1}
              >
                ← 이전
              </button>

              <button
                style={{
                  ...styles.button,
                  backgroundColor: '#4A90E2',
                  cursor: 'pointer',
                }}
                onClick={handleNext}
              >
                {currentPage === numPages ? '퀴즈 시작 →' : '다음 →'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    padding: '20px 0',
  },
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    fontSize: '22px',
    color: '#333',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
  },
  pdfWrapper: {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    overflow: 'auto',
    maxHeight: '75vh',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  button: {
    padding: '12px 32px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
  },
  loading: {
    padding: '40px',
    color: '#888',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#ffe0e0',
    padding: '16px',
    borderRadius: '8px',
    color: '#e74c3c',
    textAlign: 'center',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    padding: '40px',
  },
};

export default SlidePage;