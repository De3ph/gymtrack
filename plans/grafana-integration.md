# Grafana Dashboard Integration

## TL;DR

> **Quick Summary**: Add Prometheus server + Grafana to the existing Docker Compose setup with auto-provisioned full-stack dashboards visualizing backend HTTP metrics, Go runtime, and process metrics.

> **Deliverables**:
> - `prometheus/prometheus.yml` — Scrape config targeting backend at `host.docker.internal:8080/metrics`
> - `grafana/provisioning/datasources/prometheus.yml` — Auto-provisioned Prometheus datasource
> - `grafana/provisioning/dashboards/dashboards.yaml` — Dashboard provider config
> - `grafana/provisioning/dashboards/gymtrack-backend.json` — Full-stack dashboard JSON
> - `docker-compose.yml` — Extended with Prometheus (`:9090`) + Grafana (`:3001`) services
> - Docker volumes `prometheus_data` + `grafana_data` for persistence

> **Estimated Effort**: Short (4 implementation tasks)
> **Parallel Execution**: YES — 2 waves + 1 final verification wave
> **Critical Path**: Tasks 1-3 (parallel Wave 1) → Task 4 (Wave 2) → F1-F4

---

## Context

### Original Request
"Create plan to integrate Prometheus in Grafana" — after Prometheus backend instrumentation was completed.

### Interview Summary
**Key Discussions**:
- **Deployment**: Docker Compose — extend existing `docker-compose.yml` (PostgreSQL + pgAdmin)
- **Grafana Auth**: `admin`/`admin` (default, standard for local dev)
- **Data Persistence**: Yes — named Docker volumes (`prometheus_data`, `grafana_data`)
- **Dashboard Scope**: Full stack — HTTP overview (QPS, latency, errors, status codes) + Go runtime (goroutines, GC, memory) + Process metrics (CPU, RSS, open FDs)
- **Dashboard delivery**: Auto-provisioned JSON — committed to repo, no manual setup in Grafana UI

**Research Findings**:
- **Platform**: Windows with Docker Desktop — `host.docker.internal` resolves correctly
- **Existing docker-compose.yml**: PostgreSQL 16 on `:5432`, pgAdmin on `:5050` — root port `3000` Next.js, `3001` already in CORS allowlist
- **Backend**: Runs on host `:8080` via `go run cmd/server/main.go`, NOT containerized
- **Metrics endpoint**: `GET /metrics` at root level (not under `/api`), no auth, already wired and working
- **Metrics available**: `gymtrack_http_requests_total`, `gymtrack_http_request_duration_seconds`, `gymtrack_http_requests_in_flight`, `go_*`, `process_*`, `go_info`
- **No existing monitoring infra** — clean slate
- **Grafana version**: `grafana/grafana:11.5.0` pinned
- **Prometheus version**: `prom/prometheus:v2.55.1` pinned

### Metis Review
**Identified Gaps** (addressed):
- **P0 Dashboard provider file**: Added `grafana/provisioning/dashboards/dashboards.yaml` — Grafana won't auto-load JSON without it
- **P0 host.docker.internal**: Windows Docker Desktop confirmed — resolves correctly
- **P1 Pinned versions**: Grafana 11.5.0 and Prometheus v2.55.1 pinned — no `:latest`
- **P1 Dashboard JSON**: Hand-written targeting Grafana 11.x schema (schemaVersion 39)
- **P2 Dev retention**: `--storage.tsdb.retention.time=7d` for Prometheus to avoid disk bloat
- **P2 Port documentation**: Added comments in docker-compose.yml explaining port choices
- **P2 Resource limits**: Added sensible dev limits (capped at 1 CPU, 512MB memory)
- **P2 Plaintext creds**: Documented as acceptable for dev; flagged for production

---

## Work Objectives

### Core Objective
Extend the existing Docker Compose stack with Prometheus server and Grafana, delivering auto-provisioned, full-stack dashboards for backend HTTP metrics, Go runtime, and process metrics.

### Concrete Deliverables
- `prometheus/prometheus.yml` — Scrape configuration file
- `grafana/provisioning/datasources/prometheus.yml` — Grafana datasource provisioning
- `grafana/provisioning/dashboards/dashboards.yaml` — Grafana dashboard provider
- `grafana/provisioning/dashboards/gymtrack-backend.json` — Hand-written dashboard JSON
- `docker-compose.yml` — Updated with `prometheus` and `grafana` services + volumes
- `.omo/evidence/` — QA evidence files

### Definition of Done
- [ ] `docker compose up -d prometheus grafana` starts both containers (exit 0)
- [ ] `curl http://localhost:9090/-/ready` returns HTTP 200 (Prometheus ready)
- [ ] `curl http://localhost:3001/api/health` returns HTTP 200 (Grafana ready)
- [ ] Prometheus target `gymtrack-backend` shows health `"up"` after backend is running
- [ ] Grafana datasource `prometheus` provisioned and points to `http://prometheus:9090`
- [ ] Grafana dashboard `GymTrack Backend` provisioned and visible in search
- [ ] Dashboard panels resolve with data when backend is running
- [ ] `docker compose down` stops cleanly; `docker compose down -v` removes volumes

