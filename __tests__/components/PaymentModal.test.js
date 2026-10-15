import { waitForPaymentSuccess } from '@/components/app/PaymentModal';

jest.mock('@stripe/stripe-js/pure', () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => children,
  PaymentElement: () => null,
  useElements: jest.fn(),
  useStripe: jest.fn(),
}));

jest.mock('@/lib/utils/analytics', () => ({ trackEvent: jest.fn() }));

const response = (status, ok = true, httpStatus = 200, entitlementReady = status === 'succeeded') => ({
  ok,
  status: httpStatus,
  json: jest.fn().mockResolvedValue({ data: { status, entitlementReady } }),
});

describe('waitForPaymentSuccess', () => {
  it('polls until Stripe reports succeeded', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response('processing'))
      .mockResolvedValueOnce(response('succeeded'));
    const waitImpl = jest.fn().mockResolvedValue(undefined);

    await expect(waitForPaymentSuccess('pi_12345678901234', { fetchImpl, waitImpl }))
      .resolves.toMatchObject({ status: 'succeeded' });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      '/api/payment/status/pi_12345678901234',
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    );
    expect(waitImpl).toHaveBeenCalledWith(500);
  });

  it('fails immediately for a terminal payment failure', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response('requires_payment_method'));

    await expect(waitForPaymentSuccess('pi_12345678901234', { fetchImpl }))
      .rejects.toThrow('payment was not completed');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('waits for the document entitlement after Stripe succeeds', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response('succeeded', true, 200, false))
      .mockResolvedValueOnce(response('succeeded', true, 200, true));
    const waitImpl = jest.fn().mockResolvedValue(undefined);

    await expect(waitForPaymentSuccess('pi_12345678901234', { fetchImpl, waitImpl }))
      .resolves.toMatchObject({ entitlementReady: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries transient HTTP errors and eventually times out', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({ error: 'Unavailable' }),
    });
    const waitImpl = jest.fn().mockResolvedValue(undefined);

    await expect(waitForPaymentSuccess('pi_12345678901234', { fetchImpl, waitImpl }))
      .rejects.toThrow('still being confirmed');
    expect(fetchImpl).toHaveBeenCalledTimes(10);
    expect(waitImpl).toHaveBeenCalledTimes(9);
  });

  it('does not retry non-transient verification failures', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({ error: 'Payment not found' }),
    });

    await expect(waitForPaymentSuccess('pi_12345678901234', { fetchImpl }))
      .rejects.toThrow('Payment not found');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('Stripe.js loading', () => {
  const ORIGINAL_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  afterEach(() => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ORIGINAL_KEY;
  });

  it('does not load Stripe.js when the module is imported (free deployment)', () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    jest.isolateModules(() => {
      const { loadStripe } = require('@stripe/stripe-js/pure');
      loadStripe.mockClear();
      require('@/components/app/PaymentModal');
      expect(loadStripe).not.toHaveBeenCalled();
    });
  });

  it('loads Stripe.js once, only when a payment form is requested', () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    jest.isolateModules(() => {
      const { loadStripe } = require('@stripe/stripe-js/pure');
      loadStripe.mockClear();
      const { getStripePromise } = require('@/components/app/PaymentModal');
      const first = getStripePromise();
      expect(getStripePromise()).toBe(first);
      expect(loadStripe).toHaveBeenCalledTimes(1);
      expect(loadStripe).toHaveBeenCalledWith('pk_test_123');
    });
  });

  it('never loads Stripe.js without a publishable key', () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    jest.isolateModules(() => {
      const { loadStripe } = require('@stripe/stripe-js/pure');
      loadStripe.mockClear();
      const { getStripePromise } = require('@/components/app/PaymentModal');
      expect(getStripePromise()).toBeNull();
      expect(loadStripe).not.toHaveBeenCalled();
    });
  });

  it('imports only the side-effect-free entry point', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(path.join(process.cwd(), 'components/app/PaymentModal.js'), 'utf8');
    expect(src).toMatch(/from '@stripe\/stripe-js\/pure'/);
    expect(src).not.toMatch(/from '@stripe\/stripe-js'/);
  });
});
