import { Test } from '@nestjs/testing';

import { AppController } from './app.controller';

describe('AppController', () => {
  it('reports that the API is healthy', async () => {
    const testingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();
    const controller = testingModule.get(AppController);

    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
