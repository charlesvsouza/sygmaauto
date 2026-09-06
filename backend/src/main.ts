import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Request, Response } from 'express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Limite maior para acomodar upload de logo em base64 (padrão do Express é 100kb)
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()),
    'https://sigmaauto.com.br',
    'https://www.sigmaauto.com.br',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
  ].filter((origin): origin is string => Boolean(origin));
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  const config = new DocumentBuilder()
    .setTitle('Sigma Auto API')
    .setDescription('Multi-tenant SaaS for automotive workshops')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'sygmaauto-api' });
  });
  httpAdapter.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = 3000;
  console.log(`[startup] process.env.PORT=${process.env.PORT ?? 'undefined'} | listen_port=${port}`);
  await app.listen(port, '0.0.0.0');
  console.log(`[startup] server listening on 0.0.0.0:${port}`);
}
bootstrap().catch((error) => {
  console.error('[startup] fatal error during bootstrap', error);
  process.exit(1);
});