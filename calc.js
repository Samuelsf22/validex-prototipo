/* Validex prototype: pure calculation functions (no DOM, no dependencies).
 * Aiken's V, Score confidence interval and Lawshe's CVR/CVI.
 * Works in the browser (window.Calc) and in Node (module.exports). */
(function (root) {
  "use strict";

  var Z95 = 1.959964; // two-sided 95 % normal quantile

  /** Aiken's V for a list of ratings on an ordinal scale [min, max]. */
  function aikenV(ratings, min, max) {
    var n = ratings.length;
    if (n === 0 || max <= min) return NaN;
    var s = 0;
    for (var i = 0; i < n; i++) s += ratings[i] - min;
    return s / (n * (max - min));
  }

  /** Score interval for V (Penfield and Giacobbi): n judges, k = max - min. */
  function scoreInterval(v, n, k, z) {
    z = z || Z95;
    var nk = n * k;
    var z2 = z * z;
    var root = z * Math.sqrt(4 * nk * v * (1 - v) + z2);
    var den = 2 * (nk + z2);
    return {
      lower: (2 * nk * v + z2 - root) / den,
      upper: (2 * nk * v + z2 + root) / den,
    };
  }

  /** Lawshe's content validity ratio. ne = judges who rated the item essential. */
  function cvr(ne, n) {
    return (ne - n / 2) / (n / 2);
  }

  /** P(X >= x) for X ~ Binomial(n, 0.5). */
  function binomUpperTail(x, n) {
    var total = 0;
    var c = 1; // C(n, 0)
    var coeffs = [1];
    for (var k = 1; k <= n; k++) {
      c = (c * (n - k + 1)) / k;
      coeffs.push(c);
    }
    for (var j = x; j <= n; j++) total += coeffs[j];
    return total / Math.pow(2, n);
  }

  /** Smallest number of "essential" votes whose one-tailed exact binomial p <= alpha. */
  function criticalEssential(n, alpha) {
    alpha = alpha || 0.05;
    for (var ne = 0; ne <= n; ne++) {
      if (binomUpperTail(ne, n) <= alpha + 1e-12) return ne;
    }
    return n + 1;
  }

  /** Critical CVR for a panel of n judges (exact binomial, alpha = 0.05). */
  function criticalCvr(n, alpha) {
    return cvr(criticalEssential(n, alpha), n);
  }

  /** Format a number with a decimal comma and fixed decimals (es-PE style). */
  function fmt(x, d) {
    if (typeof x !== "number" || !isFinite(x)) return "-";
    d = d === undefined ? 2 : d;
    return x.toFixed(d).replace(".", ",");
  }

  /** Round half up to 2 decimals, as the acceptance criteria are written. */
  function r2(x) {
    return Math.round((x + 1e-9) * 100) / 100;
  }

  var api = {
    aikenV: aikenV,
    scoreInterval: scoreInterval,
    cvr: cvr,
    criticalEssential: criticalEssential,
    criticalCvr: criticalCvr,
    binomUpperTail: binomUpperTail,
    fmt: fmt,
    r2: r2,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof window !== "undefined" ? window : this);
