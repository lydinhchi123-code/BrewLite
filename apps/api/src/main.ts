import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
