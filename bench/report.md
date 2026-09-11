# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 5 · variants: 2 · answers: 336 · calls: 0 new / 336 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `excerpt` | 1024x624 | 1024x624 | 761 | 119/168 | 100/114 | 19/54 | 434 | 1047 | $0.000314 | $0.000443 |
| `excerpt-digest` | 1024x624 | 1024x624 | 761 | 141/168 | 99/114 | 42/54 | 434 | 1097 | $0.000329 | $0.000392 |

## Misses

- `excerpt` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `30`
- `excerpt-digest` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `42`
- `excerpt-digest` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `26`
- `excerpt` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `excerpt` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `4`
- `excerpt` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `2`
- `excerpt` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `2`
- `excerpt` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `2`
- `excerpt` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `2`
- `excerpt` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `2`
- `excerpt` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1970`
- `excerpt` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1973`
- `excerpt` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1513`
- `excerpt` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `The image shows the first 38 lines of a log file. To answer the question, we need to count the number of lines where the`
- `excerpt` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1997`
- `excerpt` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1974`
- `excerpt-digest` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `157`
- `excerpt` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `1`
- `excerpt` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `1`
- `excerpt` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `4`
- `excerpt` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `5`
- `excerpt` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `2`
- `excerpt` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `1`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `17`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `247`
- `excerpt` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `208`
- `excerpt` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `234`
- `excerpt` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001181`
- `excerpt` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1003961`
- `excerpt` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1030118`
- `excerpt` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1009997`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000444`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000259`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000407`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000407`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000444`
- `excerpt` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000705`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `The rows for user=u3, user=u9, and user=u15 all have quantities above 100; user=u21 has a quantity of 104, which is also`
- `excerpt` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `excerpt-digest` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `429`
- `excerpt-digest` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `u17×1 qty=13 unit=$107`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1006883`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001147`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001147`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001221`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001447`
- `excerpt-digest` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$268`
- `excerpt-digest` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$268`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000333`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000296`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000333`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000333`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
