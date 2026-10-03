# Technical Report: Healthcare Data Integration API - Performance Assessment

## Scope
Four performance test scenarios were executed against a simulated vendor API 
(httpbin, running locally via Docker) to assess suitability for transferring 
patient data under expected production workload, ahead of a vendor contract decision.

## Methodology
All tests were run using K6, scripted against business-realistic assumptions 
(see Test Plan: ~100 transactions/min typical, ~300 transactions/min peak). 
Each test defines explicit pass/fail thresholds evaluated automatically by K6.

## Results

### 1. Baseline (1 VU, 20 iterations, no concurrency)
| Metric | Result | Threshold | Status |
|---|---|---|---|
| p95 response time | 2.98ms | < 300ms | PASS |
| Error rate | 0.00% | 0% | PASS |

### 2. Load Test (20 VU, 2 min, ~5 req/s - expected peak)
| Metric | Result | Threshold | Status |
|---|---|---|---|
| p95 response time | 2.77ms | < 800ms | PASS |
| Error rate | 0.02% | < 0.1% | PASS |

### 3. Stress Test - Volume (20 > 500 VU, ramped)
| Metric | 200 VU | 500 VU | Threshold | Status |
|---|---|---|---|---|
| p95 response time | 2.49ms | 2.61ms | < 800ms | PASS |
| Error rate | 0.03% | 0.02% | < 1% | PASS |

No breaking point was found up to 500 VU (~25x the expected peak) on volume alone.

### 3b. Stress Test - Mixed (volume + failure injection, up to 200 VU)
10% `/delay/3`, 10% `/status/500` injected alongside normal traffic.
| Metric | Result | Threshold | Status |
|---|---|---|---|
| p95 response time | 6.37ms | < 800ms | PASS |
| Unexpected failure rate* | 0.01% | < 1% | PASS |

*A custom metric was used here instead of K6's default `http_req_failed`, which 
counts intentional `/status/500` responses as failures. The custom metric isolates 
genuine, unplanned failures only.

### 4. Failure / Resilience Test (fixed 20 VU, 2 min)
15% `/delay/5`, 15% `/status/503` injected alongside normal traffic.
| Metric | Result | Threshold | Status |
|---|---|---|---|
| Unexpected failure rate | 0.08% | < 1% | PASS |
| `/status/503` correctly surfaced | 100% | - | PASS |
| Concurrent normal requests unaffected by slow/failed requests | Yes | - | PASS |

## Observations

- Response times stayed under 10ms across all load levels, including 500 VU. 
  This reflects the local Docker environment's low latency - a real networked 
  vendor API would most likely run slower, but relative behavior under load should still be informative.
- A small, consistent number of transient connection resets (EOF errors) 
  occurred across all tests (1-7 per run), regardless of load level. The count 
  didn't scale with request volume, pointing to local Docker network/connection-
  pool noise rather than a capacity issue.
- Vendor-side errors and delays were correctly surfaced, and didn't cause 
  concurrent unrelated requests to fail or slow down.
- No scenario reached a performance ceiling, even at 25x the expected peak load.

## Limitations
- During testing I've used httpbin locally via Docker, not the vendor's actual production 
  or staging environment. Real network latency, distance, and the vendor's own 
  infrastructure limits weren't captured.
- Stress testing stopped at 500 VU since results showed no degradation trend 
  at that scale, which was well beyond business requirements.

## Recommendation
If this was a real vendor evaluation: sign the contract. All four scenarios 
passed their thresholds with wide margins, including under combined load and 
simulated vendor failure conditions, and no performance ceiling was found even 
at 25x the expected peak load.