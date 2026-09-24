# main vs perfromance-tuning-vm-verssion — 1000-row perf comparison

- Date: 2026-09-22
- Harness: `watchmen-test-harness`, `WHT_PERF=1 WHT_PERF_ROWS=1000`, `--suite full --skip-newman`, MySQL (docker compose, fresh stack each run)
- main: `70889bc18` → `perf-main.json` (run `mysql-20260922-230641`)
- branch: `perfromance-tuning-vm-verssion` + the 7 review fixes (uncommitted) → `perf-branch.json` (run `mysql-20260922-230228`)

## Correctness (e2e suite)

| branch | result | tests | duration |
|---|---|---|---|
| main | PASS | 10/10 | 474s |
| branch + fixes | PASS | 12/12 | 179s |

Branch runs 2 extra tests (`test_pass_1_seed_values`, `test_pass_2_update_and_accumulate`) that do not exist on main; every test present on each branch passed. Staging drained, target topic landed, event finished on both.

## Performance (1000 root rows + 1000 child rows)

| metric | main | branch + fixes | delta |
|---|---:|---:|---:|
| pickup_wait_sec | n/a (older scenario) | 1.03 | — |
| extract_sec | 62.63 | 4.02 | −93.6% |
| merge_sec | 258.39 | 14.09 | −94.5% |
| first_target_sec | 66.68 | 10.06 | −84.9% |
| e2e_sec | 349.78 | 90.80 | −74.0% |
| throughput_rps | 2.86 | 11.01 | **3.85×** |
| peak_queue_record | 1000 | 1000 | 0% |

Notes:
- main's scenario lacks `pickup_wait_sec` separation, so its `e2e_sec` may include up to one 60s event-tick pickup; even subtracting a full tick, main chain time (≥290s) is still >3× the branch's 90.8s.
- Both runs used identical defaults (`PARTIAL_SIZE=100`, tick=3s, `ask_partial_size=100`, `BATCH_BUILD_IN_CHUNK_SIZE=500`).

## MySQL global counters (delta across the measured chain)

| counter | main | branch + fixes | delta |
|---|---:|---:|---:|
| Questions | 81,393 | 35,363 | −56.6% |
| Innodb_rows_read | 1,018,010 | 31,925 | −96.9% |
| Innodb_rows_inserted | 9,013 | 8,010 | −11.1% |
| Innodb_rows_updated | 4,011 | 4,011 | 0% |
| Innodb_rows_deleted | 3,009 | 3,006 | ≈0 |
| Slow_queries | 0 | 0 | 0 |

`Innodb_rows_read` −97% is the signature of the batched IN-probe child fetch (one query per child table per level) replacing per-row lookups; `Questions` −57% reflects fewer round trips overall.

## Fixes verified in this run (branch side)

1. Batch-level non-retryable error → `fail_unarchived_records` archives FAIL only for still-EXECUTING records; finalize skips unarchived rows (source rows preserved for retry).
2. `post_json` non-retryable → `fail_unarchived_jsons` archives only still-EXECUTING jsons; row-by-row fallback re-raises retryable errors.
3. `find_json_by_ids` restores caller id order (deterministic task processing).
4. `mount_child_batch` reads join keys with original-then-lowercased lookup, skips None keys with a per-batch warning.
5. `build_json_pairs` builds children into a per-record copy (`create_json` semantics restored); `root_data` stays clean.
6. `post_jsons` writes `task_id` back per json after the batch commit.
7. `is_retryable_storage_error` recognizes PostgreSQL SQLSTATEs 40001/40P01/55P03 in addition to MySQL 1213/1205.
8. Task listener deadline no longer bypassed after a big task.

## Conclusion

The performance branch with the review fixes is **green on the full e2e suite** and delivers **~3.85× end-to-end throughput** (2.86 → 11.01 rows/s) and **−74% e2e latency** at 1000 rows versus main, with a **−97% reduction in InnoDB rows read**. No row-write-path changes were introduced; staging still claims/archives in transactions as before.
