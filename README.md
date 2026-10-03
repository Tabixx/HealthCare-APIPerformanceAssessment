# Healthcare API Performance Assessment

A full performance-testing cycle for a fictional scenario: evaluating a 
third-party vendor's API for transferring patient data between healthcare 
systems, before signing a contract.

## Scenario/Background

I'm a performance tester at a company integrating healthcare systems. Before 
signing with a vendor, I need to verify their API can handle our expected 
workload - and deliver a recommendation backed by real test data.

## Test environment

- **httpbin**, running locally via Docker - stands in for the vendor's API
- Endpoints used: `/post`, `/get`, `/delay/{n}`, `/status/{code}`

See [`docs/test-plan.md`](docs/test-plan.md) for full scope, business 
assumptions, and success/failure criteria defined before testing began.

## Scenarios tested

1. **Baseline** - response time with no load
2. **Load Test** - expected peak production traffic (~5 req/s, 20 VUs)
3. **Stress Test** - ramping volume up to 500 VUs, plus a mixed variant 
   combining volume with injected failures/delays
4. **Failure / Resilience Test** - fixed moderate load with simulated vendor 
   errors and slow responses

All four were implemented in K6 - see [`docs/test-plan.md`](docs/test-plan.md) 
for why JMeter wasn't used here.

## Running the tests

```
docker run -d -p 80:80 --name httpbin kennethreitz/httpbin

k6 run k6/baseline.js
k6 run k6/load-test.js
k6 run k6/stress-test.js
k6 run k6/stress-test-mixed.js
k6 run k6/failure-resilience-test.js
```

## Results

All five scripts passed their defined thresholds. Full metrics and 
interpretation in the reports below; raw output saved as JSON in `k6/results/`.

| Test | p95 response time | Error rate | Status |
|---|---|---|---|
| Baseline | 2.98ms | 0.00% | PASS |
| Load Test | 2.77ms | 0.02% | PASS |
| Stress - 500 VU volume | 2.61ms | 0.02% | PASS |
| Stress - mixed (volume + failures) | 6.37ms | 0.01%* | PASS |
| Failure / Resilience | 5.0s (by design) | 0.08%* | PASS |

*Unexpected failures only - excludes intentionally triggered vendor errors.

## Reports

- [Technical Report](reports/technical-report.md) — full metrics, 
  observations, limitations
- [Executive Summary](reports/executive-summary.md) — plain-language version 
  for a non-technical audience