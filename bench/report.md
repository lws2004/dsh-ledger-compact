# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 4 · variants: 3 · answers: 60 · calls: 40 new / 20 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ruler1` | 1024x624 | 1024x624 | 761 | 14/20 | 10/15 | 4/5 | 434 | 446 | $0.000134 | $0.000191 |
| `budget-1.3m` | 1024x1264 | 1024x1264 | 1561 | 14/20 | 11/15 | 3/5 | 808 | 863 | $0.000259 | $0.000370 |
| `budget-2.1m` | 1024x2048 | 1024x2048 | 2541 | 6/20 | 5/15 | 1/5 | 1043 | 1070 | $0.000321 | $0.001070 |

## Misses

- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `22`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `13`
- `budget-2.1m` seq-3000 — Reading left to right then top to bottom, which number comes immediately after 7? → expected `8`, got `10`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.1.7`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `budget-1.3m` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.61.171`
- `budget-1.3m` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `500`
- `budget-1.3m` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `budget-2.1m` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.105.105.106`
- `budget-2.1m` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `503`
- `budget-2.1m` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `3`
- `budget-2.1m` test-log — Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms → expected `case-11 dur=143ms`, got `case-474 dur=116ms`
- `budget-2.1m` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `335`
- `budget-2.1m` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `FAIL`
- `budget-2.1m` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `0ms`
- `budget-2.1m` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `10`
- `budget-1.3m` cjk-log — 第 5 批日志耗时多少毫秒？只回答数字。 → expected `35`, got `28`
- `budget-1.3m` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `5`
- `budget-1.3m` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `5`
- `budget-2.1m` cjk-log — 第 5 批日志耗时多少毫秒？只回答数字。 → expected `35`, got `378`
- `budget-2.1m` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `11`
- `budget-2.1m` cjk-log — 第 12 批日志耗时多少毫秒？只回答数字。 → expected `84`, got `861`
- `budget-2.1m` cjk-log — 第 7 批日志行首方括号里的数字是多少？只回答数字。 → expected `7`, got `6`
- `budget-2.1m` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `12`
