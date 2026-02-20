import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminLogin() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post('security-edu.railway.internal/api/admin/login', {
        id,
        password,
      });

      if (res.data.success) {
        // 로그인 성공 → 세션 저장 후 대시보드로 이동
        sessionStorage.setItem('isAdmin', 'true');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError('아이디 또는 비밀번호가 틀렸습니다.');
    }
  };

  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>
        <div style={styles.box}>
        <h2 style={styles.title}>🔐 관리자 로그인</h2>

        <input
          style={styles.input}
          type="text"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.button} onClick={handleLogin}>
          로그인
        </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f0f2f5',
  },
  pageWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  box: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    width: '320px',
  },
  title: {
    textAlign: 'center',
    marginBottom: '24px',
    color: '#333',
  },
  input: {
    padding: '12px',
    marginBottom: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  button: {
    padding: '12px',
    backgroundColor: '#4A90E2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  error: {
    color: 'red',
    fontSize: '13px',
    textAlign: 'center',
  },
};

export default AdminLogin;