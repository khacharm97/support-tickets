jest.mock('../config/redis', () => {
  const mockRedis = {
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    connect: jest.fn(),
    status: 'ready',
  };
  return {
    redis: mockRedis,
  };
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
});

