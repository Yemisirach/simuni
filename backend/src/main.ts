import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Required by Better Auth's NestJS integration: it needs the raw,
    // unparsed request body to verify certain auth flows. The library adds
    // back Nest's default body parsers for every non-auth route.
    bodyParser: false,
  });

  // Enable CORS first so that all responses (including 4xx/5xx errors) include proper CORS headers
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With,workspace-id',
  });

  // Body parser with 50MB limit to support bulk geospatial datasets and imports
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/auth')) {
      next();
    } else {
      express.json({ limit: '50mb' })(req, res, next);
    }
  });
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  // Better Auth mounts its own router at basePath ("/api/v1/auth", set in
  // better-auth.instance.ts) ahead of Nest's own routing/prefix layer, so it
  // must be excluded here to avoid a doubled-up "/api/v1/api/v1/auth" path.
  app.setGlobalPrefix('api/v1', { exclude: ['auth/{*path}'] });

  const port = process.env.PORT || 3010;
  await app.listen(port, '0.0.0.0');
  console.log(`Simuni API running on http://localhost:${port}/api/v1`);
}
bootstrap();
