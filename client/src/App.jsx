import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeLogin from './pages/EmployeeLogin';
import VideoPage from './pages/VideoPage';
import SlidePage from './pages/SlidePage';
import QuizPage from './pages/QuizPage';
import CompletePage from './pages/CompletePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 관리자 */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* 임직원 교육 */}
        <Route path="/" element={<EmployeeLogin />} />
        <Route path="/video" element={<VideoPage />} />
        <Route path="/slides" element={<SlidePage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/complete" element={<CompletePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;