import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { DomainVerificationsController } from './domain-verifications/domain-verifications.controller';

@Module({
  controllers: [AppController, DomainVerificationsController],
})
export class AppModule {}
