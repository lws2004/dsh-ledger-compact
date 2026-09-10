# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 5 · variants: 7 · answers: 70 · calls: 70 new / 0 cached

| variant | drawn | sent (preview) | lines/frame | correct | est tok | measured tok | $/answer | $/correct | raw text $/answer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `legacy-1col-22` | 1024x1540 | 652x981 | 70 | 2/10 | 435 | 467 | $0.000140 | $0.000700 | $0.001044 |
| `auto-22` | 1024x2046 | 566x1131 | 1841 | 2/10 | 435 | 471 | $0.000141 | $0.000706 | $0.001044 |
| `auto-14` | 1024x2044 | 566x1130 | 2901 | 1/10 | 435 | 471 | $0.000141 | $0.001412 | $0.001044 |
| `native-h22` | 1024x616 | 1024x616 | 541 | 6/10 | 430 | 446 | $0.000134 | $0.000223 | $0.001044 |
| `native-h18` | 1024x612 | 1024x612 | 661 | 8/10 | 427 | 446 | $0.000134 | $0.000167 | $0.001044 |
| `native-h16` | 1024x624 | 1024x624 | 761 | 8/10 | 434 | 446 | $0.000134 | $0.000167 | $0.001044 |
| `native-h14` | 1024x616 | 1024x616 | 861 | 7/10 | 430 | 446 | $0.000134 | $0.000191 | $0.001044 |

## Misses

- `legacy-1col-22` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4213`
- `auto-22` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `seed=20260123`
- `auto-14` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `seed=3`
- `native-h22` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `49213`
- `native-h18` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `49213`
- `native-h16` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `48243`
- `native-h14` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `seed=48491213`
- `legacy-1col-22` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `404`
- `legacy-1col-22` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.0.38`
- `auto-22` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `200`
- `auto-22` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.30.123`
- `auto-14` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `204`
- `auto-14` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.80.60`
- `native-h22` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `200`
- `native-h22` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.4.28`
- `native-h18` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `100`
- `legacy-1col-22` test-log — Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms → expected `case-11 dur=143ms`, got `case-11 dur=147ms`
- `auto-22` test-log — Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms → expected `case-11 dur=143ms`, got `case-73 dur=117ms`
- `auto-22` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `1537ms`
- `auto-14` test-log — Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms → expected `case-11 dur=143ms`, got `case-11 dur=312µs`
- `auto-14` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `15ms`
- `native-h22` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `204ms`
- `legacy-1col-22` ls-long — What size in bytes is reported for asset-5.tar.gz? → expected `655`, got `525`
- `legacy-1col-22` ls-long — What size in bytes is reported for asset-9.tar.gz? → expected `1179`, got `15192`
- `auto-22` ls-long — What size in bytes is reported for asset-5.tar.gz? → expected `655`, got `19426`
- `auto-22` ls-long — What size in bytes is reported for asset-9.tar.gz? → expected `1179`, got `6885`
- `auto-14` ls-long — What size in bytes is reported for asset-5.tar.gz? → expected `655`, got `2181 B`
- `auto-14` ls-long — What size in bytes is reported for asset-9.tar.gz? → expected `1179`, got `5446 B`
- `native-h16` ls-long — What size in bytes is reported for asset-5.tar.gz? → expected `655`, got `10087`
- `native-h14` ls-long — What size in bytes is reported for asset-5.tar.gz? → expected `655`, got `2258 Sep 10 01:09 user user asset-5.tar.gz`
- `legacy-1col-22` cjk-log — 第 5 批日志耗时多少毫秒？只回答数字。 → expected `35`, got `348`
- `legacy-1col-22` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `4`
- `auto-22` cjk-log — 第 5 批日志耗时多少毫秒？只回答数字。 → expected `35`, got `572`
- `auto-14` cjk-log — 第 5 批日志耗时多少毫秒？只回答数字。 → expected `35`, got `6`
- `auto-14` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `1`
- `native-h14` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `8`
