/**
 * k6 Load Test — Event Ingest Endpoint
 *
 * Target: POST /v1/events p99 < 200ms at sustained 500 events/min
 *
 * Usage (k6 Cloud web UI):
 * 1. Go to app.k6.io → New Test → Upload Script
 * 2. Set env vars: TEST_API_KEY, TEST_TENANT_ID, BASE_URL
 * 3. Run → view p99 latency in real-time dashboard
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // warm up
    { duration: '2m',  target: 50  },  // sustained: ~500 events/min
    { duration: '30s', target: 100 },  // spike test
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],   // SLA: p99 < 200ms
    http_req_failed:   ['rate<0.01'],   // < 1% hard errors
    errors:            ['rate<0.01'],
  },
};

const BASE_URL  = __ENV.BASE_URL    || 'https://kyc-ai.com';
const API_KEY   = __ENV.TEST_API_KEY;
const TENANT_ID = __ENV.TEST_TENANT_ID;
const AGENT_ID  = __ENV.TEST_AGENT_ID;

// Rotate through action types to simulate realistic traffic
const ACTION_TYPES = [
  'api_call', 'data_access', 'authentication_attempt',
  'data_mutation', 'transaction_initiated',
];

export function loadTest() {
  const action = ACTION_TYPES[Math.floor(Math.random() * ACTION_TYPES.length)];

  const res = http.post(
    `${BASE_URL}/api/v1/events`,
    JSON.stringify({
      agentId:    AGENT_ID,
      actionType: action,
      sessionId:  `load-test-${__VU}-${__ITER}`,
      details:    { source: 'k6-load-test' },
    }),
    {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'x-tenant-id':   TENANT_ID,
      },
      tags: { name: 'event_ingest' },
    }
  );

  const ok = check(res, {
    'status 200':      (r) => r.status === 200,
    'has risk_score':  (r) => {
      try { return JSON.parse(r.body).risk_score !== undefined; }
      catch { return false; }
    },
  });

  errorRate.add(!ok);
  sleep(0.1); // ~10 VU × 10 req/s = 600 events/min at peak
}

export { loadTest as default };
