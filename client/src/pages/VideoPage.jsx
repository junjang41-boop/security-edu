import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// 유튜브 URL에서 영상 ID 추출하는 함수
function getYoutubeId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

function VideoPage() {
  const [videoId, setVideoId] = useState(null);
  const [canNext, setCanNext] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const REQUIRED_SECONDS = 10; // 몇 초 이상 봐야 다음 버튼 활성화 (나중에 조정 가능)

  // 임직원 세션 확인
  useEffect(() => {
    const employee = sessionStorage.getItem('employee');
    if (!employee) {
      navigate('/');
    }
  }, []);

  // 유튜브 URL 불러오기
  useEffect(() => {
    axios.get('security-edu.railway.internal/api/education/youtube')
      .then((res) => {
        const id = getYoutubeId(res.data.url);
        if (id) setVideoId(id);
        else setError('유튜브 링크가 올바르지 않습니다.');
      })
      .catch(() => setError('등록된 유튜브 영상이 없습니다. 관리자에게 문의하세요.'));
  }, []);

  // 영상 재생 타이머 (10초 이상 보면 다음 버튼 활성화)
  useEffect(() => {
    if (!videoId) return;

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev + 1 >= REQUIRED_SECONDS) {
          setCanNext(true);
          clearInterval(timerRef.current);
          return REQUIRED_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [videoId]);

  const handleNext = () => {
    navigate('/slides');
  };

  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>

        <div style={styles.header}>
          <h2 style={styles.title}>🎬 보안교육 영상</h2>
          <p style={styles.subtitle}>영상을 시청한 후 다음 단계로 넘어가세요.</p>
        </div>

        {error ? (
          <div style={styles.errorBox}>{error}</div>
        ) : (
          <>
            {/* 유튜브 영상 */}
            <div style={styles.videoWrapper}>
              {videoId && (
                <iframe
                  style={styles.iframe}
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  title="보안교육 영상"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            {/* 진행 상태 */}
            <div style={styles.progressBox}>
              {canNext ? (
                <p style={styles.progressDone}>✅ 영상 시청 완료! 다음 단계로 이동할 수 있습니다.</p>
              ) : (
                <p style={styles.progressWait}>
                  ⏳ 다음 버튼 활성화까지 {REQUIRED_SECONDS - seconds}초 남았습니다...
                </p>
              )}
            </div>

            {/* 다음 버튼 */}
            <button
              style={{
                ...styles.button,
                backgroundColor: canNext ? '#4A90E2' : '#ccc',
                cursor: canNext ? 'pointer' : 'not-allowed',
              }}
              onClick={handleNext}
              disabled={!canNext}
            >
              다음 단계로 →
            </button>
          </>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    backgroundColor: '#f0f2f5',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  title: {
    fontSize: '24px',
    color: '#333',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
  },
  videoWrapper: {
    position: 'relative',
    paddingBottom: '40%', // 높이 줄이기
    height: 0,
    overflow: 'hidden',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  progressBox: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px 24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  progressWait: {
    color: '#e67e22',
    fontSize: '15px',
    textAlign: 'center',
  },
  progressDone: {
    color: '#27ae60',
    fontSize: '15px',
    textAlign: 'center',
  },
  button: {
    padding: '14px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    alignSelf: 'flex-end',
  },
  errorBox: {
    backgroundColor: '#ffe0e0',
    padding: '16px',
    borderRadius: '8px',
    color: '#e74c3c',
    textAlign: 'center',
  },
};

export default VideoPage;