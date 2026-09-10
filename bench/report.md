# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 4 · variants: 5 · answers: 100 · calls: 0 new / 100 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ruler1` | 1024x624 | 1024x624 | 761 | 14/20 | 10/15 | 4/5 | 434 | 446 | $0.000134 | $0.000191 |
| `color-rule` | 1024x624 | 1024x624 | 761 | 16/20 | 13/15 | 3/5 | 434 | 446 | $0.000134 | $0.000167 |
| `color-digit` | 1024x624 | 1024x624 | 761 | 12/20 | 10/15 | 2/5 | 434 | 446 | $0.000134 | $0.000223 |
| `color-both` | 1024x624 | 1024x624 | 761 | 15/20 | 11/15 | 4/5 | 434 | 446 | $0.000134 | $0.000178 |
| `color-alert` | 1024x624 | 1024x624 | 761 | 14/20 | 12/15 | 2/5 | 434 | 446 | $0.000134 | $0.000191 |

## Misses

- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `22`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `13`
- `color-rule` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `color-digit` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `140`
- `color-digit` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `22`
- `color-alert` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `21`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.1.7`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `color-rule` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `503`
- `color-digit` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.1.5`
- `color-digit` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `503`
- `color-digit` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `0`
- `color-both` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.20.140`
- `color-both` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `503`
- `color-alert` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `color-alert` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `3`
- `color-rule` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `14`
- `color-digit` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `color-alert` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `2`
- `color-rule` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `color-digit` cjk-log — 第 12 批日志耗时多少毫秒？只回答数字。 → expected `84`, got `91`
- `color-digit` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `5`
- `color-both` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `0`
- `color-both` cjk-log — 第 12 批日志耗时多少毫秒？只回答数字。 → expected `84`, got `91`
- `color-both` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `4`
- `color-alert` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `0`
- `color-alert` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `3`
