import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import SkillDetailPage from './pages/SkillDetailPage'
import UploadPage from './pages/UploadPage'
import LoginPage from './pages/LoginPage'
import StatsPage from './pages/StatsPage'
import EditSkillPage from './pages/EditSkillPage'
import ProfilePage from './pages/ProfilePage'
import { useAuthStore } from './lib/store'
import './App.css'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore()
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="min-h-screen">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/skills/:name" element={<SkillDetailPage />} />
            <Route path="/skills/:name/edit" element={
              <ProtectedRoute><EditSkillPage /></ProtectedRoute>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/upload" element={
              <ProtectedRoute><UploadPage /></ProtectedRoute>
            } />
            <Route path="/profile/:username" element={<ProfilePage />} />
          </Routes>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            className: '',
            style: {},
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
