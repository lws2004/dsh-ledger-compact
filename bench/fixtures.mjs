/**
 * The bench fixtures: five files with questions whose answers are known from the source,
 * every answer reachable from the first 39 lines so a small variant is never penalised for
 * capacity. Lifted out of fidelity-bench.mjs so miss-audit.mjs can rebuild the same sources.
 */
export function fixtures() {
  const out = [];
  const SEED = 48213;
  out.push({
    name: "seq-3000",
    lines: ["SNAPSHOT seed=" + SEED + " rows=3000", ...Array.from({ length: 3000 }, (_, i) => String(i + 1))],
    qa: [
      { kind: "value", q: "What is the value of seed= on the first line?", a: String(SEED) },
      { kind: "structure", q: "Reading left to right then top to bottom, which number comes immediately after 7?", a: "8" },
      { kind: "value", q: "In the same reading order, which number comes immediately after 19?", a: "20" },
      { kind: "value", q: "In the same reading order, which number comes immediately before 30?", a: "29" },
      { kind: "structure", q: "Does the image contain the word SNAPSHOT? Answer yes or no.", a: "yes" }
    ]
  });

  out.push({
    name: "access-log",
    lines: Array.from({ length: 2000 }, (_, i) =>
      "10.0." + (i % 256) + "." + ((i * 7) % 256) + ' - - [10/Sep/2026:19:00:00 +0800] "GET /api/v1/items/' + i +
      // Byte counts are four digits so a status code can never be counted twice: a token
      // digest says "503 x N" and the honest answer has to be N.
      "?page=" + (i % 50) + ' HTTP/1.1" ' + (i % 37 === 0 ? 503 : 200) + " " + (1000 + (i % 900))),
    qa: [
      { kind: "value", q: "What HTTP status does the request for /api/v1/items/37 have?", a: "503" },
      { kind: "value", q: "What is the client IP of the request for /api/v1/items/5?", a: "10.0.5.35" },
      { kind: "value", q: "What HTTP status does the request for /api/v1/items/0 have?", a: "503" },
      { kind: "value", q: "At the end of the request line for /api/v1/items/5 there is a byte count. What is it?", a: String(1000 + (5 % 900)) },
      { kind: "structure", q: "How many of the first ten requests (items/0 through items/9) returned status 503?", a: "1" },
      // Whole-file, not a range: nothing that is a picture or an excerpt of this file can
      // count it, which is the point — text can, for free.
      { kind: "structure", q: "How many requests in the whole file returned status 503? Answer with a number.", a: String(Array.from({ length: 2000 }, (_, i) => i % 37 === 0).filter(Boolean).length) },
      { kind: "structure", q: "How many requests in the whole file returned status 200? Answer with a number.", a: String(Array.from({ length: 2000 }, (_, i) => i % 37 !== 0).filter(Boolean).length) }
    ]
  });

  out.push({
    name: "test-log",
    lines: Array.from({ length: 1500 }, (_, i) => (i % 97 === 11 ? "FAIL" : "PASS") + " case-" + i + " dur=" + ((i * 13) % 400) + "ms"),
    qa: [
      { kind: "value", q: "Which case is the first FAIL and how long did it take? Answer like: case-11 dur=143ms", a: "case-11 dur=143ms" },
      { kind: "value", q: "How many milliseconds did case-4 take?", a: "52ms" },
      { kind: "value", q: "How many milliseconds did case-12 take?", a: "156ms" },
      { kind: "value", q: "How many milliseconds did case-10 take?", a: "130ms" },
      { kind: "structure", q: "Among cases 0 through 19, how many are PASS?", a: "19" },
      { kind: "structure", q: "How many of the 1500 lines in the whole file are FAIL? Answer with a number.", a: String(Array.from({ length: 1500 }, (_, i) => i % 97 === 11).filter(Boolean).length) }
    ]
  });

  out.push({
    name: "cjk-log",
    lines: Array.from({ length: 700 }, (_, i) => "[" + (i % 24) + "] 处理完成：第 " + i + " 批日志已归档，耗时 " + ((i * 7) % 997) + " 毫秒，队列剩余 " + (i % 13)),
    qa: [
      { kind: "value", q: "第 5 批日志耗时多少毫秒？只回答数字。", a: "35" },
      { kind: "value", q: "第 6 批日志处理完后队列剩余多少？只回答数字。", a: "6" },
      { kind: "value", q: "第 12 批日志耗时多少毫秒？只回答数字。", a: "84" },
      { kind: "value", q: "第 7 批日志行首方括号里的数字是多少？只回答数字。", a: "7" },
      { kind: "structure", q: "前 10 批里有几批的队列剩余是 0？只回答数字。", a: "1" }
    ]
  });

  /**
   * The residual error class, made measurable: rows that differ only in their digits,
   * and values that sit far from the row's ruler. Answerable from the first 39 source
   * lines, like every other fixture.
   */
  out.push((() => {
    const idOf = (i) => 1000000 + ((i * 37) % 9000000);
    const qtyOf = (i) => (i * 13) % 1000;
    const unitOf = (i) => 100 + ((i * 7) % 900);
    const row = (i) => "id=" + idOf(i) + " user=u" + (i % 97) + " qty=" + qtyOf(i) + " unit=$" + unitOf(i);
    return {
      name: "id-grid",
      lines: ["ID-GRID rows=1500 (id, user, qty, unit)", ...Array.from({ length: 1500 }, (_, i) => row(i))],
      qa: [
        { kind: "value", q: "What is the qty on the row whose user is u17?", a: String(qtyOf(17)) },
        { kind: "value", q: "What is the id on the row whose user is u30?", a: String(idOf(30)) },
        { kind: "value", q: "What is the unit price on the row whose id is " + idOf(23) + "?", a: String(unitOf(23)) },
        { kind: "value", q: "What is the id two rows below the row whose user is u8?", a: String(idOf(10)) },
        { kind: "structure", q: "How many of these four rows have qty above 100: user=u3, user=u9, user=u15, user=u21? Answer with a number.", a: String([3, 9, 15, 21].filter((i) => qtyOf(i) > 100).length) }
      ]
    };
  })());
  return out;
}
