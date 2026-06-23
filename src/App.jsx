import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { SelectBusiness } from './pages/dashboard/SelectBusiness'
import { CreateBusiness } from './pages/dashboard/CreateBusiness'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return !user ? children : <Navigate to="/dashboard" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><SelectBusiness /></PrivateRoute>} />
      <Route path="/dashboard/new" element={<PrivateRoute><CreateBusiness /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}