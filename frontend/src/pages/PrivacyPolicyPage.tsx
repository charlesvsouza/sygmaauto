import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SigmaAutoLogo } from '../components/SigmaAutoLogo';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-[#090e17] text-white"
      style={{ fontFamily: '"Space Grotesk", "Manrope", sans-serif' }}
    >
      {/* Glow ambiente */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10rem] left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full bg-[#ff7b2f]/8 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#090e17]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <span className="text-white/20">|</span>
          <SigmaAutoLogo variant="compact" size={28} />
        </div>
      </header>

      {/* Conteúdo */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 pb-24">
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-3">Documento Legal</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Política de Privacidade</h1>
          <p className="text-white/40 text-sm">
            Última atualização: 1 de maio de 2026 &nbsp;·&nbsp; Versão 1.0
          </p>
        </div>

        <div className="space-y-10 text-white/75 leading-relaxed text-[15px]">

          {/* Intro */}
          <section>
            <p>
              A <strong className="text-white">SigmaAuto</strong> ("nós", "nosso" ou "empresa") tem o compromisso de proteger a privacidade das pessoas que utilizam nossa plataforma de gestão para oficinas mecânicas, disponível em <a href="https://sigmaauto.com.br" className="text-[#ff7b2f] hover:underline">sigmaauto.com.br</a>.
            </p>
            <p className="mt-4">
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos, compartilhamos e protegemos seus dados pessoais, em conformidade com a <strong className="text-white">Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong> e demais normas aplicáveis.
            </p>
            <p className="mt-4">
              Ao criar uma conta ou utilizar nossos serviços, você concorda com os termos desta política. Recomendamos que a leia com atenção.
            </p>
          </section>

          <hr className="border-white/8" />

          {/* 1 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">1. Quem somos (Controlador de Dados)</h2>
            <p>
              O controlador dos seus dados pessoais é a <strong className="text-white">SigmaAuto</strong>, plataforma de ERP automotivo brasileira. Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato:
            </p>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-5 space-y-1 text-sm">
              <p><span className="text-white/50">E-mail de privacidade:</span> <a href="mailto:privacidade@sigmaauto.com.br" className="text-[#ff7b2f]">privacidade@sigmaauto.com.br</a></p>
              <p><span className="text-white/50">E-mail de suporte:</span> <a href="mailto:suporte@sigmaauto.com.br" className="text-[#ff7b2f]">suporte@sigmaauto.com.br</a></p>
              <p><span className="text-white/50">Site:</span> <a href="https://sigmaauto.com.br" className="text-[#ff7b2f]">sigmaauto.com.br</a></p>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* 2 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">2. Dados que coletamos</h2>
            <p className="mb-4">Coletamos somente os dados necessários para a prestação dos nossos serviços:</p>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <p className="font-bold text-white text-sm mb-2">2.1 Dados cadastrais da empresa</p>
                <p className="text-sm">Razão social, nome fantasia, CNPJ/CPF, endereço, telefone e e-mail da oficina, fornecidos no momento do cadastro ou nas configurações do sistema.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <p className="font-bold text-white text-sm mb-2">2.2 Dados de usuários da plataforma</p>
                <p className="text-sm">Nome, e-mail e senha (armazenada com hash criptográfico) dos usuários convidados para acessar o sistema (mecânicos, gestores, administrativos).</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <p className="font-bold text-white text-sm mb-2">2.3 Dados operacionais gerados no uso</p>
                <p className="text-sm">Clientes da oficina, veículos, ordens de serviço, peças, registros financeiros e demais informações inseridas pelos usuários na plataforma. Esses dados pertencem ao cliente (oficina) e são tratados por nós como operadores.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <p className="font-bold text-white text-sm mb-2">2.4 Dados de pagamento</p>
                <p className="text-sm">Informações de pagamento das assinaturas são processadas diretamente pelo <strong className="text-white">Mercado Pago</strong>. Não armazenamos dados de cartão de crédito.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <p className="font-bold text-white text-sm mb-2">2.5 Dados de uso e técnicos</p>
                <p className="text-sm">Endereço IP, tipo de navegador, sistema operacional, páginas acessadas, horários de acesso e logs de erro — coletados automaticamente para fins de segurança, diagnóstico técnico e melhoria do serviço.</p>
              </div>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* 3 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">3. Como usamos seus dados</h2>
            <p className="mb-4">Utilizamos seus dados pessoais para as seguintes finalidades, com base nas bases legais da LGPD:</p>
            <ul className="space-y-3">
              {[
                ['Execução de contrato', 'Prestação dos serviços contratados: criação de conta, acesso à plataforma, processamento de assinatura.'],
                ['Legítimo interesse', 'Melhoria contínua do produto, envio de atualizações sobre funcionalidades relevantes, segurança da plataforma e prevenção de fraudes.'],
                ['Cumprimento de obrigação legal', 'Emissão de notas fiscais, registros contábeis e atendimento a requisições de autoridades competentes quando legalmente exigido.'],
                ['Consentimento', 'Envio de comunicações de marketing e novidades (você pode cancelar a qualquer momento).'],
              ].map(([base, desc]) => (
                <li key={base as string} className="flex gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-[#ff7b2f] flex-shrink-0" />
                  <span className="text-sm"><strong className="text-white">{base}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-white/8" />

          {/* 4 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">4. Compartilhamento de dados</h2>
            <p className="mb-4">
              <strong className="text-white">Não vendemos seus dados a terceiros.</strong> O compartilhamento ocorre apenas nas situações abaixo:
            </p>
            <ul className="space-y-3">
              {[
                ['Mercado Pago', 'Processamento de pagamentos das assinaturas. Sujeito à política de privacidade do Mercado Pago.'],
                ['Railway / infraestrutura', 'Hospedagem do banco de dados e backend em ambiente seguro e isolado.'],
                ['Vercel', 'Hospedagem e entrega do frontend (CDN).'],
                ['Autoridades legais', 'Quando exigido por lei, ordem judicial ou para exercício de direitos em processos judiciais ou administrativos.'],
              ].map(([parceiro, desc]) => (
                <li key={parceiro as string} className="flex gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-[#2855d6] flex-shrink-0" />
                  <span className="text-sm"><strong className="text-white">{parceiro}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-white/8" />

          {/* 5 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">5. Segurança dos dados</h2>
            <p className="mb-4">Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ['Isolamento multi-tenant', 'Cada oficina tem seu banco de dados logicamente isolado. Nenhum cliente acessa dados de outro.'],
                ['Criptografia em trânsito', 'Toda a comunicação é realizada via HTTPS/TLS. Senhas são armazenadas com hash bcrypt.'],
                ['Controle de acesso', 'Sistema de perfis com permissões granulares (MASTER, ADMIN, GERENTE, MECÂNICO, FINANCEIRO).'],
                ['Backups automáticos', 'Backups periódicos do banco de dados com retenção mínima de 30 dias.'],
              ].map(([titulo, desc]) => (
                <div key={titulo as string} className="rounded-2xl border border-white/8 bg-white/4 p-5">
                  <p className="font-bold text-white text-sm mb-1">{titulo}</p>
                  <p className="text-xs text-white/55 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-white/8" />

          {/* 6 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">6. Retenção de dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política ou conforme exigido por lei. Após o encerramento da conta:
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-3"><span className="mt-1 w-2 h-2 rounded-full bg-[#ff7b2f] flex-shrink-0" /><span>Dados operacionais (OS, clientes, veículos): retidos por <strong className="text-white">90 dias</strong> após o cancelamento, podendo ser solicitada exportação.</span></li>
              <li className="flex gap-3"><span className="mt-1 w-2 h-2 rounded-full bg-[#ff7b2f] flex-shrink-0" /><span>Dados fiscais e financeiros: retidos por <strong className="text-white">5 anos</strong>, conforme exigência legal.</span></li>
              <li className="flex gap-3"><span className="mt-1 w-2 h-2 rounded-full bg-[#ff7b2f] flex-shrink-0" /><span>Logs de segurança: retidos por <strong className="text-white">6 meses</strong>.</span></li>
            </ul>
          </section>

          <hr className="border-white/8" />

          {/* 7 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">7. Seus direitos (LGPD)</h2>
            <p className="mb-4">Você tem os seguintes direitos sobre seus dados pessoais, que podem ser exercidos a qualquer momento pelo e-mail <a href="mailto:privacidade@sigmaauto.com.br" className="text-[#ff7b2f] hover:underline">privacidade@sigmaauto.com.br</a>:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ['Acesso', 'Saber quais dados pessoais possuímos sobre você.'],
                ['Correção', 'Solicitar a atualização de dados incompletos ou desatualizados.'],
                ['Portabilidade', 'Receber seus dados em formato estruturado e interoperável.'],
                ['Exclusão', 'Solicitar a exclusão dos seus dados pessoais, respeitados os prazos legais.'],
                ['Revogação de consentimento', 'Retirar consentimentos concedidos anteriormente.'],
                ['Oposição', 'Opor-se ao tratamento de dados em casos permitidos por lei.'],
              ].map(([direito, desc]) => (
                <div key={direito as string} className="rounded-xl border border-white/8 bg-white/3 p-4">
                  <p className="font-bold text-white text-sm mb-1">{direito}</p>
                  <p className="text-xs text-white/50">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">Responderemos às solicitações em até <strong className="text-white">15 dias úteis</strong>.</p>
          </section>

          <hr className="border-white/8" />

          {/* 8 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">8. Cookies e tecnologias similares</h2>
            <p className="mb-4">Utilizamos cookies e armazenamento local (localStorage) para:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3"><span className="mt-1 w-2 h-2 rounded-full bg-[#ff7b2f] flex-shrink-0" /><span><strong className="text-white">Autenticação:</strong> manter a sessão do usuário logado de forma segura (token JWT).</span></li>
              <li className="flex gap-3"><span className="mt-1 w-2 h-2 rounded-full bg-[#ff7b2f] flex-shrink-0" /><span><strong className="text-white">Preferências:</strong> salvar configurações de interface do usuário.</span></li>
              <li className="flex gap-3"><span className="mt-1 w-2 h-2 rounded-full bg-[#ff7b2f] flex-shrink-0" /><span><strong className="text-white">Análise:</strong> entender como a plataforma é utilizada para melhorias (dados agregados e anonimizados).</span></li>
            </ul>
            <p className="mt-4 text-sm">
              Você pode configurar seu navegador para bloquear cookies, mas isso pode afetar o funcionamento da plataforma.
            </p>
          </section>

          <hr className="border-white/8" />

          {/* 9 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">9. Transferência internacional de dados</h2>
            <p>
              Nossos servidores e parceiros de infraestrutura podem estar localizados fora do Brasil (EUA). Garantimos que qualquer transferência internacional ocorre com salvaguardas adequadas, incluindo cláusulas contratuais padrão, em conformidade com o Art. 33 da LGPD.
            </p>
          </section>

          <hr className="border-white/8" />

          {/* 10 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">10. Menores de idade</h2>
            <p>
              Nossos serviços são destinados exclusivamente a pessoas jurídicas (empresas) e pessoas físicas maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade. Caso identifiquemos tal situação, os dados serão excluídos imediatamente.
            </p>
          </section>

          <hr className="border-white/8" />

          {/* 11 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">11. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Quando houver alterações relevantes, notificaremos os usuários por e-mail ou por aviso na plataforma com pelo menos <strong className="text-white">15 dias de antecedência</strong>. A data de "última atualização" no topo deste documento sempre refletirá a versão mais recente.
            </p>
          </section>

          <hr className="border-white/8" />

          {/* 12 */}
          <section>
            <h2 className="text-xl font-black text-white mb-4">12. Contato e Encarregado (DPO)</h2>
            <p>
              Para questões relacionadas a privacidade, exercício de direitos ou reclamações sobre o tratamento dos seus dados, entre em contato com nosso Encarregado de Proteção de Dados (DPO):
            </p>
            <div className="mt-4 rounded-2xl border border-[#ff7b2f]/20 bg-[#ff7b2f]/5 p-6 space-y-2 text-sm">
              <p className="font-bold text-white">SigmaAuto — Encarregado de Dados</p>
              <p><span className="text-white/50">E-mail:</span> <a href="mailto:privacidade@sigmaauto.com.br" className="text-[#ff7b2f] hover:underline">privacidade@sigmaauto.com.br</a></p>
              <p><span className="text-white/50">Prazo de resposta:</span> até 15 dias úteis</p>
              <p className="text-white/40 text-xs pt-2">
                Caso não fique satisfeito com nossa resposta, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) pelo site <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-[#ff7b2f] hover:underline">gov.br/anpd</a>.
              </p>
            </div>
          </section>

        </div>

        {/* Footer da página */}
        <div className="mt-16 pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">© {new Date().getFullYear()} SigmaAuto · sigmaauto.com.br · Todos os direitos reservados</p>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-[#ff7b2f] hover:underline"
          >
            ← Voltar para o início
          </button>
        </div>
      </main>
    </div>
  );
}
