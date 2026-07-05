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
        <div className="max-w-xl w-full bg-surface-900 border border-line rounded-lg p-6 shadow-sm">
          <p className="text-xs font-bold text-surface-500 uppercase tracking-widest">Recurso bloqueado</p>
          <h2 className="text-xl font-bold text-surface-50 mt-2">{featureLabel(feature)}</h2>
          <p className="text-sm text-surface-300 mt-3">
            {getFeatureUpgradeMessage(feature)}
          </p>
          <div className="mt-5 flex gap-3">
            <Link to="/dashboard" className="btn bg-surface-800 text-surface-200 hover:bg-ink/5">
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
