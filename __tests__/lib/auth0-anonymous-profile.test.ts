/** @jest-environment node */
/**
 * Logged-out visitors on marketing pages probe /api/auth/me via useUser().
 * A 401 there logged a console error on every page view; the profile route
 * must answer 204, which the SDK's useUser() maps to `user: null`.
 */
const mockCtor = jest.fn();
jest.mock('@auth0/nextjs-auth0/server', () => ({
  Auth0Client: function Auth0Client(options: unknown) {
    mockCtor(options);
  },
}));

describe('Auth0 client profile route for anonymous visitors', () => {
  it('answers 204 instead of 401', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/lib/auth0');
    });
    expect(mockCtor).toHaveBeenCalledWith(
      expect.objectContaining({ noContentProfileResponseWhenUnauthenticated: true }),
    );
  });
});
