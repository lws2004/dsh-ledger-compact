# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 5 · variants: 4 · answers: 336 · calls: 252 new / 84 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `excerpt-digest` | 1024x624 | 1024x624 | 761 | 71/84 | 49/57 | 22/27 | 434 | 1097 | $0.000329 | $0.000389 |
| `reread-base` | 1024x624 | 1024x624 | 761 | 66/84 | 49/57 | 17/27 | 434 | 1549 | $0.000465 | $0.000591 |
| `reread-address` | 1024x624 | 1024x624 | 761 | 69/84 | 50/57 | 19/27 | 434 | 2008 | $0.000602 | $0.000733 |
| `reread-hint` | 1024x624 | 1024x624 | 761 | 66/84 | 45/57 | 21/27 | 434 | 1690 | $0.000507 | $0.000645 |

## Misses

- `excerpt-digest` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `42`
- `reread-base` seq-3000 — Reading left to right then top to bottom, which number comes immediately after 7? → expected `8`, got `78`
- `reread-base` seq-3000 — Reading left to right then top to bottom, which number comes immediately after 7? → expected `8`, got `1`
- `reread-base` seq-3000 — Reading left to right then top to bottom, which number comes immediately after 7? → expected `8`, got `7`
- `reread-base` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `46`
- `reread-base` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `40`
- `reread-base` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `20`
- `reread-address` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `30`
- `reread-address` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `20`
- `reread-address` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `30`
- `reread-hint` seq-3000 — In the same reading order, which number comes immediately after 19? → expected `20`, got `21`
- `reread-hint` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `20`
- `reread-base` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `503`
- `reread-address` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `503`
- `reread-address` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `200`
- `reread-hint` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `200`
- `reread-hint` access-log — What HTTP status does the request for /api/v1/items/37 have? → expected `503`, got `200`
- `reread-hint` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `503`
- `reread-hint` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `2000`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `reread-base` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `PASS`
- `reread-address` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `read_result(offset=1, limit=40)</｜｜DSML｜｜ calls>`
- `reread-hint` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `143ms`
- `reread-hint` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `143ms`
- `reread-hint` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `143ms`
- `reread-hint` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `17`
- `reread-base` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `0`
- `reread-base` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `reread-base` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `0`
- `reread-address` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `reread-address` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `reread-hint` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt-digest` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `429`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1006883`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001147`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001147`
- `excerpt-digest` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$268`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000333`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000296`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `reread-base` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `I can't determine the qty for user u17 from the data shown. The rows visible in the image jump from user u14/u15 toward `
- `reread-base` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1000185 user=u5 qty=65 unit=$135`
- `reread-base` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1061183`
- `reread-base` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000333`
- `reread-base` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000777`
- `reread-base` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `57`
- `reread-base` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `reread-address` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got ``
- `reread-address` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$299`
- `reread-address` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000259`
- `reread-address` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `1000592`
- `reread-address` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `reread-address` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `reread-address` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `reread-hint` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1000111`
- `reread-hint` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `The image shows u30 at row id=1001229.  1001229`
- `reread-hint` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1001183`
- `reread-hint` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000407`
- `reread-hint` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000518`
- `reread-hint` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `reread-hint` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
