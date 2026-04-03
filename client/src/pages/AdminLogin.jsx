import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://192.168.118.164:4000';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

function AdminLogin() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('login'); // 'login' | 'changePassword'
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changeError, setChangeError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API}/api/admin/login`, { id, password });
      if (res.data.success) {
        if (res.data.mustChangePassword) {
          setStep('changePassword');
          return;
        }
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('adminId', id);
        sessionStorage.setItem('isSuper', res.data.isSuper ? 'true' : 'false');
        sessionStorage.setItem('companyName', res.data.companyName);
        navigate('/admin/dashboard');
      }
    } catch {
      setError('아이디 또는 비밀번호가 틀렸습니다.');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordRegex.test(newPassword)) {
      return setChangeError('8자리 이상, 대문자/소문자/숫자/특수문자(!@#$%^&*)를 모두 포함해야 합니다.');
    }
    if (newPassword !== newPasswordConfirm) {
      return setChangeError('새 암호가 일치하지 않습니다.');
    }
    try {
      await axios.post(`${API}/api/admin/change-password`, {
        adminId: id,
        currentPassword: password,
        newPassword,
      });
      sessionStorage.setItem('isAdmin', 'true');
      sessionStorage.setItem('adminId', id);
      sessionStorage.setItem('isSuper', 'false');
      sessionStorage.setItem('companyName', '');
      navigate('/admin/dashboard');
    } catch (err) {
      setChangeError(err.response?.data?.message || '암호 변경 실패');
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') step === 'login' ? handleLogin() : handleChangePassword(); };

  if (step === 'changePassword') {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <h2 style={styles.title}>🔑 초기 암호 변경</h2>
          <p style={{ fontSize: '13px', color: '#e74c3c', textAlign: 'center' }}>
            보안을 위해 초기 암호를 변경해주세요.
          </p>
          <input style={styles.input} type="password" placeholder="새 암호"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={handleKeyDown} />
          <input style={styles.input} type="password" placeholder="새 암호 확인"
            value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} onKeyDown={handleKeyDown} />
          <p style={{ fontSize: '12px', color: '#aaa' }}>
            8자리 이상, 대문자/소문자/숫자/특수문자(!@#$%^&*) 포함
          </p>
          {changeError && <p style={styles.error}>{changeError}</p>}
          <button style={styles.button} onClick={handleChangePassword}>암호 변경하기</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h2 style={styles.title}>🔐 관리자 로그인</h2>
        <input style={styles.input} type="text" placeholder="아이디"
          value={id} onChange={(e) => setId(e.target.value)} onKeyDown={handleKeyDown} />
        <input style={styles.input} type="password" placeholder="비밀번호"
          value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} onClick={handleLogin}>로그인</button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
  box: { backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', width: '320px', gap: '12px' },
  title: { textAlign: 'center', color: '#333' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
  button: { padding: '12px', backgroundColor: '#4A90E2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  error: { color: 'red', fontSize: '13px', textAlign: 'center' },
};

export default AdminLogin;