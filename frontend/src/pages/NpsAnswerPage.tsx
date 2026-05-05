import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { npsApi } from '../api/client';
import { CheckCircle2, Loader2 } from 'lucide-react';

const SCORES = Array.from({ length: 11 }, (_, i) => i);

function scoreColor(n: number) {
  if (n >= 9) return 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500';
  if (n >= 7) return 'bg-amber-400 hover:bg-amber-500 text-white border-amber-400';
  return 'bg-red-500 hover:bg-red-600 text-white border-red-500';
}

function scoreIdleColor(n: number) {
  if (n >= 9) return 'border-emerald-300 text-emerald-600 hover:bg-emerald-50';
  if (n >= 7) return 'border-amber-300 text-amber-600 hover:bg-amber-50';
  return 'border-red-300 text-red-600 hover:bg-red-50';
}

export function NpsAnswerPage() {
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) return;
    npsApi.getForm(token)
      .then((res) => setFormData(res.data))
      .catch(() => setLoadError('Link inválido ou expirado. Por favor, solicite uma nova pesquisa.'));
  }, [token]);

  const handleSubmit = async () => {
    if (score === null) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await npsApi.respond(token!, { score, comment: comment.trim() || undefined });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? 'Não foi possível enviar sua avaliação. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // — States —
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <p className="text-red-500 font-medium">{loadError}</p>
      </div>
    </div>
  );

  if (!formData) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );

  if (formData.answeredAt) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900">Você já respondeu essa pesquisa!</h1>
        <p className="text-slate-500 mt-2">Obrigado pela sua avaliação.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Obrigado pela avaliação! 🙏</h1>
        <p className="text-slate-500 mt-2">
          Sua opinião é muito importante para continuarmos melhorando o nosso serviço.
        </p>
        {score !== null && score >= 9 && (
          <p className="text-emerald-600 font-medium mt-4">
            Fico feliz que tenha gostado! Indique-nos aos amigos 😊
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">Como foi sua experiência conosco?</h1>
          {formData.customer?.name && (
            <p className="text-slate-500 mt-1">Olá, <strong>{formData.customer.name}</strong>!</p>
          )}
          <p className="text-sm text-slate-400 mt-1">
            Sua avaliação nos ajuda a melhorar nosso serviço.
          </p>
        </div>

        {/* Score */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3 text-center">
            De 0 a 10, qual a probabilidade de nos recomendar a um amigo ou familiar?
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SCORES.map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all
                  ${score === n ? scoreColor(n) : `bg-white ${scoreIdleColor(n)}`}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
            <span>Muito improvável</span>
            <span>Extremamente provável</span>
          </div>
        </div>

        {/* Comentário */}
        {score !== null && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Conte-nos um pouco mais (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="O que podemos melhorar? O que você achou ótimo?"
            />
          </div>
        )}

        {/* Submit */}
        {submitError && (
          <p className="text-sm text-red-500 text-center">{submitError}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={score === null || submitting}
          className="w-full py-3 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Enviar avaliação
        </button>
      </div>
    </div>
  );
}
