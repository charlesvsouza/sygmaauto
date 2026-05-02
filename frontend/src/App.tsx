import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { SuperAdminRoute } from './components/SuperAdminRoute';
import { Layout } from './components/Layout';
import { InitialSplash } from './pages/InitialSplash';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { NewsPage } from './pages/NewsPage';
import { SolutionsPage } from './pages/SolutionsPage';
import { AboutPage } from './pages/AboutPage';
import { DifferentialsPage } from './pages/DifferentialsPage';
import { ContactPage } from './pages/ContactPage';
import { SupportPage } from './pages/SupportPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ActivateTenantPage } from './pages/ActivateTenantPage';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage';
import { CheckoutCancelPage } from './pages/CheckoutCancelPage';
import { PlansCheckoutPage } from './pages/PlansCheckoutPage';
import WelcomePage from './pages/WelcomePage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { ServiceOrdersPage } from './pages/ServiceOrdersPage';
import { ServicesPage } from './pages/ServicesPage';
import { InventoryPage } from './pages/InventoryPage';
import { FinancialPage } from './pages/FinancialPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { SuperAdminLoginPage } from './pages/SuperAdminLoginPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Landing comercial */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/noticias" element={<NewsPage />} />
        <Route path="/solucoes" element={<SolutionsPage />} />
        <Route path="/quem-somos" element={<AboutPage />} />
        <Route path="/diferenciais" element={<DifferentialsPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/suporte" element={<SupportPage />} />
        <Route path="/privacidade" element={<PrivacyPolicyPage />} />
        <Route path="/splash" element={<InitialSplash />} />
        
        {/* Área de Gestão Global — protegida por token de super admin */}
        <Route path="/admin/login" element={<SuperAdminLoginPage />} />
        <Route element={<SuperAdminRoute />}>
          <Route path="/admin" element={<SuperAdminPage />} />
        </Route>

        <Route path="/activate/:token" element={<ActivateTenantPage />} />
        <Route path="/planos" element={<PlansCheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />

        
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        
        {/* Splash Pós-Login com resumo de funcionalidades (30s) */}
        <Route path="/welcome" element={<WelcomePage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/service-orders" element={<ServiceOrdersPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/financial" element={<FinancialPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}