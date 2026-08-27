import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { DomainVerificationsModule } from './domain-verifications/domain-verifications.module';

@Module({
  imports: [DomainVerificationsModule],
  controllers: [AppController],
})
export class AppModule {}
