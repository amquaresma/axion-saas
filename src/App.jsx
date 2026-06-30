import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { SelectBusiness } from './pages/dashboard/SelectBusiness'
import { CreateBusiness } from './pages/dashboard/CreateBusiness'
import { BusinessLayout } from './layouts/BusinessLayout'
import { BusinessDashboard } from './pages/business/Dashboard'
import { Clients } from './pages/business/Clients'
import { Services } from './pages/business/Services'
import { Finance } from './pages/business/Finance'
import { Inventory } from './pages/business/Inventory'
import { Employees } from './pages/business/Employees'
import { WorkOrders } from './pages/business/WorkOrders'
import { Equipment } from './pages/business/Equipment'

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
      <Route path="/b/:businessId" element={<PrivateRoute><BusinessLayout><Navigate to="dashboard" /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/dashboard" element={<PrivateRoute><BusinessLayout><BusinessDashboard /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/clientes" element={<PrivateRoute><BusinessLayout><Clients /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/servicos" element={<PrivateRoute><BusinessLayout><Services /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/financeiro" element={<PrivateRoute><BusinessLayout><Finance /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/estoque" element={<PrivateRoute><BusinessLayout><Inventory /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/funcionarios" element={<PrivateRoute><BusinessLayout><Employees /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/ordens-servico" element={<PrivateRoute><BusinessLayout><WorkOrders /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/equipamentos" element={<PrivateRoute><BusinessLayout><Equipment /></BusinessLayout></PrivateRoute>} />
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
