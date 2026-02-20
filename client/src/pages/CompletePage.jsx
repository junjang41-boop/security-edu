import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function CompletePage() {
  const navigate = useNavigate();
  const certificateRef = useRef(null);

  const employee = JSON.parse(sessionStorage.getItem('employee') || '{}');
  const quizResult = JSON.parse(sessionStorage.getItem('quizResult') || '{}');

  // 세션 확인
  useEffect(() => {
    if (!employee.사번 || !quizResult.correct === undefined) navigate('/');
  }, []);

  // 이수증 PDF 출력
  const handlePrint = () => {
    window.print();
  };

  // 날짜 포맷
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 불합격 페이지
  if (!quizResult.passed) {
    return (
      <div style={styles.container}>
        <div className="page-wrapper" style={styles.pageWrapper}>
          <div style={styles.failCard}>
            <div style={styles.failIcon}>😢</div>
            <h2 style={styles.failTitle}>불합격</h2>
            <p style={styles.failText}>
              {quizResult.correct}문제 정답 ({quizResult.total}문제 중)
            </p>
            <p style={styles.failSubText}>
              6문제 이상 정답이어야 합격입니다.
            </p>
            <button
              style={styles.retryButton}
              onClick={() => navigate('/quiz')}
            >
              다시 응시하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 합격 페이지
  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>

        {/* 합격 안내 */}
        <div style={styles.successCard}>
          <div style={styles.successIcon}>🎉</div>
          <h2 style={styles.successTitle}>보안교육 이수 완료!</h2>
          <p style={styles.successText}>
            {quizResult.correct}문제 정답 ({quizResult.total}문제 중)
          </p>
        </div>

        {/* 이수증 */}
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
          </div>

          <div style={styles.certDivider} />

          <div style={styles.certFooter}>
            <p style={styles.certFooterText}>
              위 사람은 정보보안 교육을 성실히 이수하였음을 증명합니다.
            </p>
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
            onClick={() => {
              sessionStorage.clear();
              navigate('/');
            }}
          >
            홈으로
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    padding: '40px 0',
  },
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  // 합격
  successCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  successTitle: {
    fontSize: '24px',
    color: '#27ae60',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '16px',
    color: '#555',
  },

  // 불합격
  failCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '48px 32px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  failIcon: {
    fontSize: '56px',
  },
  failTitle: {
    fontSize: '28px',
    color: '#e74c3c',
  },
  failText: {
    fontSize: '18px',
    color: '#333',
  },
  failSubText: {
    fontSize: '14px',
    color: '#888',
  },
  retryButton: {
    marginTop: '16px',
    padding: '14px 40px',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
  },

  // 이수증
  certificate: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '48px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '3px solid #4A90E2',
  },
  certHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  certTitle: {
    fontSize: '32px',
    color: '#333',
    marginBottom: '8px',
  },
  certSubTitle: {
    fontSize: '14px',
    color: '#888',
    letterSpacing: '2px',
  },
  certDivider: {
    height: '2px',
    backgroundColor: '#4A90E2',
    margin: '24px 0',
  },
  certBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '0 24px',
  },
  certRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  certLabel: {
    fontSize: '16px',
    color: '#888',
    width: '60px',
    flexShrink: 0,
  },
  certValue: {
    fontSize: '13px',
    color: '#333',
    fontWeight: 'bold',
  },
  certFooter: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  certFooterText: {
    fontSize: '14px',
    color: '#555',
  },
  certCompany: {
    fontSize: '18px',
    color: '#333',
    fontWeight: 'bold',
  },

  // 버튼
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  printButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
  },
  homeButton: {
    padding: '14px 24px',
    backgroundColor: '#888',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
  },
};

export default CompletePage;