# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 4 · variants: 2 · answers: 120 · calls: 0 new / 120 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ruler1` | 1024x624 | 1024x624 | 761 | 46/60 | 34/45 | 12/15 | 434 | 446 | $0.000134 | $0.000175 |
| `glyph-8x16` | 1024x624 | 1024x624 | 761 | 46/60 | 35/45 | 11/15 | 434 | 446 | $0.000134 | $0.000175 |

## Misses

- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `22`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `13`
- `glyph-8x16` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4213`
- `glyph-8x16` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `28`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.1.7`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.0.6`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.0.140`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `glyph-8x16` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.5.33`
- `glyph-8x16` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `139`
- `glyph-8x16` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `103`
- `ruler1` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `glyph-8x16` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `4ms`
- `glyph-8x16` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `116ms`
- `glyph-8x16` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `104ms`
- `glyph-8x16` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `113`
- `glyph-8x16` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `111`
- `glyph-8x16` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `93`
- `ruler1` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `3`
- `glyph-8x16` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `7`
- `glyph-8x16` cjk-log — 第 6 批日志处理完后队列剩余多少？只回答数字。 → expected `6`, got `7`
- `glyph-8x16` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `3`