### Must Have
- Prometheus container scrapes `http://host.docker.internal:8080/metrics` every 15s
- Grafana auto-provisions Prometheus datasource via YAML
- Grafana auto-provisions dashboard JSON (no manual import)
- Dashboard has 4 organized rows: HTTP Overview, Traffic & Latency, Go Runtime, Process & Build Info
- HTTP Overview row: CPU, memory, goroutines, request rate (QPS), error rate (5xx%), in-flight gauge, P95 latency
- Traffic & Latency row: Request rate by route, latency percentiles (P50/P95/P99/Avg), status code breakdown, duration by route tables (P50, P99)
- Go Runtime row: goroutines count, GC duration, heap memory, stack memory
- Process & Build Info row: open file descriptors, Go version info
- All panels use the custom `gymtrack_*` metrics namespace + `go_*` and `process_*` collectors
- Port mapping: Prometheus `:9090`, Grafana `:3001` (3000 = Next.js)
- Docker volumes for data persistence across restarts

### Must NOT Have (Guardrails)
- NO changes to backend Go code (metrics middleware, routes, module.go — all untouched)
- NO changes to existing Docker Compose services (PostgreSQL, pgAdmin stay as-is)
- NO auth on `/metrics` endpoint — Prometheus scrapes without credentials
- NO alerting rules in Prometheus or Grafana
- NO container metrics (cadvisor, node_exporter)
- NO log aggregation (Loki, Promtail)
- NO frontend changes (Next.js unmodified)
- NO business-level metrics panels (workout count, signups, etc.)
- NO changes to backend `.env` or configuration
- NO changes to CORS configuration

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Docker Compose)
- **Automated tests**: None (infrastructure + visualization — no unit tests needed)
- **Agent-Executed QA**: PRIMARY verification method — each task includes bash + curl + Playwright scenarios

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Container/Service checks**: `bash` — `docker compose ps`, `curl` health endpoints
- **Prometheus scraping**: `bash` — `curl` Prometheus API (`/api/v1/targets`, `/api/v1/query`)
- **Grafana provisioning**: `bash` — `curl` Grafana API (`/api/datasources`, `/api/search`, `/api/ds/query`)
- **Dashboard visual**: `Playwright` — Login to Grafana, navigate to dashboard, verify panels render, screenshot
- **Playwright notes**: Grafana uses `<iframe>` for some panels and loads data asynchronously; wait for panel queries to complete, screenshot each dashboard row

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — config files, all parallel):
├── Task 1: Create Prometheus scrape config [quick]
├── Task 2: Create Grafana provisioning files [quick]
└── Task 3: Create Grafana dashboard JSON [unspecified-high]

