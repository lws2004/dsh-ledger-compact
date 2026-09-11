# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 5 · variants: 2 · answers: 336 · calls: 168 new / 168 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `excerpt-digest` | 1024x624 | 1024x624 | 761 | 141/168 | 99/114 | 42/54 | 434 | 1097 | $0.000329 | $0.000392 |
| `excerpt-blocks` | 1024x624 | 1024x624 | 761 | 142/168 | 98/114 | 44/54 | 434 | 1136 | $0.000341 | $0.000403 |

## Misses

- `excerpt-digest` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `42`
- `excerpt-digest` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `26`
- `excerpt-blocks` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `28`
- `excerpt-blocks` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `22`
- `excerpt-digest` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `157`
- `excerpt-blocks` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `2`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `17`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `18`
- `excerpt-blocks` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `4`
- `excerpt-blocks` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `4`
- `excerpt-blocks` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `4`
- `excerpt-blocks` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `4`
- `excerpt-blocks` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `4`
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
- `excerpt-blocks` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `234`
- `excerpt-blocks` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `208`
- `excerpt-blocks` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1002881`
- `excerpt-blocks` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1000148`
- `excerpt-blocks` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001147`
- `excerpt-blocks` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1000111`
- `excerpt-blocks` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$100`
- `excerpt-blocks` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$473`
- `excerpt-blocks` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000811`
- `excerpt-blocks` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000333`
- `excerpt-blocks` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000259`
- `excerpt-blocks` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000363`
- `excerpt-blocks` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1055352`
- `excerpt-blocks` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000444`
- `excerpt-blocks` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-blocks` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-blocks` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `excerpt-blocks` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
