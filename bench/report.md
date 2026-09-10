# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 5 · variants: 3 · answers: 225 · calls: 75 new / 150 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ruler1` | 1024x624 | 1024x624 | 761 | 52/75 | 40/57 | 12/18 | 434 | 447 | $0.000134 | $0.000193 |
| `excerpt` | 1024x624 | 1024x624 | 761 | 62/75 | 52/57 | 10/18 | 434 | 1000 | $0.000300 | $0.000363 |
| `excerpt-hint` | 1024x624 | 1024x624 | 761 | 64/75 | 51/57 | 13/18 | 434 | 1046 | $0.000314 | $0.000368 |

## Misses

- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — What is the value of seed= on the first line? → expected `48213`, got `4823`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `22`
- `ruler1` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `13`
- `excerpt-hint` seq-3000 — Reading left to right then top to bottom, which number comes immediately after 7? → expected `8`, got `22`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.1.7`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.0.6`
- `ruler1` access-log — What is the client IP of the request for /api/v1/items/5? → expected `10.0.5.35`, got `10.0.0.140`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `105`, got `138`
- `ruler1` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `ruler1` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `ruler1` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `3`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt-hint` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt-hint` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `ruler1` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1000153`
- `ruler1` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `4`
- `ruler1` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1000110`
- `ruler1` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `1000496`
- `ruler1` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000378`
- `ruler1` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000382`
- `ruler1` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `7`
- `ruler1` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `ruler1` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `excerpt` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `247`
- `excerpt` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001181`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000444`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000259`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000407`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `excerpt-hint` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `208`
- `excerpt-hint` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001036`
- `excerpt-hint` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1000888`
- `excerpt-hint` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1003663`
- `excerpt-hint` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000407`
- `excerpt-hint` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000704`
- `excerpt-hint` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `excerpt-hint` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
