import { describe, it, expect, vi, beforeAll } from 'vitest';

// BaseService listens for online/offline events in its constructor
beforeAll(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', { addEventListener: () => {} });
});

const load = () => import('./BaseService.js');

const runWith = async (error) => {
  const { BaseService } = await load();
  const service = new BaseService('Test');
  const operation = vi.fn().mockRejectedValue(error);
  await expect(service.executeWithRetry(operation, { maxAttempts: 3, delay: 0 })).rejects.toBe(error);
  return operation.mock.calls.length;
};

describe('HttpError retry policy', () => {
  it.each([
    [400, 1],
    [401, 1],
    [403, 1],
    [404, 1],
    [409, 1],
    [422, 1],
    [429, 1], // retrying into a rate limit only makes it worse
    [408, 3],
    [500, 3],
    [502, 3],
    [503, 3],
  ])('status %i → %i attempt(s)', async (status, attempts) => {
    const { HttpError } = await load();
    expect(await runWith(new HttpError('Server said no', status))).toBe(attempts);
  });

  it('keeps the server message and status', async () => {
    const { HttpError } = await load();
    const error = new HttpError('Purchase date cannot be in the future', 400);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ message: 'Purchase date cannot be in the future', status: 400, retryable: false });
  });
});

describe('other errors', () => {
  it('never retries nonRetryable errors', async () => {
    const { nonRetryable } = await load();
    expect(await runWith(nonRetryable('Receipt not found'))).toBe(1);
  });

  it('retries plain network failures', async () => {
    expect(await runWith(new Error('Network error: Unable to connect to server'))).toBe(3);
  });

  it('still honours status words in untyped messages', async () => {
    expect(await runWith(new Error('HTTP 400 Bad Request'))).toBe(1);
  });

  it('returns the result once a retry succeeds', async () => {
    const { BaseService, HttpError } = await load();
    const service = new BaseService('Test');
    const operation = vi.fn()
      .mockRejectedValueOnce(new HttpError('Bad gateway', 502))
      .mockResolvedValueOnce('ok');
    await expect(service.executeWithRetry(operation, { maxAttempts: 3, delay: 0 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
