import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://192.168.118.164:4000';

function EmployeeLogin() {
  const [사번, set사번] = useState('');
  const [이름, set이름] = useState('');
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedEducation, setSelectedEducation] = useState('');
  const [systemName, setSystemName] = useState('');
  const [step, setStep] = useState(1); // 1: 선택화면, 2: 로그인화면
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/api/admin/companies`)
      .then(res => setCompanies(res.data.companies))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEducation) return;
    axios.get(`${API}/api/admin/site-config?adminId=${selectedEducation}`)
      .then(res => setSystemName(res.data.systemName || ''))
      .catch(() => {});
  }, [selectedEducation]);

  const currentEducations = companies.find(c => c.companyName === selectedCompany)?.educations || [];

  const handleNext = () => {
    if (!selectedCompany) return setError('회사를 선택해주세요.');
    if (!selectedEducation) return setError('교육을 선택해주세요.');
    setError('');
    setStep(2);
  };

  const handleVerify = async () => {
    if (!사번 || !이름) return setError('사번과 이름을 모두 입력해주세요.');
    try {
      const res = await axios.post(`${API}/api/auth/verify`, { 사번, 이름, companyId: selectedEducation });
      if (res.data.success) {
        sessionStorage.setItem('employee', JSON.stringify(res.data.employee));
sessionStorage.setItem('companyId', selectedEducation);
sessionStorage.setItem('systemName', systemName);
sessionStorage.setItem('companyName', selectedCompany);
navigate('/video');
      }
    } catch (err) {
      setError(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') step === 1 ? handleNext() : handleVerify(); };

  const selectStyle = {
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '15px',
    backgroundColor: 'white',
    width: '100%',
    appearance: 'auto',
  };

  if (step === 1) {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <div style={styles.logoArea}>
            <span style={styles.logoIcon}>🛡️</span>
            <h2 style={styles.title}>한솔그룹 온라인 교육</h2>
            <p style={styles.subtitle}>회사와 교육을 선택해주세요.</p>
          </div>

          <select style={selectStyle} value={selectedCompany}
            onChange={(e) => { setSelectedCompany(e.target.value); setSelectedEducation(''); setError(''); }}>
            <option value="">회사 선택</option>
            {companies.map(c => (
              <option key={c.companyName} value={c.companyName}>{c.companyName}</option>
            ))}
          </select>

          <select style={{ ...selectStyle, color: !selectedCompany ? '#aaa' : '#333' }}
            value={selectedEducation}
            onChange={(e) => { setSelectedEducation(e.target.value); setError(''); }}
            disabled={!selectedCompany}>
            <option value="">교육 선택</option>
            {currentEducations.filter(e => e.systemName && e.systemName !== '[교육 이름을 설정해주세요]').map(e => (
  <option key={e.adminId} value={e.adminId}>{e.systemName}</option>
))}
          </select>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} onClick={handleNext} onKeyDown={handleKeyDown}>
            다음
          </button>

          <button style={styles.adminBtn} onClick={() => navigate('/admin')}>
            관리자 페이지
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.logoArea}>
          <span style={styles.logoIcon}>🛡️</span>
          <p style={styles.company}>{selectedCompany}</p>
          <h2 style={styles.title}>{systemName}</h2>
          <p style={styles.subtitle}>사번과 이름을 입력하여 본인 확인 후 교육을 시작하세요.</p>
        </div>

        <input style={styles.input} type="text" placeholder="사번"
          value={사번} onChange={(e) => set사번(e.target.value)} onKeyDown={handleKeyDown} />
        <input style={styles.input} type="text" placeholder="이름"
          value={이름} onChange={(e) => set이름(e.target.value)} onKeyDown={handleKeyDown} />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.button} onClick={handleVerify}>교육 시작하기</button>

        <button style={styles.backBtn} onClick={() => { setStep(1); setError(''); set사번(''); set이름(''); }}>
          ← 뒤로가기
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
  box: { backgroundColor: 'white', padding: '48px 40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '400px', gap: '12px' },
  logoArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px', gap: '8px' },
  logoIcon: { fontSize: '48px' },
  company: { fontSize: '14px', color: '#888', textAlign: 'center' },
  title: { fontSize: '22px', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: '13px', color: '#888', textAlign: 'center', lineHeight: '1.5' },
  input: { padding: '14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' },
  button: { padding: '14px', backgroundColor: '#4A90E2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  backBtn: { background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', textAlign: 'center' },
  adminBtn: { background: 'none', border: 'none', color: '#bbb', fontSize: '12px', cursor: 'pointer', marginTop: '4px' },
  error: { color: '#e74c3c', fontSize: '13px', textAlign: 'center' },
};

export default EmployeeLogin;