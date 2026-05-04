import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { canAccessFeature, featureLabel, getFeatureUpgradeMessage, type PlanFeatureKey } from '../lib/planAccess';

type PlanFeatureRouteProps = {
  feature: PlanFeatureKey;
  children: JSX.Element;
};

export function PlanFeatureRoute({ feature, children }: PlanFeatureRouteProps) {
  const { tenant } = useAuthStore();
  const planName = tenant?.subscription?.plan?.name || 'START';

  if (!canAccessFeature(planName, feature)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recurso bloqueado</p>
          <h2 className="text-xl font-bold text-slate-900 mt-2">{featureLabel(feature)}</h2>
          <p className="text-sm text-slate-600 mt-3">
            {getFeatureUpgradeMessage(feature)}
          </p>
          <div className="mt-5 flex gap-3">
            <Link to="/dashboard" className="btn bg-slate-100 text-slate-700 hover:bg-slate-200">
              Voltar ao Painel
            </Link>
            <Link to="/settings" className="btn btn-primary">
              Ver Planos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
