import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  private createTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  isConfigured() {
    return !!this.createTransporter();
  }

  async sendTenantSetupEmail(to: string, payload: { companyName: string; activationLink: string; expiresAt: Date }) {
    const transporter = this.createTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP não configurado. Link de ativação não enviado para ${to}`);
      return false;
    }

    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      this.configService.get<string>('GENERAL_EMAIL') ||
      this.configService.get<string>('SMTP_USER');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Sigma Auto';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: 'Ative seu acesso inicial ao Sigma Auto',
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#0f172a;">
          <h2>Seu acesso inicial está pronto</h2>
          <p>Olá,</p>
          <p>O tenant <strong>${payload.companyName}</strong> foi provisionado e aguarda a conclusão do seu cadastro inicial.</p>
          <p><a href="${payload.activationLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Concluir cadastro inicial</a></p>
          <p>Se preferir, copie este link:</p>
          <p>${payload.activationLink}</p>
          <p>Este convite expira em ${payload.expiresAt.toLocaleString('pt-BR')}.</p>
        </div>
      `,
    });

    return true;
  }

  async sendPasswordResetEmail(to: string, payload: { resetLink: string; resetToken: string; expiresAt: Date }) {
    const transporter = this.createTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP não configurado. Email de recuperação não enviado para ${to}`);
      return false;
    }

    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      this.configService.get<string>('GENERAL_EMAIL') ||
      this.configService.get<string>('SMTP_USER');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Sigma Auto';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: 'Recuperação de senha do Sigma Auto',
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#0f172a;">
          <h2>Recuperação de senha</h2>
          <p>Recebemos uma solicitação de redefinição de senha.</p>
          <p><a href="${payload.resetLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Redefinir senha</a></p>
          <p>Se a tela pedir o token manualmente, use: <strong>${payload.resetToken}</strong></p>
          <p>Este link expira em ${payload.expiresAt.toLocaleString('pt-BR')}.</p>
        </div>
      `,
    });

    return true;
  }

  async sendSubscriptionRenewalReminder(
    to: string,
    payload: {
      companyName: string;
      planName: string;
      expiresAt: Date;
      daysLeft: number;
      renewalUrl: string;
    },
  ) {
    const transporter = this.createTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP não configurado. Lembrete de renovação não enviado para ${to}`);
      return false;
    }

    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      this.configService.get<string>('GENERAL_EMAIL') ||
      this.configService.get<string>('SMTP_USER');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Sigma Auto';

    const urgencyColor = payload.daysLeft <= 3 ? '#dc2626' : '#d97706';
    const urgencyLabel = payload.daysLeft <= 3 ? 'URGENTE' : 'Aviso';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `[${urgencyLabel}] Sua assinatura Sigma Auto vence em ${payload.daysLeft} dia(s)`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#0f172a; max-width:600px; margin:0 auto;">
          <div style="background:${urgencyColor};padding:12px 18px;border-radius:8px 8px 0 0;">
            <p style="color:#fff;font-weight:bold;margin:0;">Sigma Auto — Renovação de Assinatura</p>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <h2 style="margin-top:0;">Olá, ${payload.companyName}!</h2>
            <p>Sua assinatura do plano <strong>${payload.planName}</strong> vence em
            <strong>${payload.daysLeft} dia(s)</strong> — ${payload.expiresAt.toLocaleDateString('pt-BR')}.</p>
            <p>Para continuar usando o Sigma Auto sem interrupções, renove agora:</p>
            <p>
              <a href="${payload.renewalUrl}"
                 style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
                Renovar assinatura
              </a>
            </p>
            <p style="color:#64748b;font-size:13px;">Se preferir, copie este link no navegador:<br>${payload.renewalUrl}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
            <p style="color:#94a3b8;font-size:12px;">Dúvidas? Entre em contato: suporte@sigmaauto.com.br</p>
          </div>
        </div>
      `,
    });

    return true;
  }

  async sendAdminNewSaleNotification(payload: {
    companyName: string;
    planName: string;
    billingCycle: string;
    amount: number;
    inviteEmail: string;
    paymentId: string;
    tenantId: string;
  }) {
    const adminEmail = this.configService.get<string>('ADMIN_NOTIFY_EMAIL');
    if (!adminEmail) return false;

    const transporter = this.createTransporter();
    if (!transporter) return false;

    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      this.configService.get<string>('GENERAL_EMAIL') ||
      this.configService.get<string>('SMTP_USER');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Sigma Auto';

    const cycleLabel: Record<string, string> = {
      MONTHLY: 'Mensal',
      QUARTERLY: 'Trimestral',
      SEMIANNUAL: 'Semestral',
      ANNUAL: 'Anual',
    };

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: adminEmail,
      subject: `[Nova Venda] ${payload.companyName} — Plano ${payload.planName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#0f172a; max-width:600px; margin:0 auto;">
          <div style="background:#16a34a;padding:12px 18px;border-radius:8px 8px 0 0;">
            <p style="color:#fff;font-weight:bold;margin:0;">✓ Nova assinatura confirmada</p>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#64748b;width:140px;">Empresa</td><td style="padding:6px 0;font-weight:bold;">${payload.companyName}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;">${payload.inviteEmail}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Plano</td><td style="padding:6px 0;">${payload.planName}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Ciclo</td><td style="padding:6px 0;">${cycleLabel[payload.billingCycle] || payload.billingCycle}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Valor</td><td style="padding:6px 0;font-weight:bold;color:#16a34a;">R$ ${payload.amount.toFixed(2).replace('.', ',')}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Payment ID</td><td style="padding:6px 0;font-size:12px;">${payload.paymentId}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Tenant ID</td><td style="padding:6px 0;font-size:12px;">${payload.tenantId}</td></tr>
            </table>
          </div>
        </div>
      `,
    });

    return true;
  }
}
