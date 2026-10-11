// Confere o grafo de injeção do Nest antes do deploy, sem banco: erro de módulo/provider aparece na
// criação das instâncias; uma falha de conexão com o banco vem depois e significa que a injeção está certa.
// Uso: DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx ts-node scripts/boot-check.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

(async () => {
  try {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    await app.close();
    console.log('boot check OK');
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (/can't resolve dependencies|Nest cannot export|circular dependency|Unknown/i.test(msg)) {
      console.error('FALHA NA INJEÇÃO:', msg.slice(0, 700));
      process.exit(1);
    }
    console.log('boot check OK (injeção resolvida; parou depois, sem banco):', msg.slice(0, 120));
  }
  process.exit(0);
})();
