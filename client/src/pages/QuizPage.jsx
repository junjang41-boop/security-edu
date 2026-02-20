import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function QuizPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const employee = JSON.parse(sessionStorage.getItem('employee') || '{}');

  // 임직원 세션 확인
  useEffect(() => {
    if (!employee.사번) navigate('/');
  }, []);

  // 랜덤 10문제 불러오기
  useEffect(() => {
    axios.get('http://192.168.117.4:4000/api/quiz/get')
      .then((res) => {
        setQuestions(res.data.questions);
        setLoading(false);
      })
      .catch(() => {
        setError('퀴즈를 불러올 수 없습니다. 관리자에게 문의하세요.');
        setLoading(false);
      });
  }, []);

  // 보기 선택
  const handleSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  // 제출
  const handleSubmit = async () => {
    // 모든 문제 답했는지 확인
    if (Object.keys(answers).length < questions.length) {
      alert('모든 문제에 답해주세요!');
      return;
    }

    const answerArray = questions.map((q) => answers[q.id]);

    try {
      const res = await axios.post('http://192.168.117.4:4000/api/quiz/submit', {
        answers: answerArray,
        questions,
        employee,
      });

      // 결과를 세션에 저장하고 완료 페이지로 이동
      sessionStorage.setItem('quizResult', JSON.stringify(res.data));
      navigate('/complete');
    } catch (err) {
      alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div className="page-wrapper" style={styles.pageWrapper}>
          <p style={styles.loading}>⏳ 퀴즈를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div className="page-wrapper" style={styles.pageWrapper}>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="page-wrapper" style={styles.pageWrapper}>

        <div style={styles.header}>
          <h2 style={styles.title}>📝 보안교육 퀴즈</h2>
          <p style={styles.subtitle}>
            10문항 중 6문항 이상 정답이면 합격입니다.
          </p>
          <p style={styles.progress}>
            답변 완료: {Object.keys(answers).length} / {questions.length}
          </p>
        </div>

        {/* 문제 목록 */}
        {questions.map((q, i) => (
          <div key={q.id} style={styles.card}>
            <p style={styles.question}>
              <b>Q{i + 1}.</b> {q.question}
            </p>
            <div style={styles.options}>
              {q.options.map((opt, j) => (
                <div
                  key={j}
                  style={{
                    ...styles.option,
                    backgroundColor: answers[q.id] === j ? '#4A90E2' : 'white',
                    color: answers[q.id] === j ? 'white' : '#333',
                    border: answers[q.id] === j ? '2px solid #4A90E2' : '2px solid #ddd',
                  }}
                  onClick={() => handleSelect(q.id, j)}
                >
                  {j + 1}. {opt}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 제출 버튼 */}
        <button
          style={{
            ...styles.button,
            backgroundColor: Object.keys(answers).length === questions.length ? '#4A90E2' : '#ccc',
            cursor: Object.keys(answers).length === questions.length ? 'pointer' : 'not-allowed',
          }}
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
        >
          제출하기 ({Object.keys(answers).length}/{questions.length} 완료)
        </button>

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
    gap: '20px',
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
  progress: {
    fontSize: '14px',
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  question: {
    fontSize: '16px',
    color: '#333',
    lineHeight: '1.6',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  option: {
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  button: {
    padding: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  loading: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#888',
    padding: '40px',
  },
  errorText: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#e74c3c',
    padding: '40px',
  },
};

export default QuizPage;