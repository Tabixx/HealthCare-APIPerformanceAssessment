import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost';

export default function () {
  const postRes = http.post(
    `${BASE_URL}/post`,
    JSON.stringify({ patientId: 'P-1001', status: 'updated' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(postRes, {
    'post status is 200': (r) => r.status === 200,
  });

  const getRes = http.get(`${BASE_URL}/get`);

  check(getRes, {
    'get status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 1 + 1);
}