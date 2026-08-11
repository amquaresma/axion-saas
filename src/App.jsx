import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { ResetPassword } from './pages/auth/ResetPassword'
import { SelectBusiness } from './pages/dashboard/SelectBusiness'
import { CreateBusiness } from './pages/dashboard/CreateBusiness'
import { BusinessLayout } from './layouts/BusinessLayout'
import { BusinessDashboard } from './pages/business/Dashboard'
import { Quotes } from './pages/business/Quotes'
import { Orders } from './pages/business/Orders'
import { Clients } from './pages/business/Clients'
import { Services } from './pages/business/Services'
import { Finance } from './pages/business/Finance'
import { Bills } from './pages/business/Bills'
import { BankAccounts } from './pages/business/BankAccounts'
import { Transfers } from './pages/business/Transfers'
import { Inventory } from './pages/business/Inventory'
import { InventoryMovements } from './pages/business/InventoryMovements'
import { Employees } from './pages/business/Employees'
import { EmployeeAdvances } from './pages/business/EmployeeAdvances'
import { EmployeeVacations } from './pages/business/EmployeeVacations'
import { EmployeeHours } from './pages/business/EmployeeHours'
import { WorkOrders } from './pages/business/WorkOrders'
import { Equipment } from './pages/business/Equipment'
import { Tools } from './pages/business/Tools'
import { Agenda } from './pages/business/Agenda'
import { ControlCenter } from './pages/business/ControlCenter'
import { Reports } from './pages/business/Reports'
import { BusinessHealth } from './pages/business/BusinessHealth'
import { AIAssistant } from './pages/business/AIAssistant'
import { FiscalNotes } from './pages/business/FiscalNotes'
import { TaxRecords } from './pages/business/TaxRecords'
import { Settings } from './pages/settings/Settings'
import { Notifications } from './pages/Notifications'

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
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<PrivateRoute><SelectBusiness /></PrivateRoute>} />
      <Route path="/dashboard/new" element={<PrivateRoute><CreateBusiness /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/b/:businessId" element={<PrivateRoute><BusinessLayout><Navigate to="dashboard" /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/dashboard" element={<PrivateRoute><BusinessLayout><BusinessDashboard /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/orcamentos" element={<PrivateRoute><BusinessLayout><Quotes /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/pedidos" element={<PrivateRoute><BusinessLayout><Orders /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/clientes" element={<PrivateRoute><BusinessLayout><Clients /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/servicos" element={<PrivateRoute><BusinessLayout><Services /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/financeiro" element={<PrivateRoute><BusinessLayout><Finance /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/contas" element={<PrivateRoute><BusinessLayout><Bills /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/bancos" element={<PrivateRoute><BusinessLayout><BankAccounts /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/transferencias" element={<PrivateRoute><BusinessLayout><Transfers /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/estoque" element={<PrivateRoute><BusinessLayout><Inventory /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/movimentacoes" element={<PrivateRoute><BusinessLayout><InventoryMovements /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/funcionarios" element={<PrivateRoute><BusinessLayout><Employees /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/adiantamentos" element={<PrivateRoute><BusinessLayout><EmployeeAdvances /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/ferias" element={<PrivateRoute><BusinessLayout><EmployeeVacations /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/horas" element={<PrivateRoute><BusinessLayout><EmployeeHours /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/ordens-servico" element={<PrivateRoute><BusinessLayout><WorkOrders /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/equipamentos" element={<PrivateRoute><BusinessLayout><Equipment /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/ferramentas" element={<PrivateRoute><BusinessLayout><Tools /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/agenda" element={<PrivateRoute><BusinessLayout><Agenda /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/controle" element={<PrivateRoute><BusinessLayout><ControlCenter /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/relatorios" element={<PrivateRoute><BusinessLayout><Reports /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/saude" element={<PrivateRoute><BusinessLayout><BusinessHealth /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/ia" element={<PrivateRoute><BusinessLayout><AIAssistant /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/notas-fiscais" element={<PrivateRoute><BusinessLayout><FiscalNotes /></BusinessLayout></PrivateRoute>} />
      <Route path="/b/:businessId/impostos" element={<PrivateRoute><BusinessLayout><TaxRecords /></BusinessLayout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
