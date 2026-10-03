import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const unexpectedFailureRate = new Rate('unexpected_failures');

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    unexpected_failures: ['rate<0.01'],
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

  if (roll < 0.15) {
    const delayRes = http.get(`${BASE_URL}/delay/5`);
    check(delayRes, { 'delay status is 200': (r) => r.status === 200 });
    unexpectedFailureRate.add(delayRes.status !== 200);
  } else if (roll < 0.3) {
    const statusRes = http.get(`${BASE_URL}/status/503`);
    check(statusRes, { 'status endpoint reachable': (r) => r.status === 503 });
    unexpectedFailureRate.add(false); // 503 here is expected, not a failure
  } else {
    const getRes = http.get(`${BASE_URL}/get`);
    check(getRes, { 'get status is 200': (r) => r.status === 200 });
    unexpectedFailureRate.add(getRes.status !== 200);
  }

  sleep(Math.random() * 1 + 1);
}