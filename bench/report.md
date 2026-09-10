# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 4 · variants: 4 · answers: 80 · calls: 57 new / 23 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ruler1` | 1024x624 | 1024x624 | 761 | 14/20 | 10/15 | 4/5 | 434 | 446 | $0.000134 | $0.000191 |
| `res-50` | 512x312 | 512x312 | 761 | 9/20 | 7/15 | 2/5 | 213 | 258 | $0.000077 | $0.000172 |
| `res-50-up` | 1024x624 | 1024x624 | 761 | 12/20 | 9/15 | 3/5 | 434 | 451 | $0.000135 | $0.000226 |
| `tall-blank` | 1024x2048 | 566x1131 | 761 | 4/20 | 2/15 | 2/5 | 435 | 473 | $0.000142 | $0.000710 |

## Misses

- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `22`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `13`
- `res-50` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `2023`
- `res-50-up` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4852123`
- `tall-blank` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `seed=46131`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.1.7`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `res-50` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.0.63`
- `res-50` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `107`
- `res-50` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `0`
- `res-50-up` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.1.1`
- `res-50-up` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `503`
- `tall-blank` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `200`
- `tall-blank` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.6.14.95`
- `tall-blank` access-log — What HTTP status does the request for /api/v1/items/0 have? → expected `503`, got `303`
- `tall-blank` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `208`
- `tall-blank` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `3`
- `res-50` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `273ms`
- `res-50` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `239ms`
- `res-50` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `100`
- `res-50` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `13`
- `res-50-up` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `171ms`
- `res-50-up` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `16`
- `tall-blank` test-log — Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms → expected `case-11 dur=143ms`, got `case-110 dur=217ms`
- `tall-blank` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `86ms`
- `tall-blank` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `156`
- `tall-blank` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `42ms`
- `tall-blank` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `res-50` cjk-log — 第 5 批日志耗时多少毫秒？只回答数字。 → expected `35`, got `158`
- `res-50` cjk-log — 第 12 批日志耗时多少毫秒？只回答数字。 → expected `84`, got `198`
- `res-50` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `0`
- `res-50-up` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `8`
- `res-50-up` cjk-log — 第 7 批日志行首方括号里的数字是多少？只回答数字。 → expected `7`, got `60`
- `res-50-up` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `12`
- `tall-blank` cjk-log — 第 5 批日志耗时多少毫秒？只回答数字。 → expected `35`, got `104`
- `tall-blank` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `7`
- `tall-blank` cjk-log — 第 12 批日志耗时多少毫秒？只回答数字。 → expected `84`, got `117`
- `tall-blank` cjk-log — 第 7 批日志行首方括号里的数字是多少？只回答数字。 → expected `7`, got `43`
- `tall-blank` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `0`
