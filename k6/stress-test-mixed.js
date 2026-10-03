import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const unexpectedFailureRate = new Rate('unexpected_failures');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    unexpected_failures: ['rate<0.01'], // only counts real errors
  },
};

const BASE_URL = 'http://localhost';

export default function () {
  const postRes = http.post(
    `${BASE_URL}/post`,
    JSON.stringify({ patientId: 'P-1001', status: 'updated' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(postRes, { 'post status is 200': (r) => r.status === 200 });
  unexpectedFailureRate.add(postRes.status !== 200);

  const roll = Math.random();

  if (roll < 0.1) {
    // simulate a slow backend response
    const delayRes = http.get(`${BASE_URL}/delay/3`);
    check(delayRes, { 'delay status is 200': (r) => r.status === 200 });
    unexpectedFailureRate.add(delayRes.status !== 200);
  } else if (roll < 0.2) {
    // simulate an occasional vendor-side error
    const statusRes = http.get(`${BASE_URL}/status/500`);
    check(statusRes, { 'status endpoint reachable': (r) => r.status === 500 });
    unexpectedFailureRate.add(false); // a 500 here is expected, not a failure
  } else {
    const getRes = http.get(`${BASE_URL}/get`);
    check(getRes, { 'get status is 200': (r) => r.status === 200 });
    unexpectedFailureRate.add(getRes.status !== 200);
  }

  sleep(Math.random() * 1 + 1);
}