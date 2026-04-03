import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CompletePage() {
  const navigate = useNavigate();
  const certificateRef = useRef(null);
  const canvasRef = useRef(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [saved, setSaved] = useState(false);

  const employee = JSON.parse(sessionStorage.getItem('employee') || '{}');
  const quizResult = JSON.parse(sessionStorage.getItem('quizResult') || '{}');

  useEffect(() => {
    if (!employee.사번) navigate('/');
  }, []);

  // 캔버스 드로잉 설정
  useEffect(() => {
    if (!quizResult.passed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [quizResult.passed]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setIsSigned(true);
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
    setSignatureImage(null);
    setSaved(false);
  };

const saveSignature = async () => {
  const canvas = canvasRef.current;
  const imgData = canvas.toDataURL('image/png');
  setSignatureImage(imgData);
  setSaved(true);

  // 서명 이미지를 서버로 전송해서 이메일에 첨부
  try {
    await fetch('http://192.168.118.164:4000/api/quiz/submit-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee,
        signatureImage: imgData,
        quizResult,
      }),
    });
  } catch (err) {
    console.log('서명 전송 실패:', err);
  }
};

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 불합격
  if (!quizResult.passed) {
    return (
      <div style={styles.container}>
        <div className="page-wrapper" style={styles.pageWrapper}>
          <div style={styles.failCard}>
            <div style={styles.failIcon}>😢</div>
            <h2 style={styles.failTitle}>불합격</h2>
            <p style={styles.failText}>{quizResult.correct}문제 정답 ({quizResult.total}문제 중)</p>
            <p style={styles.failSubText}>6문제 이상 정답이어야 합격입니다.</p>
            <button style={styles.retryButton} onClick={() => navigate('/quiz')}>
              다시 응시하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>

        {/* 합격 안내 */}
        <div style={styles.successCard}>
          <div style={styles.successIcon}>🎉</div>
          <h2 style={styles.successTitle}>보안교육 이수 완료!</h2>
          <p style={styles.successText}>{quizResult.correct}문제 정답 ({quizResult.total}문제 중)</p>
        </div>

        {/* 서명 영역 - 저장 전에만 표시 */}
        {!saved && (
          <div style={styles.signatureCard}>
            <h3 style={styles.signatureTitle}>✍️ 서명해주세요</h3>
            <p style={styles.signatureDesc}>아래 박스에 마우스(또는 손가락)로 서명 후 저장 버튼을 눌러주세요.</p>
            <canvas
              ref={canvasRef}
              width={500}
              height={160}
              style={styles.canvas}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div style={styles.signatureButtons}>
              <button style={styles.clearButton} onClick={clearSignature}>
                🗑️ 다시 쓰기
              </button>
              <button
                style={{
                  ...styles.saveSignButton,
                  backgroundColor: isSigned ? '#27ae60' : '#ccc',
                  cursor: isSigned ? 'pointer' : 'not-allowed',
                }}
                onClick={saveSignature}
                disabled={!isSigned}
              >
                ✅ 서명 저장
              </button>
            </div>
          </div>
        )}

        {/* 이수증 - 서명 저장 후에만 표시 */}
        {saved && (
          <>
            <div style={styles.certificate} ref={certificateRef}>
              <div style={styles.certHeader}>
                <h1 style={styles.certTitle}>보안교육 이수증</h1>
                <p style={styles.certSubTitle}>Security Education Certificate</p>
              </div>

              <div style={styles.certDivider} />

              <div style={styles.certBody}>
                <div style={styles.certRow}>
                  <span style={styles.certLabel}>성 명</span>
                  <span style={styles.certValue}>{employee.이름}</span>
                </div>
                <div style={styles.certRow}>
                  <span style={styles.certLabel}>사 번</span>
                  <span style={styles.certValue}>{employee.사번}</span>
                </div>
                <div style={styles.certRow}>
                  <span style={styles.certLabel}>교육명</span>
                  <span style={styles.certValue}>정보보안 교육</span>
                </div>
                <div style={styles.certRow}>
                  <span style={styles.certLabel}>점 수</span>
                  <span style={styles.certValue}>{quizResult.correct} / {quizResult.total}</span>
                </div>
                <div style={styles.certRow}>
                  <span style={styles.certLabel}>이수일</span>
                  <span style={styles.certValue}>{dateStr}</span>
                </div>
                {/* 서명 */}
                <div style={styles.certRow}>
                  <span style={styles.certLabel}>서 명</span>
                  <img src={signatureImage} alt="서명" style={styles.signatureImg} />
                </div>
              </div>

              <div style={styles.certDivider} />

              <div style={styles.certFooter}>
                <p style={styles.certFooterText}>위 사람은 정보보안 교육을 성실히 이수하였음을 증명합니다.</p>
                <p style={styles.certCompany}>한솔아이원스(주)</p>
              </div>
            </div>

            {/* 버튼 */}
            <div style={styles.buttonRow}>
              <button style={styles.printButton} onClick={handlePrint}>
                🖨️ 이수증 출력 / PDF 저장
              </button>
              <button
                style={styles.homeButton}
                onClick={() => { sessionStorage.clear(); navigate('/'); }}
              >
                홈으로
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '40px 0' },
  pageWrapper: { display: 'flex', flexDirection: 'column', gap: '24px' },

  successCard: {
    backgroundColor: '#e8f5e9', borderRadius: '12px', padding: '32px',
    textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  successIcon: { fontSize: '48px', marginBottom: '12px' },
  successTitle: { fontSize: '24px', color: '#27ae60', marginBottom: '8px' },
  successText: { fontSize: '16px', color: '#555' },

  failCard: {
    backgroundColor: 'white', borderRadius: '12px', padding: '48px 32px',
    textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  failIcon: { fontSize: '56px' },
  failTitle: { fontSize: '28px', color: '#e74c3c' },
  failText: { fontSize: '18px', color: '#333' },
  failSubText: { fontSize: '14px', color: '#888' },
  retryButton: {
    marginTop: '16px', padding: '14px 40px', backgroundColor: '#4A90E2',
    color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer',
  },

  // 서명
  signatureCard: {
    backgroundColor: 'white', borderRadius: '12px', padding: '32px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: '16px',
  },
  signatureTitle: { fontSize: '20px', color: '#333', margin: 0 },
  signatureDesc: { fontSize: '14px', color: '#888', margin: 0, textAlign: 'center' },
  canvas: {
    border: '2px dashed #4A90E2', borderRadius: '8px',
    cursor: 'crosshair', touchAction: 'none', width: '100%', maxWidth: '500px',
    backgroundColor: '#fafafa',
  },
  signatureButtons: { display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' },
  clearButton: {
    flex: 1, padding: '12px', backgroundColor: '#f5f5f5', color: '#555',
    border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
  },
  saveSignButton: {
    flex: 1, padding: '12px', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold',
  },

  // 이수증
  certificate: {
    backgroundColor: 'white', borderRadius: '12px', padding: '48px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '3px solid #4A90E2',
  },
  certHeader: { textAlign: 'center', marginBottom: '24px' },
  certTitle: { fontSize: '32px', color: '#333', marginBottom: '8px' },
  certSubTitle: { fontSize: '14px', color: '#888', letterSpacing: '2px' },
  certDivider: { height: '2px', backgroundColor: '#4A90E2', margin: '24px 0' },
  certBody: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 24px' },
  certRow: { display: 'flex', alignItems: 'center', gap: '24px' },
  certLabel: { fontSize: '16px', color: '#888', width: '60px', flexShrink: 0 },
  certValue: { fontSize: '16px', color: '#333', fontWeight: 'bold' },
  signatureImg: { height: '60px', maxWidth: '200px', objectFit: 'contain' },
  certFooter: { textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' },
  certFooterText: { fontSize: '14px', color: '#555' },
  certCompany: { fontSize: '18px', color: '#333', fontWeight: 'bold' },

  buttonRow: { display: 'flex', gap: '12px' },
  printButton: {
    flex: 1, padding: '14px', backgroundColor: '#4A90E2', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer',
  },
  homeButton: {
    padding: '14px 24px', backgroundColor: '#888', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer',
  },
};

export default CompletePage;