Wave 2 (After Wave 1 — docker compose integration):
└── Task 4: Update docker-compose.yml + full QA [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Config quality review (unspecified-high)
├── F3: QA scenario execution (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Tasks 1-3 (parallel) → Task 4 → F1-F4 → user okay
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix
- **1**: - → 4
- **2**: - → 4
- **3**: - → 4
- **4**: 1, 2, 3 → F1-F4
- **F1-F4**: 4 → user okay

### Agent Dispatch Summary
- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `quick`, T3 → `unspecified-high`
- **Wave 2**: 1 task — T4 → `deep`
- **Final**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Create Prometheus scrape config (`prometheus/prometheus.yml`)

  **What to do**:
  Create `prometheus/prometheus.yml` at the project root with:
  - Global config with `scrape_interval: 15s`, `evaluation_interval: 15s`
  - Single scrape job `gymtrack-backend` targeting `host.docker.internal:8080/metrics`
  - Scrape timeout: `10s`
  - Add metric_relabel config to drop any `promhttp_metric_handler_*` metrics (these are noise from the /metrics endpoint itself)
  - Job should include `metrics_path: /metrics` explicitly (even though it's the default — clarity)
  - Add a `job` label: `gymtrack-backend`

  **Must NOT do**:
  - Do NOT include any other scrape jobs (no node_exporter, no postgres_exporter)
  - Do NOT use `localhost:8080` (Prometheus is in Docker, localhost inside container != host)
  - Do NOT add alerting rules or `rule_files`
  - Do NOT add remote write config

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small YAML file, straightforward Prometheus config
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: [Task 4]
  - **Blocked By**: None (can start immediately)

  **References**:
  - None needed — standard Prometheus scrape config for a single target
  - Backend metrics endpoint at `http://localhost:8080/metrics` confirmed working from Prometheus integration plan

  **Acceptance Criteria**:
  - [ ] File exists at `prometheus/prometheus.yml`
  - [ ] `docker run --rm -v ${PWD}/prometheus:/config prom/prometheus:v2.55.1 promtool check config /config/prometheus.yml` exits 0
  - [ ] Scrape target uses `host.docker.internal:8080` (NOT `localhost:8080`)
  - [ ] `scrape_interval` is set to `15s`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Prometheus config is valid
    Tool: Bash
    Preconditions: File exists at prometheus/prometheus.yml
    Steps:
      1. Run `docker run --rm -v "${PWD}/prometheus:/config" prom/prometheus:v2.55.1 promtool check config /config/prometheus.yml`
    Expected Result: Exit code 0, output contains "SUCCESS"
    Failure Indicators: Config validation errors, syntax errors, "FAILED" output
    Evidence: .omo/evidence/task-1-promtool-check.txt

  Scenario: Scrape target uses host.docker.internal
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep "host.docker.internal" prometheus/prometheus.yml`
    Expected Result: Match found — confirms container can reach host backend
    Failure Indicators: Uses "localhost" — container won't reach host
    Evidence: .omo/evidence/task-1-scrape-target.txt
  ```

  **Evidence to Capture:**
  - [ ] `promtool check config` output
  - [ ] grep confirmation of host.docker.internal usage

  **Commit**: NO (groups with Tasks 2-4)

---

- [ ] 2. Create Grafana provisioning files

  **What to do**:
  Create two files:

  **A. `grafana/provisioning/datasources/prometheus.yml`** — Auto-provisioned Prometheus datasource:
  ```yaml
  apiVersion: 1

  datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      editable: false
      uid: prometheus
  ```

  **B. `grafana/provisioning/dashboards/dashboards.yaml`** — Dashboard provider config:
  ```yaml
  apiVersion: 1

  providers:
    - name: GymTrack
      type: file
      options:
        path: /etc/grafana/provisioning/dashboards
        foldersFromFilesStructure: false
  ```

  **Why both files are needed**:
  - The `datasources/*.yml` provisions the Prometheus data source in Grafana so it can query
  - The `dashboards/*.yaml` (provider config) tells Grafana to scan the `dashboards/` directory for JSON files and auto-import them. **Without this file, Grafana ignores the dashboard JSON entirely.**
  - The datasource `uid: prometheus` must match what the dashboard JSON references in its panel queries

  **Must NOT do**:
  - Do NOT add any other datasources (Loki, InfluxDB, etc.)
  - Do NOT set `editable: true` — datasource config should be managed by provisioning
  - Do NOT use `localhost:9090` for the Grafana datasource URL — Prometheus is accessible via Docker network as `prometheus:9090`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two small YAML files, straightforward Grafana provisioning config
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: [Task 4]
  - **Blocked By**: None (can start immediately)

  **References**:
  - Official Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/

  **Acceptance Criteria**:
  - [ ] `grafana/provisioning/datasources/prometheus.yml` exists with `url: http://prometheus:9090`
  - [ ] `grafana/provisioning/dashboards/dashboards.yaml` exists with provider path `/etc/grafana/provisioning/dashboards`
  - [ ] Datasource UID set to `prometheus` (must match dashboard JSON references)
  - [ ] Grafana can parse the files (tested by starting Grafana and checking /api/datasources)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Datasource uses prometheus:9090 (Docker networking)
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep "prometheus:9090" grafana/provisioning/datasources/prometheus.yml`
    Expected Result: Match found — container-to-container communication via Docker network
    Failure Indicators: Uses "localhost:9090" — won't work from inside Grafana container
    Evidence: .omo/evidence/task-2-datasource-url.txt

  Scenario: Dashboard provider points to correct path
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep "/etc/grafana/provisioning/dashboards" grafana/provisioning/dashboards/dashboards.yaml`
    Expected Result: Match found — Grafana will scan this directory
    Failure Indicators: Wrong path — dashboards won't auto-load
    Evidence: .omo/evidence/task-2-provider-path.txt

  Scenario: Datasource UID matches expected value
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep "uid:" grafana/provisioning/datasources/prometheus.yml | grep "prometheus"`
    Expected Result: Match found — dashboard JSON will reference this UID
    Failure Indicators: Wrong or missing UID — panels will show "Datasource not found"
    Evidence: .omo/evidence/task-2-datasource-uid.txt
  ```

  **Evidence to Capture:**
  - [ ] grep output for datasource URL
  - [ ] grep output for dashboard provider path
  - [ ] grep output for datasource UID

  **Commit**: NO (groups with Tasks 1, 3, 4)

---

- [ ] 3. Create Grafana dashboard JSON (`grafana/provisioning/dashboards/gymtrack-backend.json`)

  **What to do**:
  Create a hand-written Grafana 11.x dashboard JSON at `grafana/provisioning/dashboards/gymtrack-backend.json` targeting **Grafana 11.x schema (schemaVersion 39)**.

  **Dashboard Metadata**:
  - Title: `GymTrack Backend`
  - UID: `gymtrack-backend`
  - Tags: `gymtrack`, `backend`, `prometheus`
  - Timezone: `utc`
  - Time range: `now-1h` to `now` (configurable via UI picker)
  - Refresh: `30s`

  **Dashboard Structure — 4 Rows with 18 panels:**

  **Row 1: HTTP Overview (7 panels)**

  1. **CPU**
     - Query: `rate(process_cpu_seconds_total[5m])`
     - Type: Time series
     - Unit: `percent (0-1)`
     - Legend: `CPU`
     - Description: Process CPU usage rate

  2. **Memory**
     - Query: `process_resident_memory_bytes`
     - Type: Time series
     - Unit: `bytes`
     - Legend: `RSS`
     - Description: Resident memory usage

  3. **Go Routines**
     - Query: `go_goroutines`
     - Type: Stat (big number)
     - Unit: `short`
     - Description: Current goroutine count
     - Thresholds: green (`<200`), yellow (`200-500`), red (`>500`)

  4. **Request Rate (QPS)**
     - Query: `sum(rate(gymtrack_http_requests_total[5m]))`
     - Type: Stat (big number)
     - Unit: `cps` (counts/sec, short)
     - Description: Requests per second over last 5m

  5. **Error Rate**
     - Query: `(sum(rate(gymtrack_http_requests_total{status=~"5.."}[5m])) / sum(rate(gymtrack_http_requests_total[5m]))) * 100`
     - Type: Stat (big number) with gauge
     - Unit: `percent (0-100)`
     - Description: Percentage of 5xx responses
     - Thresholds: green (`<1`), yellow (`1-5`), red (`>5`)

  6. **In-Flight Requests**
     - Query: `gymtrack_http_requests_in_flight`
     - Type: Stat (big number)
     - Unit: `short`
     - Description: Currently processing requests
     - Thresholds: green (`<10`), yellow (`10-50`), red (`>50`)

  7. **Request Duration (P95)**
     - Query: `histogram_quantile(0.95, sum(rate(gymtrack_http_request_duration_seconds_bucket[5m])) by (le))`
     - Type: Stat (big number)
     - Unit: `s` (seconds)
     - Description: P95 latency over last 5m
     - Thresholds: green (`<0.5`), yellow (`0.5-2`), red (`>2`)

  **Row 2: Traffic & Latency (5 panels)**

  8. **Request Rate by Route**
     - Query: `sum(rate(gymtrack_http_requests_total[5m])) by (path)`
     - Type: Time series
     - Unit: `cps`
     - Legend: `{{path}}`
     - Description: QPS broken down by API route

  9. **Request Duration Buckets**
     - Queries:
       - P50: `histogram_quantile(0.5, sum(rate(gymtrack_http_request_duration_seconds_bucket[5m])) by (le))`
       - P95: `histogram_quantile(0.95, sum(rate(gymtrack_http_request_duration_seconds_bucket[5m])) by (le))`
       - P99: `histogram_quantile(0.99, sum(rate(gymtrack_http_request_duration_seconds_bucket[5m])) by (le))`
       - Avg: `avg(rate(gymtrack_http_request_duration_seconds_sum[5m]) / rate(gymtrack_http_request_duration_seconds_count[5m]))`
     - Type: Time series
     - Unit: `s`
     - Legend: `P50`, `P95`, `P99`, `Avg`
     - Description: Latency percentiles over time

  10. **Requests by Status Code**
      - Query: `sum(rate(gymtrack_http_requests_total[5m])) by (status)`
      - Type: Bar gauge (or time series stacked)
      - Unit: `cps`
      - Legend: `{{status}}`
      - Description: Request rate broken down by HTTP status code

  11. **Request Duration by Route (P50)**
      - Query: `histogram_quantile(0.5, sum(rate(gymtrack_http_request_duration_seconds_bucket[5m])) by (le, path))`
      - Type: Table (top 10)
      - Unit: `s`
      - Transform: sort by value descending
      - Description: Median latency per route (identify slowest endpoints)

  12. **Request Duration by Route (P99)**
      - Query: `histogram_quantile(0.99, sum(rate(gymtrack_http_request_duration_seconds_bucket[5m])) by (le, path))`
      - Type: Table (top 10)
      - Unit: `s`
      - Transform: sort by value descending
      - Description: P99 latency per route (identify worst-case endpoints)

  **Row 3: Go Runtime (4 panels)**

  13. **Go Goroutines**
      - Query: `go_goroutines`
      - Type: Time series
      - Unit: `short`
      - Legend: `Goroutines`
      - Description: Number of goroutines over time

  14. **Go GC Duration**
      - Query: `go_gc_duration_seconds`
      - Type: Time series (quantiles: 0, 0.25, 0.5, 0.75, 1)
      - Unit: `s`
      - Legend: `GC {{quantile}}`
      - Description: Garbage collection pause durations

  15. **Go Memory (Heap)**
      - Query: `go_memstats_heap_alloc_bytes`
      - Type: Time series
      - Unit: `bytes`
      - Legend: `Heap Alloc`
      - Description: Heap memory allocated and in use

  16. **Go Memory (Stack)**
      - Query: `go_memstats_stack_inuse_bytes`
      - Type: Time series
      - Unit: `bytes`
      - Legend: `Stack Inuse`
      - Description: Stack memory in use

  **Row 4: Process & Build Info (2 panels)**

  17. **Process Open FDs**
      - Query: `process_open_fds`
      - Type: Time series
      - Unit: `short`
      - Legend: `Open FDs`
      - Description: Open file descriptors

  18. **Go Version Info**
      - Query: `go_info`
      - Type: Stat
      - Unit: `none`
      - Legend: `Go {{version}}`
      - Description: Go version used by the backend

  **Important JSON structure notes**:
  - Each panel must have unique `id` (start from 1, increment)
  - Each panel must specify `"datasource": {"type": "prometheus", "uid": "prometheus"}` (matching the datasource UID from Task 2)
  - Grid positions: use `h`/`w`/`x`/`y` to layout in 24-column grid
    - Row 1 stat panels (3, 4, 5, 6, 7): 4 units wide each (w=4)
    - Full-width time series panels (8, 9, 10, 11, 12, 13, 14, 15, 16, 17): 12-24 units wide (w=12 or w=24)
    - Table panels (11, 12): 12 units wide each
  - Row 1 shared time series panels (1, 2): 12 units wide each, side by side
  - Row height: `h=8` for stat panels, `h=10` for time series, `h=8` for tables
  - Include standard query options: `"instant": false`, `"range": true` for time series queries
  - Use `"legend": {"displayMode": "table", "placement": "bottom"}` for time series

  **Must NOT do**:
  - Do NOT reference any metrics that don't exist (`gymtrack_requests_, gymtrack_db_*`, etc.)
  - Do NOT set `"editable": false` on the dashboard (we want the user to be able to tweak panels)
  - Do NOT include any panels that require alerting rules
  - Do NOT use deprecated panel types (singlestat, graph-old — use `timeseries`, `stat`, `bargauge`, `table`)
  - Do NOT include any external plugin references

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful hand-writing of ~500+ lines of Grafana 11.x JSON with correct schema, valid queries, and proper panel layout
  - **Skills**: [] (no special skills needed — PromQL knowledge is essential, verify query syntax)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: [Task 4]
  - **Blocked By**: None (can start immediately)

  **References**:
  - Grafana 11.x dashboard JSON schema — standard `schemaVersion: 39`
  - Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
  - `prometheus/client_golang` metrics generated by backend (confirmed via curl against running backend):
    - `gymtrack_http_requests_total{method, path, status}`
    - `gymtrack_http_request_duration_seconds_bucket{method, path, le}`
    - `gymtrack_http_request_duration_seconds_sum{method, path}`
    - `gymtrack_http_request_duration_seconds_count{method, path}`
    - `gymtrack_http_requests_in_flight`
    - `go_goroutines`, `go_gc_duration_seconds`, `go_memstats_*`, `go_info`
    - `process_cpu_seconds_total`, `process_resident_memory_bytes`, `process_open_fds`

  **Acceptance Criteria**:
  - [ ] File exists at `grafana/provisioning/dashboards/gymtrack-backend.json`
  - [ ] `jq '.title' grafana/provisioning/dashboards/gymtrack-backend.json` outputs `"GymTrack Backend"`
  - [ ] `jq '.panels | length' grafana/provisioning/dashboards/gymtrack-backend.json` returns 18 (all panels)
  - [ ] `jq '.schemaVersion' grafana/provisioning/dashboards/gymtrack-backend.json` returns 39 (Grafana 11.x)
  - [ ] All panel datasource UIDs reference `prometheus`
  - [ ] Dashboard is valid JSON (`jq .` parses without error)
  - [ ] No deprecated panel types used (check for `singlestat`, `graph-old`, `graphite`)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dashboard JSON is valid JSON
    Tool: Bash
    Preconditions: File exists
    Steps:
      1. Run `jq '.' grafana/provisioning/dashboards/gymtrack-backend.json > /dev/null 2>&1 && echo "VALID" || echo "INVALID"`
    Expected Result: Output "VALID"
    Failure Indicators: JSON parse errors, trailing commas, syntax issues
    Evidence: .omo/evidence/task-3-json-valid.txt

  Scenario: Schema version is 39 (Grafana 11.x)
    Tool: Bash
    Preconditions: File exists
    Steps:
      1. Run `jq -r '.schemaVersion' grafana/provisioning/dashboards/gymtrack-backend.json`
    Expected Result: Output "39"
    Failure Indicators: Lower version (36, 37, 38) — wrong Grafana target; no field — incomplete JSON
    Evidence: .omo/evidence/task-3-schema-version.txt

  Scenario: All panels use correct Prometheus datasource
    Tool: Bash
    Preconditions: File exists
    Steps:
      1. Run `jq '[.panels[].datasource.uid] | unique' grafana/provisioning/dashboards/gymtrack-backend.json`
    Expected Result: Only "prometheus" in the array (no null, no "default", no other UIDs)
    Failure Indicators: Missing datasource config, wrong UID — panels will show "Datasource not found"
    Evidence: .omo/evidence/task-3-datasource-refs.txt

  Scenario: All panel types are valid Grafana 11.x types
    Tool: Bash
    Preconditions: File exists
    Steps:
      1. Run `jq '[.panels[].type] | unique' grafana/provisioning/dashboards/gymtrack-backend.json`
    Expected Result: Only valid types: "timeseries", "stat", "bargauge", "table"
    Failure Indicators: "singlestat", "graph-old", "graph" — deprecated types not supported in Grafana 11.x
    Evidence: .omo/evidence/task-3-panel-types.txt

  Scenario: All 18 panels are present
    Tool: Bash
    Preconditions: File exists
    Steps:
      1. Run `jq '[.panels[].title]' grafana/provisioning/dashboards/gymtrack-backend.json`
    Expected Result: 18 panel titles listed (CPU, Memory, Go Routines, Request Rate, Error Rate, In-Flight, Request Duration (P95), Request Rate by Route, Request Duration Buckets, Requests by Status Code, Duration by Route P50, Duration by Route P99, Go Goroutines, Go GC Duration, Go Memory Heap, Go Memory Stack, Process Open FDs, Go Version Info)
    Failure Indicators: Missing panels, duplicate titles
    Evidence: .omo/evidence/task-3-panel-list.txt
  ```

  **Evidence to Capture:**
  - [ ] JSON validity check
  - [ ] Schema version confirmation
  - [ ] Datasource UID uniformity
  - [ ] Panel type inventory
  - [ ] Panel title list

  **Commit**: NO (groups with Tasks 1, 2, 4)

---

- [ ] 4. Update docker-compose.yml with Prometheus + Grafana services + full QA

  **What to do**:
  Modify `docker-compose.yml` at the project root to add Prometheus and Grafana services alongside the existing PostgreSQL + pgAdmin.

  **A. Add Prometheus service**:
  ```yaml
  prometheus:
    image: prom/prometheus:v2.55.1
    container_name: gymtrack-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=7d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
  ```

  **B. Add Grafana service**:
  ```yaml
  grafana:
    image: grafana/grafana:11.5.0
    container_name: gymtrack-grafana
    ports:
      - "3001:3000"  # 3001=Grafana (3000=Next.js)
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
  ```

  **C. Add volumes section**:
  ```yaml
  volumes:
    pgdata:
    pgadmin_data:
    prometheus_data:
    grafana_data:
  ```

  **Important notes**:
  - Grafana port mapping is `3001:3000` — Grafana default is port 3000 internally, but we expose it on 3001 to avoid conflict with Next.js on 3000
  - `prometheus_data` and `grafana_data` are named volumes (not bind mounts) for reliability across platforms
  - Evironment variables `GF_SECURITY_ADMIN_USER` and `GF_SECURITY_ADMIN_PASSWORD` set the default admin credentials
  - _No `depends_on` on `prometheus` from `grafana` is technically optional — Grafana will retry connecting to Prometheus even if Prometheus starts slightly later. But for correct startup order, we include it.
  - The backend runs on the host (not Docker), so there is no `depends_on` for the backend.

  **D. Full QA — After updating docker-compose.yml, run these verifications**:

  **Precondition**: Backend must be running on the host (`cd backend && go run cmd/server/main.go`)

  **Must NOT do**:
  - Do NOT change the existing `db` or `pgadmin` services
  - Do NOT containerize the backend
  - Do NOT use `:latest` tags — images are pinned to specific versions
  - Do NOT add environment variables with passwords in plaintext beyond `admin`/`admin` (which is acceptable for dev)
  - Do NOT add a `restart: always` policy (dev setup — manual restart is fine)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires careful YAML editing, understanding of Docker networking, volumes, and resource constraints. Also runs the full end-to-end QA suite including Playwright for Grafana UI verification.
  - **Skills**: [`playwright-cli`] (for Grafana UI login + dashboard navigation + screenshot verification)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: [F1-F4]
  - **Blocked By**: [Tasks 1, 2, 3] (all config files must exist)

  **References**:
  - `docker-compose.yml` (existing) — Add new services after existing `pgadmin` block
  - `prometheus/prometheus.yml` — Created in Task 1, referenced as config file
  - `grafana/provisioning/` — Created in Tasks 2 and 3, mounted as provisioning directory

  **Acceptance Criteria**:
  - [ ] `cd [repo-root] && docker compose config` passes (syntax valid)
  - [ ] `docker compose up -d prometheus grafana` exits 0
  - [ ] Both containers show `running` status
  - [ ] `curl http://localhost:9090/-/ready` returns 200
  - [ ] `curl http://localhost:3001/api/health` returns 200
  - [ ] Prometheus target shows `health="up"` (backend must be running)
  - [ ] Grafana has Prometheus datasource provisioned
  - [ ] Grafana dashboard `GymTrack Backend` is visible
  - [ ] Dashboard panels resolve with data
  - [ ] `docker compose down` stops both cleanly
  - [ ] Volume data persists across restart (test: stop, start, check data)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Docker Compose config validates
    Tool: Bash
    Preconditions: docker-compose.yml exists with prometheus + grafana services added
    Steps:
      1. Run `docker compose config > /dev/null 2>&1 && echo "VALID" || echo "INVALID"`
    Expected Result: "VALID" — no YAML syntax errors
    Failure Indicators: Invalid YAML, missing volume refs, port conflicts
    Evidence: .omo/evidence/task-4-compose-valid.txt

  Scenario: Prometheus container starts and is healthy
    Tool: Bash
    Preconditions: docker-compose.yml updated
    Steps:
      1. Run `docker compose up -d prometheus`
      2. Run `timeout 30 bash -c 'until curl -s http://localhost:9090/-/ready > /dev/null 2>&1; do sleep 2; done'`
      3. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/ready`
    Expected Result: HTTP 200 (Prometheus ready)
    Failure Indicators: Timeout (container not starting), HTTP non-200, container exit
    Evidence: .omo/evidence/task-4-prometheus-ready.txt

  Scenario: Grafana container starts and is healthy
    Tool: Bash
    Preconditions: docker-compose.yml updated
    Steps:
      1. Run `docker compose up -d grafana`
      2. Run `timeout 30 bash -c 'until curl -s http://localhost:3001/api/health > /dev/null 2>&1; do sleep 2; done'`
      3. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health`
    Expected Result: HTTP 200 (Grafana ready)
    Failure Indicators: Timeout, HTTP non-200, container exit
    Evidence: .omo/evidence/task-4-grafana-ready.txt

  Scenario: Prometheus scrapes backend target (backend must be running)
    Tool: Bash
    Preconditions: Backend running on host:8080, Prometheus container running
    Steps:
      1. Run `curl -s 'http://localhost:9090/api/v1/targets' | jq -r '.data.activeTargets[] | select(.labels.job == "gymtrack-backend") | .health'`
    Expected Result: "up" — Prometheus successfully connects to backend
    Failure Indicators: "down" — cannot reach host.docker.internal:8080, backend not running
    Evidence: .omo/evidence/task-4-prometheus-scrape.txt

  Scenario: Prometheus can query backend metrics
    Tool: Bash
    Preconditions: Prometheus running, backend running at least 15s (one scrape cycle)
    Steps:
      1. Run `curl -s 'http://localhost:9090/api/v1/query?query=gymtrack_http_requests_total' | jq -e '.data.result | length > 0'`
    Expected Result: Exit 0 (true) — metrics available in Prometheus
    Failure Indicators: Empty result set — scrape not working or metrics not generated
    Evidence: .omo/evidence/task-4-prometheus-query.txt

  Scenario: Grafana datasource is auto-provisioned
    Tool: Bash
    Preconditions: Grafana running
    Steps:
      1. Run `curl -s -u admin:admin http://localhost:3001/api/datasources | jq -e '.[] | select(.type == "prometheus" and .url == "http://prometheus:9090")'`
    Expected Result: Match found — datasource "Prometheus" pointing to http://prometheus:9090
    Failure Indicators: No datasource — provisioning files not mounted correctly
    Evidence: .omo/evidence/task-4-grafana-datasource.txt

  Scenario: Grafana dashboard is auto-provisioned
    Tool: Bash
    Preconditions: Grafana running, datasource provisioned
    Steps:
      1. Run `curl -s -u admin:admin 'http://localhost:3001/api/search?query=gymtrack' | jq -e '.[] | select(.title | test("GymTrack Backend"; "i"))'`
    Expected Result: Match found — dashboard "GymTrack Backend" is provisioned
    Failure Indicators: Empty results — dashboards.yaml provider not configured correctly
    Evidence: .omo/evidence/task-4-grafana-dashboard.txt

  Scenario: Data flows from Prometheus to Grafana dashboard
    Tool: Bash
    Preconditions: Grafana running, datasource provisioned, backend running
    Steps:
      1. Run `curl -s -u admin:admin 'http://localhost:3001/api/ds/query' -H 'Content-Type: application/json' -d '{"queries":[{"refId":"A","datasource":{"type":"prometheus","uid":"prometheus"},"expr":"gymtrack_http_requests_total","instant":true}]}' | jq -e '.results.A.frames[0].data.values[0] | length > 0'`
    Expected Result: Exit 0 (true) — data array is non-empty
    Failure Indicators: Empty data — backend not scraped or Prometheus datasource broken
    Evidence: .omo/evidence/task-4-data-flow.txt

  Scenario: Grafana login and dashboard renders (Playwright)
    Tool: Playwright
    Preconditions: Grafana running on localhost:3001
    Steps:
      1. Navigate to `http://localhost:3001/login`
      2. Wait for login form to load (selector: `input[name="user"]`)
      3. Type "admin" in username field
      4. Type "admin" in password field
      5. Click "Log in" button
      6. Wait for redirect to home (URL changes to /?orgId=1 or /dashboards)
      7. Navigate to `http://localhost:3001/dashboards`
      8. Wait for dashboard list to load
      9. Verify "GymTrack Backend" appears in the list
      10. Click on "GymTrack Backend" dashboard
      11. Wait 10s for panels to load queries
      12. Take full-page screenshot
    Expected Result: Login succeeds, dashboard is accessible, panels render data (not "No data" errors)
    Failure Indicators: Login fails, dashboard not found, all panels show "No data" or "Datasource not found"
    Evidence: .omo/evidence/task-4-grafana-playwright-screenshot.png

  Scenario: Data persists across restart
    Tool: Bash
    Preconditions: Prometheus has been scraping for at least 30s
    Steps:
      1. Run `docker compose down` (stops both prometheus + grafana)
      2. Run `docker compose up -d prometheus grafana` (restarts)
      3. Wait 10s for containers to be ready
      4. Run `curl -s 'http://localhost:9090/api/v1/query?query=gymtrack_http_requests_total' | jq -e '.data.result | length > 0'`
    Expected Result: Data still present (volume persisted TSDB)
    Failure Indicators: Empty result after restart — data not persisted in named volume
    Evidence: .omo/evidence/task-4-data-persistence.txt

  Scenario: docker compose down cleans up gracefully
    Tool: Bash
    Preconditions: Both containers running
    Steps:
      1. Run `docker compose down`
      2. Run `docker compose ps --all | grep "gymtrack-" | wc -l`
    Expected Result: 0 — no containers remain
    Failure Indicators: Containers still running or in "exited" state — incomplete cleanup
    Evidence: .omo/evidence/task-4-clean-shutdown.txt

  Scenario: Edge case — backend not running (graceful degradation)
    Tool: Bash
    Preconditions: Prometheus + Grafana running, backend stopped
    Steps:
      1. Run `curl -s 'http://localhost:9090/api/v1/targets' | jq -r '.data.activeTargets[] | select(.labels.job == "gymtrack-backend") | .health'`
    Expected Result: "down" (Prometheus reports target as down, doesn't crash)
    Failure Indicators: Prometheus crash, target missing from list entirely
    Evidence: .omo/evidence/task-4-backend-down.txt
  ```

  **Evidence to Capture:**
  - [ ] Docker Compose validation output
  - [ ] Prometheus ready check
  - [ ] Grafana health check
  - [ ] Prometheus target scrape status
  - [ ] Prometheus query result
  - [ ] Grafana datasource list
  - [ ] Grafana dashboard search
  - [ ] Data flow API response
  - [ ] Playwright screenshot of dashboard
  - [ ] Data persistence proof
  - [ ] Shutdown proof

  **Commit**: YES (groups with Tasks 1-3)
  - Message: `feat(infra): add Prometheus + Grafana with auto-provisioned dashboards`
  - Files: `docker-compose.yml`, `prometheus/prometheus.yml`, `grafana/provisioning/datasources/prometheus.yml`, `grafana/provisioning/dashboards/dashboards.yaml`, `grafana/provisioning/dashboards/gymtrack-backend.json`
  - Pre-commit: `docker compose config` (validate)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, docker compose exec). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.omo/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Config Quality Review** — `unspecified-high`
  Validate Prometheus config (`promtool check config`). Validate dashboard JSON syntax (`jq`). Check docker-compose.yml syntax (`docker compose config`). Review for: hardcoded secrets, missing version pins, missing volume declarations, dangling references, YAML syntax errors.
  Output: `PromConfig [PASS/FAIL] | DashboardJSON [valid/invalid] | Compose [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration (Prometheus scrapes, Grafana reads datasource, panels render data). Test edge cases: backend not running (panels show no data gracefully), restart (data persists). Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Tasks 1-4** grouped into 1 commit: `feat(infra): add Prometheus + Grafana with auto-provisioned dashboards`

---

## Success Criteria

### Verification Commands
```bash
# Container health
docker compose ps --filter "status=running" --format "{{.Name}}" | grep -E "prometheus|grafana"

# Prometheus ready
curl -s --retry 10 --retry-delay 2 http://localhost:9090/-/ready

# Grafana ready
curl -s --retry 10 --retry-delay 2 http://localhost:3001/api/health

# Scrape target UP (backend must be running)
curl -s 'http://localhost:9090/api/v1/targets' | jq -e '.data.activeTargets[] | select(.labels.job == "gymtrack-backend" and .health == "up")'

# Datasource provisioned
curl -s -u admin:admin http://localhost:3001/api/datasources | jq -e '.[] | select(.type == "prometheus" and .url == "http://prometheus:9090")'

# Dashboard provisioned
curl -s -u admin:admin 'http://localhost:3001/api/search?query=gymtrack' | jq -e '.[] | select(.title | test("GymTrack"; "i"))'

# Data flowing to Grafana
curl -s -u admin:admin 'http://localhost:3001/api/ds/query' \
  -H 'Content-Type: application/json' \
  -d '{"queries":[{"refId":"A","datasource":{"type":"prometheus","uid":"prometheus"},"expr":"gymtrack_http_requests_total","instant":true}]}' \
  | jq -e '.results.A.frames[0].data.values[0] | length > 0'

# Clean shutdown
docker compose down
```

### Final Checklist
- [ ] Both containers start and stay healthy
- [ ] Prometheus scrapes backend successfully
- [ ] Grafana datasource auto-provisioned
- [ ] Dashboard auto-provisioned and visible
- [ ] All 10+ panels render with live data
- [ ] Data persists across `docker compose down && docker compose up`
- [ ] No backend code changes
- [ ] No alerting rules accidentally created
- [ ] `docker compose down -v` cleans up volumes
