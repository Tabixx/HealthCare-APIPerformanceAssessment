import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 20,
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost';

export default function () {
  // Submit a patient record
  const postRes = http.post(
    `${BASE_URL}/post`,
    JSON.stringify({ patientId: 'P-1001', status: 'updated' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(postRes, {
    'post status is 200': (r) => r.status === 200,
  });

  // Query confirmation
  const getRes = http.get(`${BASE_URL}/get`);

  check(getRes, {
    'get status is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}