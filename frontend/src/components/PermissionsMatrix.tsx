import { useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, RotateCcw } from 'lucide-react';
import { permissionsApi } from '../api/client';
import { usePermissionStore } from '../lib/permissions';
import { cn } from '../lib/utils';
import { useToast } from './ui';

type Capability = { key: string; group: string; label: string; hint: string; roles: string[]; defaults: string[] };
type Matrix = { roles: string[]; capabilities: Capability[] };

const ROLE_LABEL: Record<string, string> = {
  GERENTE: 'Gerente',
  CHEFE_OFICINA: 'Chefe de oficina',
  MECANICO: 'Mecânico',
  SECRETARIA: 'Secretaria',
  FINANCEIRO: 'Financeiro',
};

// Quem pode o quê nesta oficina. Master e Admin sempre podem tudo; os demais perfis são ajustáveis.
export function PermissionsMatrix({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const apply = (m: Matrix) => {
    setMatrix(m);
    setDraft(Object.fromEntries(m.capabilities.map((c) => [c.key, c.roles])));
  };

  useEffect(() => {
    permissionsApi.getMatrix().then((r) => apply(r.data)).catch(() => toast.error('Não foi possível carregar as permissões.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => {
    if (!matrix) return false;
    return matrix.capabilities.some((c) => {
      const a = [...(draft[c.key] ?? [])].sort().join();
      return a !== [...c.roles].sort().join();
    });
  }, [matrix, draft]);

  const toggle = (key: string, role: string) => {
    if (!canEdit) return;
    setDraft((prev) => {
      const cur = prev[key] ?? [];
      return { ...prev, [key]: cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role] };
    });
  };

  const restoreDefaults = () => {
    if (!matrix) return;
    setDraft(Object.fromEntries(matrix.capabilities.map((c) => [c.key, c.defaults])));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await permissionsApi.saveMatrix(draft);
      apply(res.data);
      usePermissionStore.getState().load(true); // atualiza as permissões do próprio usuário
      toast.success('Permissões salvas.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Não foi possível salvar as permissões.');
    } finally {
      setSaving(false);
    }
  };

  if (!matrix) {
    return <div className="p-6 text-sm text-surface-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Carregando permissões...</div>;
  }

  const groups = [...new Set(matrix.capabilities.map((c) => c.group))];

  return (
    <section className="p-6 space-y-5" aria-labelledby="perm-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="perm-title" className="text-lg font-bold text-surface-50">Permissões por perfil</h3>
          <p className="mt-1 text-sm text-surface-500">
            Marque o que cada perfil pode fazer nesta oficina. <strong className="text-surface-200">Master e Admin</strong> sempre podem tudo e não aparecem aqui.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button type="button" onClick={restoreDefaults} className="btn-secondary h-10 rounded-md px-3 text-sm font-semibold inline-flex items-center gap-1.5">
              <RotateCcw size={14} /> Restaurar padrão
            </button>
            <button type="button" onClick={save} disabled={!dirty || saving} className="btn btn-primary h-10 rounded-md px-5 text-sm font-semibold disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar permissões'}
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <p className="inline-flex items-center gap-1.5 rounded bg-surface-800 px-2 py-1 text-xs font-semibold text-surface-500"><Lock size={12} /> Somente Master e Admin alteram</p>
      )}
      {dirty && <p role="status" className="text-sm font-semibold text-amber-700">Alterações pendentes: clique em Salvar permissões.</p>}

      {groups.map((group) => (
        <div key={group} className="overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full text-sm">
            <caption className="sr-only">{group}</caption>
            <thead className="bg-panel-2">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-surface-50">{group}</th>
                {matrix.roles.map((r) => (
                  <th key={r} scope="col" className="px-3 py-3 text-center text-xs font-semibold text-surface-500">{ROLE_LABEL[r] ?? r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {matrix.capabilities.filter((c) => c.group === group).map((c) => (
                <tr key={c.key}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block font-semibold text-surface-50">{c.label}</span>
                    <span className="block text-xs text-surface-500">{c.hint}</span>
                  </th>
                  {matrix.roles.map((r) => {
                    const on = (draft[c.key] ?? []).includes(r);
                    const isDefault = c.defaults.includes(r) === on;
                    return (
                      <td key={r} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${ROLE_LABEL[r] ?? r}: ${c.label}`}
                          checked={on}
                          disabled={!canEdit}
                          onChange={() => toggle(c.key, r)}
                          className={cn('h-5 w-5 cursor-pointer rounded accent-[rgb(13,125,110)] disabled:cursor-not-allowed', !isDefault && 'ring-2 ring-amber-400')}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="text-xs text-surface-500">Caixa com contorno âmbar = diferente do padrão do sistema.</p>
    </section>
  );
}
