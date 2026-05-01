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

    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || this.configService.get<string>('SMTP_USER');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Oficina360';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: 'Ative seu acesso inicial ao Oficina360',
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

    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || this.configService.get<string>('SMTP_USER');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Oficina360';

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: 'Recuperação de senha do Oficina360',
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
}
