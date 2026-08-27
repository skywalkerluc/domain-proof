import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { dirname } from 'node:path';

// Keep static references so serverless file tracing includes every served asset.
const swaggerUiAssetPaths = [
  require.resolve('swagger-ui-dist/swagger-ui-bundle.js'),
  require.resolve('swagger-ui-dist/swagger-ui-standalone-preset.js'),
  require.resolve('swagger-ui-dist/swagger-ui.css'),
] as const;
const swaggerUiAssetDirectory = dirname(swaggerUiAssetPaths[0]);

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Domain Proof API')
    .setDescription('Create and check DNS-based domain ownership verifications.')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, documentFactory, {
    customSwaggerUiPath: swaggerUiAssetDirectory,
    jsonDocumentUrl: 'api/docs-json',
  });
}
