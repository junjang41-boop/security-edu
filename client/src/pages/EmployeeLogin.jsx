import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'https://security-edu-production.up.railway.app';

function EmployeeLogin() {
  const [사번, set사번] = useState('');
  const [이름, set이름] = useState('');
  const [error, setError] = useState('');
  // ✅ 추가
  const [companyName, setCompanyName] = useState('');
  const [systemName, setSystemName] = useState('');
  const navigate = useNavigate();

  // ✅ 추가: 시스템 설정 불러오기
  useEffect(() => {
    axios.get(`${API}/api/admin/site-config`)
      .then(res => {
        setCompanyName(res.data.companyName || '');
        setSystemName(res.data.systemName || '');
      })
      .catch(() => {});
  }, []);

  const handleVerify = async () => {
    if (!사번 || !이름) return setError('사번과 이름을 모두 입력해주세요.');
    try {
      const res = await axios.post(`${API}/api/auth/verify`, { 사번, 이름 });
      if (res.data.success) {
        sessionStorage.setItem('employee', JSON.stringify(res.data.employee));
        navigate('/video');
      }
    } catch (err) {
      setError(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleVerify();
  };

  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>
        <div style={styles.box}>
          <div style={styles.logoArea}>
            <span style={styles.logoIcon}>🛡️</span>
            {/* ✅ 수정: 동적으로 표시 */}
            <p style={styles.company}>{companyName}</p>
            <h2 style={styles.title}>{systemName}</h2>
            <p style={styles.subtitle}>사번과 이름을 입력하여 본인 확인 후 교육을 시작하세요.</p>
          </div>

          <input style={styles.input} type="text" placeholder="사번" value={사번} onChange={(e) => set사번(e.target.value)} onKeyDown={handleKeyDown} />
          <input style={styles.input} type="text" placeholder="이름" value={이름} onChange={(e) => set이름(e.target.value)} onKeyDown={handleKeyDown} />

          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} onClick={handleVerify}>교육 시작하기</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
  pageWrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' },
  box: { backgroundColor: 'white', padding: '48px 40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '400px', gap: '12px' },
  logoArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px', gap: '8px' },
  logoIcon: { fontSize: '48px' },
  company: { fontSize: '14px', color: '#888', textAlign: 'center' },
  title: { fontSize: '22px', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: '13px', color: '#888', textAlign: 'center', lineHeight: '1.5' },
  input: { padding: '14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' },
  button: { padding: '14px', backgroundColor: '#4A90E2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  error: { color: '#e74c3c', fontSize: '13px', textAlign: 'center' },
};

export default EmployeeLogin;