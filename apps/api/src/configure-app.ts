import type { INestApplication } from '@nestjs/common';

import { configureOpenApi } from './openapi';

type ExpressApplication = {
  disable(setting: string): void;
};

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  configureOpenApi(app);
  const expressApp = app.getHttpAdapter().getInstance() as ExpressApplication;

  expressApp.disable('x-powered-by');
}
