import type { INestApplication } from '@nestjs/common';

type ExpressApplication = {
  disable(setting: string): void;
};

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  const expressApp = app.getHttpAdapter().getInstance() as ExpressApplication;

  expressApp.disable('x-powered-by');
}
