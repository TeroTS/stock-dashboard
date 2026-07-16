# Production Hardening Checklist

## Backend exposure
- [ ] `MASSIVE_API_KEY` is provided through the deployment secret path, not committed config.
- [ ] Only the required backend surfaces are exposed publicly:
  - `GET /health`
  - `POST /api/transactions`
  - `POST /api/transactions/{transactionId}/close`
  - `POST /api/transactions/{transactionId}/cancel-open`
  - `GET /ws` websocket upgrade
- [ ] Startup fails fast when required configuration is missing.

## Origin and browser controls
- [ ] Allowed browser origins are explicitly configured for the deployed frontend origin.
- [ ] Browser requests from untrusted origins are rejected.
- [ ] Websocket handshakes from untrusted origins are rejected.

## Runtime safety
- [ ] Watchlist input is reviewed and intentionally scoped.
- [ ] Log retention captures backend feed and transaction events.
- [ ] Restart behavior is acceptable because runtime state is in-memory only.
- [ ] Operators know that restart clears transaction history and price history.

## Feed dependency
- [ ] Market data provider credentials are rotated and monitored.
- [ ] Provider outage handling is documented for operators.
- [ ] Reconnect behavior is tested in a deployed-like environment.

## Frontend hosting contract
- [ ] The frontend is configured to reach the correct backend websocket URL and command API base URL.
- [ ] Static assets are served with appropriate cache behavior.
- [ ] The app entry document is served with revalidation behavior suitable for deployments.
