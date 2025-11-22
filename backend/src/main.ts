import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Validate JWT_SECRET before starting the application
function validateJWTSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('❌ JWT_SECRET environment variable is not set! Application cannot start.');
  }
  
  if (jwtSecret.length < 32) {
    throw new Error(`❌ JWT_SECRET is too weak! Must be at least 32 characters. Current length: ${jwtSecret.length}`);
  }
  
  if (jwtSecret === 'your-secret-key-change-in-production' || 
      jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('❌ JWT_SECRET is using default value! Change it to a strong, unique secret.');
  }
  
  console.log('✅ JWT_SECRET validation passed');
}

async function bootstrap() {
  // Validate critical environment variables
  validateJWTSecret();
  
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all origins (including serveo, ngrok, etc.)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }
      // Allow all origins in development
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      // In production, check specific origins
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'https://app.marranasuete.ru',
      ];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Telegram Mini App API')
    .setDescription('API documentation for Telegram Mini App with Admin Panel')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('admin', 'Admin panel endpoints')
    .addTag('bot', 'Telegram bot webhooks')
    .addTag('users', 'User endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
  console.log(`🤖 Admin bot polling started automatically`);
}

bootstrap();
