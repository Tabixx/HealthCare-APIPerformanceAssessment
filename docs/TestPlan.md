# Test Plan: Healthcare Data Integration API - Performance Assessment

## Context/Scenario
I am a performance tester at a company that integrates healthcare systems. Our team is considering using an external API provided by a third-party vendor to transfer patient data between systems. Before signing the contract, I need to verify whether the API can handle our expected real-world workload and provide a recommendation: proceed with the contract, proceed with reservations, or look for another provider.

## Test Environment
- httpbin (local, Docker) - simulates the external vendor API
- Endpoints: `/post` (send a patient record), `/get` (retrieve status), 
  `/delay/{n}` (slow backend), `/status/{kod}` (server failures)

## Business Assumptions (assumed data for the purpose of scenario)
- Typical traffic: \~100 transactions/min throughout the day (ongoing patient data updates)
- Peak traffic (staff shift change, morning batch import): \~300 transactions/min (~5 req/s)
- Each transaction: patient record write (`POST`) + confirmation read (`GET`)

## Test Scenarios

### 1. Baseline Test
**Goal:** Establish the API response time under no load - a baseline for comparison.
-   1 VU, 20 individual iterations (POST + GET), no concurrency
-   No think time / minimal think time

### 2. Load Test
**Goal:** Verify whether the API can handle the expected production workload (peak-hour traffic).
-   Ramp-up to 20 VUs over 15s, maintain 20 VUs for 2 minutes (\~5 req/s, in line with the expected peak)
-   Think time: 1-2s between requests (to simulate a realistic workflow)

### 3. Stress Test
**Goal:** Find the performance limit of the API - the point at which it starts to "break down"
-   Gradual increase: 20 > 50 > 100 > 200 VUs, with each level maintained for \~30-45s
-   Monitor at which level the error rate and response times exceed the success criteria

*Note: During execution, this was extended to 500 VUs after 200 VUs showed no 
degradation, and a second variant mixed in `/delay` and `/status/500` requests 
to test for resource exhaustion under combined load and failure conditions - 
see the technical report for full results.*

### 4. Failure / Resilience Test
**Goal:** Verify how the system behaves when the vendor experiences an outage during data import.
-   Mix of requests to `/status/500`, `/status/503`, and `/delay/5` under moderate load (e.g. 20 VUs)
-   Performance is not the focus here. Instead, we verify: whether errors are returned correctly and how much they slow down the overall process (whether a single slow request blocks others)

## Success / Failure criteria

| Metric | Baseline | Load Test | Stress Test | Failure Test |
|---|---|---|---|---|
| p95 response time | < 300ms | < 800ms | breaking point - report at which VU it exceeds 800ms | n/a (expected delays with `/delay`) |
| Error rate | 0% | < 0.1% | breaking point - report at which VU it exceeds 1% | 100% for `/status/5xx` is expected  (verify that errors are correctly detected, not avoided) |

**Overall API success criteria:**
The API passes the load test (5 req/s, 2 min) with an error rate \< 0.1% and p95 \< 800ms, **AND** does not "break down" (error rate \< 1%) at least 2x the expected peak (\~10 req/s / 40 VUs), the recommencation is to **"sign the contract"**.

**Failure criteria:**
If the API starts returning errors or slows down significantly already at the expected peak (load test), the recommendation is **"do not sign without renegotiating the SLA with the vendor."**

## Tools
- K6 - used for all four scenarios (baseline, load, stress, failure/resilience). Chosen for scripted consistency and built-in pass/fail thresholds across the full cycle as well as personal preference. A detailed K6 vs JMeter comparison was already done in my previous project (see PerfoTesting-Playground), so this one focuses on the testing cycle and reporting rather than tool comparison (as I planned initially).
- Docker — local httpbin instance, to allow unrestricted stress testing without impacting a shared public service