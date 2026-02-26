import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://security-edu-production.up.railway.app';

function AdminDashboard() {
const navigate = useNavigate();
const adminId = sessionStorage.getItem('adminId');
console.log('adminId from session:', adminId);
const isSuper = sessionStorage.getItem('isSuper') === 'true';
const companyName = sessionStorage.getItem('companyName');

const [siteConfig, setSiteConfig] = useState({ systemName: '' });
const [configMessage, setConfigMessage] = useState('');

const [newAccount, setNewAccount] = useState({ id: '', password: '', companyName: '' });
const [accountMessage, setAccountMessage] = useState('');
const [accountList, setAccountList] = useState([]);

const [messages, setMessages] = useState({
  material: '', youtube: '', employee: '', quiz: '',
});
const [materialFile, setMaterialFile] = useState(null);
const [youtubeUrl, setYoutubeUrl] = useState('');
const [employeeFile, setEmployeeFile] = useState(null);
const [quizProgress, setQuizProgress] = useState(0);
const [quizLoading, setQuizLoading] = useState(false);
const [quizList, setQuizList] = useState([]);
const [testEmail, setTestEmail] = useState('');
const [testEmailMessage, setTestEmailMessage] = useState('');

const setMessage = (key, msg) => setMessages((prev) => ({ ...prev, [key]: msg }));

const [savedMaterial, setSavedMaterial] = useState('');
const [savedYoutube, setSavedYoutube] = useState('');
const [savedEmployee, setSavedEmployee] = useState('');

useEffect(() => {
  axios.get(`${API}/api/admin/site-config?adminId=${adminId}`)
    .then(res => setSiteConfig({ systemName: res.data.systemName || '' }))
    .catch(() => {});

  // 저장된 파일 정보 불러오기
  axios.get(`${API}/api/admin/saved-info?adminId=${adminId}`)
    .then(res => {
      setSavedMaterial(res.data.materialFileName || '');
      setSavedYoutube(res.data.youtubeUrl || '');
      setSavedEmployee(res.data.employeeFileName || '');
    })
    .catch(() => {});
}, []);

const handleSaveConfig = async () => {
  if (!siteConfig.systemName) return setConfigMessage('교육명을 입력해주세요.');
  try {
    await axios.post(`${API}/api/admin/site-config`, { adminId, systemName: siteConfig.systemName });
    setConfigMessage('✅ 저장 완료!');
  } catch {
    setConfigMessage('❌ 저장 실패');
  }
};

const handleCreateAccount = async () => {
  const { id, companyName } = newAccount;
  console.log('계정생성 시도:', { id, companyName, adminId });
  if (!id || !companyName) return setAccountMessage('모든 항목을 입력해주세요.');
  try {
    await axios.post(`${API}/api/admin/create-account`, {
      requesterId: adminId,
      newId: id,
      password: newAccount.password || 'Hansol123!@#',
      companyName,
      initialPassword: newAccount.initialPassword || '',
    });
    setAccountMessage('✅ 계정 생성 완료!');
    setNewAccount({ id: '', password: '', companyName: '' });
  } catch (err) {
    setAccountMessage('❌ ' + (err.response?.data?.message || '생성 실패'));
  }
};

const handleLoadAccounts = async () => {
  try {
    const res = await axios.get(`${API}/api/admin/accounts?requesterId=${adminId}`);
    setAccountList(res.data.accounts);
  } catch {
    alert('조회 실패');
  }
};

// ✅ 추가: 암호 리셋
const handleResetPassword = async (targetId) => {
  if (!window.confirm(`${targetId} 계정의 암호를 초기화하시겠습니까?\n초기 암호: Hansol123!@#`)) return;
  try {
    await axios.post(`${API}/api/admin/reset-password`, {
      requesterId: adminId,
      targetId,
    });
    alert(`✅ ${targetId} 암호가 초기화되었습니다.`);
    handleLoadAccounts(); // 목록 새로고침
  } catch (err) {
    alert('❌ ' + (err.response?.data?.message || '초기화 실패'));
  }
};
const handleDeleteAccount = async (targetId) => {
  if (!window.confirm(`${targetId} 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
  try {
    await axios.delete(`${API}/api/admin/delete-account`, { data: { requesterId: adminId, targetId } });
    alert(`✅ ${targetId} 계정이 삭제되었습니다.`);
    handleLoadAccounts();
  } catch (err) {
    alert('❌ ' + (err.response?.data?.message || '삭제 실패'));
  }
};

const handleMaterialUpload = async () => {
  if (!materialFile) return setMessage('material', '파일을 선택해주세요.');
  const formData = new FormData();
  formData.append('file', materialFile);
  formData.append('adminId', adminId);
  try {
    const res = await axios.post(`${API}/api/admin/upload-material`, formData);
    setMessage('material', '✅ ' + res.data.message);
  } catch (err) {
    setMessage('material', '❌ ' + (err.response?.data?.message || '업로드 실패'));
  }
};

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl) return setMessage('youtube', '링크를 입력해주세요.');
    try {
      const res = await axios.post(`${API}/api/admin/upload-youtube`, { url: youtubeUrl, adminId });
      setMessage('youtube', '✅ ' + res.data.message);
    } catch (err) {
      setMessage('youtube', '❌ ' + (err.response?.data?.message || '저장 실패'));
    }
  };

const handleEmployeeUpload = async () => {
  if (!employeeFile) return setMessage('employee', '파일을 선택해주세요.');
  const formData = new FormData();
  formData.append('file', employeeFile);
  formData.append('adminId', adminId);
    try {
      const res = await axios.post(`${API}/api/admin/upload-employees`, formData);
      setMessage('employee', '✅ ' + res.data.message);
    } catch (err) {
      setMessage('employee', '❌ ' + (err.response?.data?.message || '업로드 실패'));
    }
  };

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setQuizProgress(0);
    setMessage('quiz', '');
    const interval = setInterval(() => {
      setQuizProgress((prev) => {
        if (prev >= 95) { clearInterval(interval); return 95; }
        return prev + 1.5;
      });
    }, 900);
    try {
      const res = await axios.post(`${API}/api/quiz/generate`, { adminId });
      clearInterval(interval);
      setQuizProgress(100);
      setMessage('quiz', `✅ ${res.data.total}문항 생성 완료!`);
    } catch (err) {
      clearInterval(interval);
      setQuizProgress(0);
      setMessage('quiz', `❌ 퀴즈 생성 실패: ${err.response?.data?.message || err.message}`);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleViewQuiz = async () => {
    try {
      const res = await axios.get(`${API}/api/quiz/all?adminId=${adminId}`);
      setQuizList(res.data.questions);
    } catch {
      alert('생성된 퀴즈가 없습니다. 먼저 퀴즈를 생성해주세요.');
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return setTestEmailMessage('이메일을 입력해주세요.');
    try {
      setTestEmailMessage('발송 중...');
      const res = await axios.post(`${API}/api/admin/test-email`, { email: testEmail });
      setTestEmailMessage('✅ ' + res.data.message);
    } catch (err) {
      setTestEmailMessage('❌ ' + (err.response?.data?.message || '발송 실패'));
    }
  };

  const handleDownloadQuiz = () => window.open(`${API}/api/quiz/download?adminId=${adminId}`, '_blank');
  const handleDownload = () => window.open(`${API}/api/admin/download-employees`, '_blank');
const thStyle = { padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #ddd' };
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #eee' };

  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>
        <h2 style={styles.title}>🛡️ 교육 관리자 대시보드</h2>
<p style={{ fontSize: '14px', color: '#888', marginTop: '-16px' }}>{companyName}</p>
<button onClick={() => navigate('/')} style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
  ← 홈으로
</button>

{/* 계정 생성 - 슈퍼관리자만 표시 */}
{isSuper && (
  <div style={styles.card}>
    <h3 style={styles.cardTitle}>👤 관리자 계정 생성</h3>
    <p style={styles.guide}>새 회사의 관리자 계정을 생성합니다.</p>
    <input type="text" placeholder="아이디" value={newAccount.id}
      onChange={(e) => setNewAccount(p => ({ ...p, id: e.target.value }))} style={styles.input} />
    <input type="text" placeholder="회사명 (예: 한솔아이원스(주))" value={newAccount.companyName}
      onChange={(e) => setNewAccount(p => ({ ...p, companyName: e.target.value }))} style={styles.input} />
    <input type="password" placeholder={`초기 암호 (미입력 시 Hansol123!@#)`} value={newAccount.initialPassword || ''}
      onChange={(e) => setNewAccount(p => ({ ...p, initialPassword: e.target.value }))} style={styles.input} />
    <button style={{ ...styles.button, backgroundColor: '#2c3e50' }} onClick={handleCreateAccount}>계정 생성</button>
    {accountMessage && <p style={styles.message}>{accountMessage}</p>}
    <button style={{ ...styles.button, backgroundColor: '#7f8c8d' }} onClick={handleLoadAccounts}>
      계정 목록 보기
    </button>
    {accountList.length > 0 && (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginTop: '8px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f2f5' }}>
            <th style={thStyle}>아이디</th>
            <th style={thStyle}>회사명</th>
            <th style={thStyle}>초기암호변경</th>
            <th style={thStyle}>암호 리셋</th>
          </tr>
        </thead>
        <tbody>
          {accountList.map((acc, i) => (
            <tr key={i}>
              <td style={tdStyle}>{acc.id}</td>
              <td style={tdStyle}>{acc.companyName}</td>
              <td style={{ ...tdStyle, color: acc.mustChangePassword ? '#e74c3c' : '#27ae60' }}>
                {acc.mustChangePassword ? '미변경' : '변경완료'}
              </td>
              <td style={tdStyle}>
                <button
                  onClick={() => handleResetPassword(acc.id)}
                  style={{ padding: '4px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  초기화
                </button>
                <button
  onClick={() => handleDeleteAccount(acc.id)}
  style={{ padding: '4px 10px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginLeft: '6px' }}
>
  삭제
</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}

{/* 시스템 설정 */}
<div style={styles.card}>
  <h3 style={styles.cardTitle}>⚙️ 시스템 설정</h3>
  <p style={styles.guide}>메인 로그인 화면에 표시되는 교육명을 설정합니다. (회사명은 계정 생성 시 고정)</p>
  <input type="text" placeholder="교육명 (예: 보안교육 수강 시스템)" value={siteConfig.systemName}
    onChange={(e) => setSiteConfig(prev => ({ ...prev, systemName: e.target.value }))} style={styles.input} />
  <button style={{ ...styles.button, backgroundColor: '#2c3e50' }} onClick={handleSaveConfig}>저장하기</button>
  {configMessage && <p style={styles.message}>{configMessage}</p>}
</div>

        {/* 보안교육 자료 업로드 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📄 보안교육 자료 업로드</h3>
          <input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setMaterialFile(e.target.files[0])} style={styles.fileInput} />
          <p style={styles.guide}>보안교육자료의 경우 <b>100MB 이하의 PDF, PPT 파일만 업로드 해주세요.</b></p>
          <button style={styles.button} onClick={handleMaterialUpload}>업로드</button>
          {savedMaterial && <p style={{ fontSize: '13px', color: '#27ae60' }}>📎 현재 파일: {savedMaterial}</p>}
          {messages.material && <p style={styles.message}>{messages.material}</p>}
        </div>

        {/* 유튜브 링크 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🎬 유튜브 영상 링크 등록</h3>
          <input type="text" placeholder="https://www.youtube.com/..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} style={styles.input} />
          <p style={styles.guide}><b>유튜브 영상 링크만</b> 올려주세요.</p>
          {savedYoutube && <p style={{ fontSize: '13px', color: '#27ae60' }}>🔗 현재 링크: {savedYoutube}</p>}
          <button style={styles.button} onClick={handleYoutubeUpload}>저장</button>
          {messages.youtube && <p style={styles.message}>{messages.youtube}</p>}
        </div>

        {/* 인원명부 업로드 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>👥 인원명부 업로드</h3>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setEmployeeFile(e.target.files[0])} style={styles.fileInput} />
          <p style={styles.guide}><b>인원명부의 경우 Excel 파일만 업로드해주세요.</b></p>
          <p style={styles.guide}>컬럼 순서: 사번 / 이름 / 이메일 / 보안교육이수여부</p>
          <button style={styles.button} onClick={handleEmployeeUpload}>업로드</button>
          {savedEmployee && <p style={{ fontSize: '13px', color: '#27ae60' }}>👥 현재 파일: {savedEmployee}</p>}
          {messages.employee && <p style={styles.message}>{messages.employee}</p>}
        </div>

        {/* 퀴즈 생성 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🧠 퀴즈 자동 생성</h3>
          <p style={styles.guide}>유튜브 영상과 교육자료를 기반으로 GPT가 50문항을 생성합니다. 수강자마다 랜덤 10문제가 출제됩니다.</p>
          <p style={styles.guide}>⚠️ 생성까지 30~60초 소요됩니다. 버튼 클릭 후 기다려주세요.</p>
          <button
            style={{ ...styles.button, backgroundColor: quizLoading ? '#ccc' : '#8e44ad', cursor: quizLoading ? 'not-allowed' : 'pointer' }}
            onClick={handleGenerateQuiz}
            disabled={quizLoading}
          >
            {quizLoading ? '생성 중...' : '퀴즈 생성하기'}
          </button>
          {quizLoading && (
            <div style={styles.progressBarWrapper}>
              <div style={{ ...styles.progressBar, width: `${quizProgress}%` }} />
              <p style={styles.progressText}>{Math.round(quizProgress)}% 완료</p>
            </div>
          )}
          {messages.quiz && <p style={styles.message}>{messages.quiz}</p>}
        </div>

        {/* 퀴즈 문제 열람 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📋 생성된 퀴즈 열람</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ ...styles.button, backgroundColor: '#2980b9' }} onClick={handleViewQuiz}>문제 목록 보기</button>
            <button style={{ ...styles.button, backgroundColor: '#27ae60' }} onClick={handleDownloadQuiz}>엑셀 다운로드</button>
          </div>
          {quizList.length > 0 && (
            <div style={styles.quizList}>
              {quizList.map((q, i) => (
                <div key={i} style={styles.quizItem}>
                  <p style={styles.quizQuestion}><b>Q{i + 1}.</b> {q.question}</p>
                  {q.options.map((opt, j) => (
                    <p key={j} style={{ ...styles.quizOption, color: j === q.answer ? '#27ae60' : '#555', fontWeight: j === q.answer ? 'bold' : 'normal' }}>
                      {j + 1}. {opt} {j === q.answer ? '✅' : ''}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 테스트 이메일 발송 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📧 테스트 이메일 발송</h3>
          <input type="email" placeholder="받을 이메일 주소 입력" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} style={styles.input} />
          <button style={{ ...styles.button, backgroundColor: '#e67e22' }} onClick={handleTestEmail}>테스트 메일 발송</button>
          {testEmailMessage && <p style={styles.message}>{testEmailMessage}</p>}
        </div>

        {/* 이수 현황 다운로드 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📊 이수 현황 다운로드</h3>
          <p style={styles.guide}>현재까지 업데이트된 인원명부를 엑셀로 다운로드합니다.</p>
          <button style={{ ...styles.button, backgroundColor: '#27ae60' }} onClick={handleDownload}>엑셀 다운로드</button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '40px 0' },
  pageWrapper: { display: 'flex', flexDirection: 'column', gap: '24px' },
  title: { fontSize: '24px', color: '#333', marginBottom: '8px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' },
  cardTitle: { fontSize: '18px', color: '#333', marginBottom: '4px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  fileInput: { fontSize: '14px' },
  guide: { fontSize: '13px', color: '#888' },
  button: { padding: '12px 24px', backgroundColor: '#4A90E2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', alignSelf: 'flex-start' },
  message: { fontSize: '14px', color: '#333' },
  progressBarWrapper: { width: '100%', backgroundColor: '#eee', borderRadius: '8px', overflow: 'hidden', height: '24px', position: 'relative' },
  progressBar: { height: '100%', backgroundColor: '#8e44ad', borderRadius: '8px', transition: 'width 0.9s ease' },
  progressText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', color: 'white', fontWeight: 'bold' },
  quizList: { display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', padding: '8px', marginTop: '8px' },
  quizItem: { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' },
  quizQuestion: { fontSize: '15px', color: '#333', marginBottom: '4px' },
  quizOption: { fontSize: '14px', paddingLeft: '12px' },
};

export default AdminDashboard;
