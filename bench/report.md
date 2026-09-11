# Dense-image fidelity + cost bench

- model: `deepseek-flash` · price (cache miss $0.3/M peak)
- fixtures: 5 · variants: 3 · answers: 252 · calls: 163 new / 89 cached

| variant | drawn | sent | lines/frame | correct | value acc | struct acc | est tok | measured tok | $/answer | $/correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `excerpt-digest` | 1024x624 | 1024x624 | 761 | 71/84 | 49/57 | 22/27 | 434 | 1097 | $0.000329 | $0.000389 |
| `absorb` | 1024x624 | 1024x624 | 761 | 57/84 | 41/57 | 16/27 | 755 | 1250 | $0.001018 | $0.001500 |
| `absorb-digest` | 1024x624 | 1024x624 | 761 | 56/84 | 36/57 | 20/27 | 793 | 1300 | $0.001033 | $0.001549 |

## Misses

- `excerpt-digest` seq-3000 — In the same reading order, which number comes immediately before 30? → expected `29`, got `42`
- `absorb` access-log — At the end of the request line for /api/v1/items/5 there is a byte count. What is it? → expected `1005`, got `1050`
- `absorb` access-log — How many of the first ten requests (items/0 through items/9) returned status 503? → expected `1`, got `0`
- `absorb` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `54`
- `absorb` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `Let's count the 503s from each part:  - **Part 1:** ids 0, 37, 74, 111 → 4 - **Part 2:** ids 185, 222, 259, 296, 333 → 5`
- `absorb` access-log — How many requests in the whole file returned status 503? Answer with a number. → expected `55`, got `58`
- `absorb` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1875`
- `absorb` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1962`
- `absorb` access-log — How many requests in the whole file returned status 200? Answer with a number. → expected `1945`, got `1916`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `excerpt-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `15`
- `absorb` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `143ms`
- `absorb` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `13ms`
- `absorb` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `260ms`
- `absorb` test-log — How many of the 1500 lines in the whole file are FAIL? Answer with a number. → expected `16`, got `15`
- `absorb-digest` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `13ms`
- `absorb-digest` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `0`
- `absorb-digest` test-log — How many milliseconds did case-4 take? → expected `52ms`, got `0ms`
- `absorb-digest` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `143ms`
- `absorb-digest` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `13ms`
- `absorb-digest` test-log — How many milliseconds did case-12 take? → expected `156ms`, got `I can’t determine case‑12’s duration from the provided summaries.`
- `absorb-digest` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `13`
- `absorb-digest` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `13ms`
- `absorb-digest` test-log — How many milliseconds did case-10 take? → expected `130ms`, got `13ms`
- `absorb-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `16`
- `absorb-digest` test-log — Among cases 0 through 19, how many are PASS? → expected `19`, got `14`
- `absorb` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `3`
- `absorb-digest` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `absorb-digest` cjk-log — 前 10 批里有几批的队列剩余是 0？只回答数字。 → expected `1`, got `2`
- `excerpt-digest` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `429`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1006883`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001147`
- `excerpt-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `id=1001147`
- `excerpt-digest` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$268`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000333`
- `excerpt-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `id=1000296`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `excerpt-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `1`
- `absorb` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `473`
- `absorb` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `79`
- `absorb` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `473`
- `absorb` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1037000`
- `absorb` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1037000`
- `absorb` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1037000`
- `absorb` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$326`
- `absorb` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$237`
- `absorb` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$483`
- `absorb` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `1050505`
- `absorb` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `Let’s reconstruct carefully.  If 1046916 has user=u7, then:  - 1046916 → u7 - 1046953 → u8  The row whose user is u8 is `
- `absorb` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `1050505`
- `absorb` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `0`
- `absorb` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `2`
- `absorb-digest` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `16`
- `absorb-digest` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `16`
- `absorb-digest` id-grid — What is the qty on the row whose user is u17? → expected `221`, got `485`
- `absorb-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1037000`
- `absorb-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1037000`
- `absorb-digest` id-grid — What is the id on the row whose user is u30? → expected `1001110`, got `1037000`
- `absorb-digest` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$549`
- `absorb-digest` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$148`
- `absorb-digest` id-grid — What is the unit price on the row whose id is 1000851? → expected `261`, got `$999`
- `absorb-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `1055463`
- `absorb-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `1051053`
- `absorb-digest` id-grid — What is the id two rows below the row whose user is u8? → expected `1000370`, got `1052257`
- `absorb-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `absorb-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `4`
- `absorb-digest` id-grid — How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number. → expected `3`, got `0`
