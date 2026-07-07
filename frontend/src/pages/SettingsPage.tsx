import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { tenantsApi, subscriptionsApi, usersApi } from '../api/client';
import {
  Building,
  Users,
  Shield,
  Loader2,
  CheckCircle,
  Zap,
  ArrowRight,
  Wrench,
  Lock,
  Search,
  AlertCircle,
  Palette,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui';
import {
  formatCpfCnpj,
  formatPhone,
  formatCep,
  lookupCnpj,
  onlyDigits,
} from '../lib/masks';
import { applyThemePreset, getStoredThemePreset, THEME_PRESETS, type ThemePresetId } from '../lib/themePresets';
import { getPlanLabel, getPlanRank } from '../lib/planAccess';

type TenantForm = {
  taxId: string;
  legalNature: string;
  name: string;
  legalName: string;
  tradeName: string;
  whatsappMetaPhoneNumberId: string;
  whatsappDisplayNumber: string;
  stateRegistration: string;
  municipalRegistration: string;
  phone: string;
  email: string;
  address: string;
};

export function SettingsPage() {
  const { user, updateTenant } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoCheckoutHandledRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOps, setSavingOps] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [opsSuccess, setOpsSuccess] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [lookingUpDoc, setLookingUpDoc] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [tenantData, setTenantData] = useState<TenantForm>({
    taxId: '',
    legalNature: 'PJ',
    name: '',
    legalName: '',
    tradeName: '',
    whatsappMetaPhoneNumberId: '',
    whatsappDisplayNumber: '',
    stateRegistration: '',
    municipalRegistration: '',
    phone: '',
    email: '',
    address: '',
  });
  const [opsData, setOpsData] = useState({ laborHourlyRate: 120, diagnosticHours: 0.5, defaultCommissionPercent: 0 });
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [themePreset, setThemePreset] = useState<ThemePresetId>(getStoredThemePreset());
  const currentPlan = subscription?.plan?.name || 'START';
  const isUpgrade = (planName: string) => getPlanRank(planName) > getPlanRank(currentPlan);
  const isDowngrade = (planName: string) => getPlanRank(planName) < getPlanRank(currentPlan);

  const isMaster = user?.role === 'MASTER';
  const canManageUsers = user?.role === 'MASTER' || user?.role === 'ADMIN';
  const isTradeNameMissing = !tenantData.name.trim();

  const ROLE_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
    MASTER:     { label: 'Master',     color: 'bg-accent text-white',          desc: 'Proprietário — acesso total' },
    ADMIN:      { label: 'Admin',      color: 'bg-violet-500/15 text-violet-700',    desc: 'Gerência administrativa' },
    GERENTE:    { label: 'Gerente',    color: 'bg-blue-500/15 text-blue-700',        desc: 'Gerência operacional' },
    CHEFE_OFICINA: { label: 'Chefe Oficina', color: 'bg-rose-500/15 text-rose-700',  desc: 'Liderança técnica por área' },
    FINANCEIRO: { label: 'Financeiro', color: 'bg-emerald-500/15 text-emerald-700',  desc: 'Fechamento e pagamentos' },
    SECRETARIA: { label: 'Secretaria', color: 'bg-cyan-500/15 text-cyan-700',        desc: 'Recepção e cadastros' },
    MECANICO:   { label: 'Mecânico',   color: 'bg-amber-500/15 text-amber-700',      desc: 'Execução de serviços' },
    PRODUTIVO:  { label: 'Produtivo',  color: 'bg-amber-500/15 text-amber-700',      desc: 'Técnico (legado)' },
  };

  useEffect(() => { loadData(); }, []);

  const handleThemeChange = (presetId: ThemePresetId) => {
    setThemePreset(presetId);
    applyThemePreset(presetId);
  };

  const loadData = async () => {
    try {
      const [tenantResult, subResult, plansResult, usersResult] = await Promise.allSettled([
        tenantsApi.getMe(),
        subscriptionsApi.getCurrent(),
        subscriptionsApi.getPlans(),
        usersApi.getAll(),
      ]);

      if (tenantResult.status === 'fulfilled') {
        const t = tenantResult.value.data;
        setTenantData({
          taxId: t.taxId || '',
          legalNature: t.legalNature || 'PJ',
          name: t.name || '',
          legalName: t.legalName || '',
          tradeName: t.tradeName || '',
          whatsappMetaPhoneNumberId: t.whatsappMetaPhoneNumberId || '',
          whatsappDisplayNumber: t.whatsappDisplayNumber || '',
          stateRegistration: t.stateRegistration || '',
          municipalRegistration: t.municipalRegistration || '',
          phone: t.phone || '',
          email: t.email || '',
          address: t.address || '',
        });
        setOpsData({
          laborHourlyRate: t.laborHourlyRate ?? 120,
          diagnosticHours: t.diagnosticHours ?? 0.5,
          defaultCommissionPercent: t.defaultCommissionPercent ?? 0,
        });
      } else {
        console.error('Falha ao carregar dados da oficina:', tenantResult.reason);
      }

      if (subResult.status === 'fulfilled') setSubscription(subResult.value.data);
      else console.warn('Assinatura indisponível:', subResult.reason);

      if (plansResult.status === 'fulfilled') setPlans(plansResult.value.data);
      else console.warn('Planos indisponíveis:', plansResult.reason);

      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data);
      else console.warn('Usuários indisponíveis:', usersResult.reason);
    } finally {
      setLoading(false);
    }
  };

  const handleDocChange = async (raw: string) => {
    const formatted = formatCpfCnpj(raw);
    const digits = onlyDigits(formatted);
    setTenantData(prev => ({ ...prev, taxId: formatted }));
    setLookupError(null);

    if (digits.length === 14) {
      setLookingUpDoc(true);
      const result = await lookupCnpj(digits);
      setLookingUpDoc(false);
      if (result) {
        setTenantData(prev => ({
          ...prev,
          taxId: formatted,
          legalName: result.razaoSocial || prev.legalName,
          name: result.nomeFantasia || prev.name,
          tradeName: result.nomeFantasia || prev.tradeName,
          phone: result.telefone || prev.phone,
          email: result.email || prev.email,
          address: result.logradouro || prev.address,
        }));
      } else {
        setLookupError('CNPJ não encontrado na Receita Federal. Preencha manualmente.');
      }
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await tenantsApi.update(tenantData);
      // Recarrega dados atualizados e sincroniza o authStore (atualiza nome na sidebar)
      const freshRes = await tenantsApi.getMe();
      const fresh = freshRes.data;
      updateTenant({
        id: fresh.id,
        name: fresh.name,
        subscription: fresh.subscription,
      });
      // Atualiza também o estado local para refletir os dados salvos
      setTenantData(prev => ({ ...prev, ...tenantData }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Falha ao salvar oficina:', error);
      setSaveError(error?.response?.data?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOps = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOps(true);
    setOpsError(null);
    setOpsSuccess(false);
    try {
      await tenantsApi.update({
        laborHourlyRate: Number(opsData.laborHourlyRate),
        diagnosticHours: Number(opsData.diagnosticHours),
        defaultCommissionPercent: Number(opsData.defaultCommissionPercent),
      });
      setOpsSuccess(true);
      setTimeout(() => setOpsSuccess(false), 3000);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Falha ao salvar configurações operacionais.';
      setOpsError(Array.isArray(msg) ? msg.join(', ') : msg);
      setTimeout(() => setOpsError(null), 5000);
    } finally {
      setSavingOps(false);
    }
  };

  const handleCheckoutPlan = async (planName: string) => {
    setCheckoutLoadingPlan(planName);
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/settings?checkout=success&plan=${planName}`;
      const cancelUrl = `${origin}/settings?checkout=cancel`;
      const response = await subscriptionsApi.createCheckout(planName, successUrl, cancelUrl);
      const checkoutUrl = response.data?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error('Checkout indisponível para este plano');
      }

      // Navega na aba atual para evitar bloqueio de popup do navegador
      window.location.href = checkoutUrl;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Falha ao iniciar checkout online';
      toast.error(message);
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  useEffect(() => {
    if (loading || autoCheckoutHandledRef.current) return;

    const requestedPlan = (searchParams.get('autocheckout') || '').toUpperCase();
    if (!requestedPlan) return;

    autoCheckoutHandledRef.current = true;
    const requested = plans.find((plan) => String(plan.name || '').toUpperCase() === requestedPlan);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('autocheckout');
    setSearchParams(nextParams, { replace: true });

    if (!requested) {
      // Plano não encontrado — ignora silenciosamente (não interrompe o usuário)
      return;
    }

    // Não bloquear checkout mesmo que o plano seja o atual
    // (usuário pode estar saindo do trial para pagamento ou renovando)
    void handleCheckoutPlan(requested.name);
  }, [currentPlan, loading, plans, searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-surface-50" />
        <p className="text-surface-400 font-medium">Carregando painel de controle...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-surface-50 tracking-tight uppercase">Configurações</h1>
        <p className="text-surface-400 font-medium text-sm">Gestão da oficina, operações, equipe e assinatura</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Perfil da Oficina */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-900 rounded-lg border border-line shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-surface-950/40">
              <h2 className="text-base font-bold text-surface-50 flex items-center gap-2">
                <Building className="w-5 h-5" /> Cadastro da Oficina
              </h2>
            </div>
            <form onSubmit={handleSaveTenant} className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1º campo: CPF / CNPJ com lookup automático */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-200 mb-1">
                    CPF / CNPJ
                    <span className="ml-2 text-xs text-surface-500 font-normal">(preencha primeiro — CNPJ busca dados automaticamente)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={tenantData.legalNature === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                      value={tenantData.taxId}
                      onChange={(e) => handleDocChange(e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-accent transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {lookingUpDoc
                        ? <Loader2 className="w-4 h-4 animate-spin text-accent-ink" />
                        : <Search className="w-4 h-4 text-surface-500" />}
                    </div>
                  </div>
                  {lookupError && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5" /> {lookupError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">Natureza Jurídica</label>
                  <select
                    value={tenantData.legalNature}
                    onChange={(e) => setTenantData({ ...tenantData, legalNature: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  >
                    <option value="PF">Pessoa Física (PF)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tenantData.name}
                    onChange={(e) => setTenantData({ ...tenantData, name: e.target.value })}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm transition-all',
                      isTradeNameMissing
                        ? 'border-amber-500/40 bg-amber-500/10/40 focus:ring-2 focus:ring-amber-500'
                        : 'border-line focus:ring-2 focus:ring-accent',
                    )}
                  />
                  {isTradeNameMissing && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Preencha o Nome Fantasia para exibir corretamente em orçamentos, O.S. e relatórios.
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-200 mb-1">Razão Social / Nome Civil</label>
                  <input
                    type="text"
                    value={tenantData.legalName}
                    onChange={(e) => setTenantData({ ...tenantData, legalName: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">WhatsApp Phone Number ID (Meta)</label>
                  <input
                    type="text"
                    value={tenantData.whatsappMetaPhoneNumberId}
                    onChange={(e) => setTenantData({ ...tenantData, whatsappMetaPhoneNumberId: e.target.value })}
                    placeholder="Ex: 123456789012345"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">Número exibido no WhatsApp</label>
                  <input
                    type="text"
                    value={tenantData.whatsappDisplayNumber}
                    onChange={(e) => setTenantData({ ...tenantData, whatsappDisplayNumber: e.target.value })}
                    placeholder="Ex: +55 21 99999-9999"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">Inscrição Estadual</label>
                  <input
                    type="text"
                    value={tenantData.stateRegistration}
                    onChange={(e) => setTenantData({ ...tenantData, stateRegistration: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">Inscrição Municipal</label>
                  <input
                    type="text"
                    value={tenantData.municipalRegistration}
                    onChange={(e) => setTenantData({ ...tenantData, municipalRegistration: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">Telefone</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="(00) 00000-0000"
                    value={tenantData.phone}
                    onChange={(e) => setTenantData({ ...tenantData, phone: formatPhone(e.target.value) })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-200 mb-1">E-mail</label>
                  <input
                    type="email"
                    inputMode="email"
                    placeholder="contato@suaoficina.com.br"
                    value={tenantData.email}
                    onChange={(e) => setTenantData({ ...tenantData, email: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-200 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={tenantData.address}
                    onChange={(e) => setTenantData({ ...tenantData, address: e.target.value })}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>
              </div>

              {saveError && (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                </p>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Perfil salvo!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-accent px-5 py-2 text-xs font-bold text-white hover:bg-accent-hover disabled:opacity-50 shadow-sm transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide"
                >
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Configurações Operacionais */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface-900 rounded-lg border border-line shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-line bg-surface-950/40 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-50 flex items-center gap-2 uppercase tracking-wide">
                <Wrench className="w-5 h-5" /> Operações
              </h2>
              {!isMaster && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-surface-500 bg-surface-800 px-2 py-1 rounded">
                  <Lock className="w-3 h-3" /> Admin
                </div>
              )}
            </div>
            <form onSubmit={handleSaveOps} className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wide ml-1">
                    Mão de Obra (R$/h)
                  </label>
                  <p className="text-[11px] text-surface-500 ml-1 mb-1">
                    Base de cálculo para mão de obra.
                  </p>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-surface-500 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={opsData.laborHourlyRate}
                      onChange={(e) => isMaster && setOpsData({ ...opsData, laborHourlyRate: Number(e.target.value) })}
                      disabled={!isMaster}
                      className={cn(
                        "w-full pl-10 pr-4 py-2 rounded-lg border text-base font-bold transition-all",
                        isMaster
                          ? "border-line bg-surface-950/40 focus:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                          : "border-line bg-surface-950/40 text-surface-500 cursor-not-allowed"
                      )}
                    />
                  </div>
                </div>

                {/* Preview do cálculo */}
                <div className="p-3 bg-surface-950/40 rounded-lg border border-line space-y-2">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Exemplos</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[0.5, 1.0, 2.0].map((h) => (
                      <div key={h} className="bg-surface-900 rounded-lg p-2 border border-line">
                        <p className="text-[10px] text-surface-500 font-bold">{h === 0.5 ? '30m' : h === 1.0 ? '1h' : '2h'}</p>
                        <p className="text-xs font-bold text-surface-50 mt-0.5">
                          R$ {(opsData.laborHourlyRate * h).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campo: Horas de Diagnóstico */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wide ml-1">Diagnóstico (h)</label>
                  <p className="text-[11px] text-surface-500 ml-1 mb-1">
                    Tempo padrão para diagnóstico.
                  </p>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-surface-500 font-bold text-sm">h</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={opsData.diagnosticHours}
                      onChange={(e) => isMaster && setOpsData({ ...opsData, diagnosticHours: Number(e.target.value) })}
                      disabled={!isMaster}
                      className={cn(
                        "w-full pl-10 pr-4 py-2 rounded-lg border text-base font-bold transition-all",
                        isMaster
                          ? "border-line bg-surface-950/40 focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                          : "border-line bg-surface-950/40 text-surface-500 cursor-not-allowed"
                      )}
                    />
                  </div>
                  <p className="text-[10px] text-surface-500 ml-1 mt-1">
                    ≈ R$ {(opsData.laborHourlyRate * opsData.diagnosticHours).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wide ml-1">Comissão Global (%)</label>
                  <p className="text-[11px] text-surface-500 ml-1 mb-1">
                    Valor padrão quando não há comissão individual.
                  </p>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-surface-500 font-bold text-sm">%</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={opsData.defaultCommissionPercent}
                      onChange={(e) => isMaster && setOpsData({ ...opsData, defaultCommissionPercent: Number(e.target.value) })}
                      disabled={!isMaster}
                      className={cn(
                        "w-full pl-12 pr-5 py-4 rounded-lg border text-xl font-bold transition-all",
                        isMaster
                          ? "border-line bg-surface-950/40 focus:ring-4 focus:ring-accent/40 focus:border-accent/40"
                          : "border-line bg-surface-950/40 text-surface-500 cursor-not-allowed"
                      )}
                    />
                  </div>
                </div>
              </div>

              {isMaster && (
                <div className="space-y-2 pt-2">
                  {opsError && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {opsError}
                    </div>
                  )}
                  {opsSuccess && (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                      ✓ Configurações operacionais salvas com sucesso!
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button type="submit" disabled={savingOps} className="btn btn-primary h-14 px-10 rounded-lg font-bold shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
                      {savingOps ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Operações'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>

          {/* Aparência */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-surface-900 rounded-lg border border-line shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-line bg-surface-950/40 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-surface-50 flex items-center gap-2 uppercase tracking-wide">
                  <Palette className="w-5 h-5" /> Aparência
                </h2>
                <p className="text-xs text-surface-400 mt-0.5">Tema visual da plataforma</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">Tema</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                {THEME_PRESETS.map((preset) => {
                  const active = themePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleThemeChange(preset.id)}
                      className={cn(
                        'text-left rounded-lg border p-3 transition-all',
                        active
                          ? 'border-accent bg-accent-soft shadow-sm ring-1 ring-accent'
                          : 'border-line bg-panel hover:border-line-strong hover:shadow-sm'
                      )}
                    >
                      {/* Swatches */}
                      <div className="flex gap-1 mb-2">
                        {preset.swatches.map((color, i) => (
                          <span
                            key={i}
                            className="block h-4 rounded-sm flex-1 border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className={cn('text-xs font-bold uppercase tracking-wide', active ? 'text-accent-ink' : 'text-ink')}>{preset.label}</p>
                      <p className="text-[10px] text-muted mt-0.5 leading-tight">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Equipe */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-900 rounded-lg border border-line shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-line bg-surface-950/40 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-surface-50 flex items-center gap-2 uppercase tracking-wide">
                  <Users className="w-5 h-5" /> Sua Equipe
                </h2>
                <p className="text-xs text-surface-400 mt-0.5">{users.length} membro{users.length !== 1 ? 's' : ''}</p>
              </div>
              {canManageUsers && (
                <button
                  onClick={() => navigate('/users')}
                  className="flex items-center gap-1 px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent-hover transition-all uppercase tracking-wide"
                >
                  Gerenciar <ArrowRight size={12} />
                </button>
              )}
            </div>

            <div className="p-5">
              {users.length === 0 ? (
                <p className="text-center text-xs text-surface-500 py-6">Nenhum membro cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role] ?? { label: u.role, color: 'bg-surface-800 text-surface-200', desc: '' };
                    const isMe = u.id === user?.userId;

                    return (
                      <div
                        key={u.id}
                        className={cn(
                          'flex flex-col p-3 rounded-lg border transition-all',
                          u.isActive ? 'bg-surface-950/40 border-line hover:border-line' : 'bg-surface-950/40 border-line opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0', roleCfg.color)}>
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-surface-50 text-xs truncate">{u.name}</p>
                            {isMe && <span className="text-[8px] px-1 py-0.5 bg-primary-100 text-primary-700 rounded font-bold">Você</span>}
                          </div>
                        </div>
                        <p className="text-[10px] text-surface-400 truncate mb-2">{u.email}</p>
                        <div className="flex items-center justify-between">
                          <span className={cn('text-[8px] px-2 py-1 rounded font-bold', roleCfg.color)}>
                            {roleCfg.label}
                          </span>
                          {!u.isActive && <span className="text-[8px] px-1.5 py-0.5 bg-red-500/15 text-red-600 rounded font-bold">Inativo</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar — Assinatura */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-panel rounded-lg p-6 text-ink shadow-sm border border-line relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-base font-bold flex items-center gap-2 uppercase tracking-wide mb-5">
                <Shield className="w-5 h-5 text-accent-ink" /> Assinatura
              </h2>

              <div className="mb-6 p-4 bg-ink/5 rounded-lg border border-line backdrop-blur-md">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1">Plano Atual</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-ink">{getPlanLabel(currentPlan)}</h3>
                  <div className="px-2 py-0.5 bg-accent text-white rounded text-[8px] font-bold uppercase">Ativo</div>
                </div>
                <p className="text-xs text-surface-500 mt-1 font-medium">Renovação automática em breve.</p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider ml-1">Mudar de Plano</p>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      'w-full p-3.5 rounded-lg border-2 transition-all text-left relative',
                      currentPlan === plan.name
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-ink/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm uppercase tracking-tight">{getPlanLabel(plan.name)}</p>
                          {(plan.name === 'PRO' || plan.name === 'RETIFICA_PRO') && <Zap size={12} className="text-accent-ink fill-accent" />}
                        </div>
                        <p className="text-lg font-bold mt-0.5">
                          R$ {Number(plan.price).toLocaleString('pt-BR')}
                          <span className="text-[10px] font-bold text-surface-500 ml-1">/mês</span>
                        </p>
                      </div>
                      {currentPlan === plan.name
                        ? <CheckCircle className="text-accent-ink" size={20} />
                        : <ArrowRight className="text-surface-300" size={20} />
                      }
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {isDowngrade(plan.name) ? (
                        <div className="h-8 rounded-lg bg-ink/5 border border-line flex items-center justify-center gap-1.5 px-3">
                          <Lock size={10} className="text-surface-400" />
                          <span className="text-[9px] font-bold uppercase tracking-tight text-surface-400">Após vencimento</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => currentPlan !== plan.name && handleCheckoutPlan(plan.name)}
                          disabled={currentPlan === plan.name || checkoutLoadingPlan === plan.name}
                          className="h-8 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold uppercase tracking-tight transition-all flex items-center justify-center gap-1.5"
                        >
                          {checkoutLoadingPlan === plan.name ? <Loader2 size={12} className="animate-spin" /> : null}
                          {isUpgrade(plan.name) ? 'Upgrade' : 'Atual'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
