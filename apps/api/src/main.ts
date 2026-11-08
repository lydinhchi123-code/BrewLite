import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';

config({ path: '../../.env' });

async function bootstrap() {
  const { AppModule, ObserveInstrument } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
