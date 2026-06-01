import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  KnotType,
  encodeNumber,
  decodeKnots,
  checksum,
  Cord,
  CordTree,
  weave,
  unweave,
  isAssociative,
  addQuipus,
  subtractQuipus,
  multiplyQuipus,
  detectCorruption,
} from "../src/index.js";

// ── KnotType ─────────────────────────────────────────────────────────

describe("KnotType", () => {
  it("has SINGLE", () => assert.equal(KnotType.SINGLE, "single"));
  it("has FIGURE_EIGHT", () => assert.equal(KnotType.FIGURE_EIGHT, "figure_eight"));
  it("has LONG", () => assert.equal(KnotType.LONG, "long"));
  it("has EMPTY", () => assert.equal(KnotType.EMPTY, "empty"));
});

// ── encode / decode ──────────────────────────────────────────────────

describe("encodeNumber", () => {
  it("encodes 0 as empty", () => assert.deepEqual(encodeNumber(0), []));

  it("encodes 1 as figure-eight knot", () => {
    const knots = encodeNumber(1);
    assert.equal(knots.length, 1);
    assert.equal(knots[0].type, KnotType.FIGURE_EIGHT);
    assert.equal(knots[0].value, 1);
  });

  it("encodes 9 as long knot with 9 turns", () => {
    const knots = encodeNumber(9);
    assert.equal(knots.length, 1);
    assert.equal(knots[0].type, KnotType.LONG);
    assert.equal(knots[0].turns, 9);
  });

  it("encodes 10 as single knot at position 1", () => {
    const knots = encodeNumber(10);
    assert.equal(knots.length, 1);
    assert.equal(knots[0].type, KnotType.SINGLE);
    assert.equal(knots[0].position, 1);
  });

  it("encodes 247 correctly", () => {
    const knots = encodeNumber(247);
    assert.equal(knots.length, 3);
    const byPos = new Map(knots.map((k) => [k.position, k]));
    assert.equal(byPos.get(0)!.type, KnotType.LONG);
    assert.equal(byPos.get(0)!.turns, 7);
    assert.equal(byPos.get(1)!.turns, 4);
    assert.equal(byPos.get(2)!.turns, 2);
  });

  it("throws on negative", () => {
    assert.throws(() => encodeNumber(-1), /negative/);
  });
});

describe("decodeKnots", () => {
  it("decodes empty as 0", () => assert.equal(decodeKnots([]), 0));

  it("round-trips single digits 1-9", () => {
    for (let n = 1; n <= 9; n++) {
      assert.equal(decodeKnots(encodeNumber(n)), n);
    }
  });

  it("round-trips various numbers", () => {
    for (const n of [0, 1, 10, 42, 100, 247, 1000, 9999]) {
      assert.equal(decodeKnots(encodeNumber(n)), n, `round-trip ${n}`);
    }
  });
});

describe("checksum", () => {
  it("returns 0 for empty", () => assert.equal(checksum([]), 0));

  it("computes digit sum for 247 (7+4+2=13)", () => {
    assert.equal(checksum(encodeNumber(247)), 13);
  });
});

// ── Cord ──────────────────────────────────────────────────────────────

describe("Cord", () => {
  it("has value from knots", () => {
    assert.equal(new Cord("white", encodeNumber(42)).value, 42);
  });

  it("defaults to white", () => {
    assert.equal(new Cord().color, "white");
  });

  it("adds a child", () => {
    const parent = new Cord("red", encodeNumber(10));
    parent.addChild(new Cord("blue", encodeNumber(3)));
    assert.equal(parent.children.length, 1);
    assert.equal(parent.children[0].color, "blue");
  });

  it("addKnot adds a knot", () => {
    const cord = new Cord();
    cord.addKnot({ type: KnotType.SINGLE, value: 1, position: 0, turns: 0 });
    assert.equal(cord.knots.length, 1);
  });

  it("serialize/deserialize round-trip", () => {
    const cord = new Cord("red", encodeNumber(55), 2);
    cord.addChild(new Cord("green", encodeNumber(3)));
    const json = cord.serialize();
    const restored = Cord.deserialize(json);
    assert.equal(restored.color, "red");
    assert.equal(restored.value, 55);
    assert.equal(restored.children.length, 1);
    assert.equal(restored.children[0].value, 3);
  });
});

// ── CordTree ──────────────────────────────────────────────────────────

describe("CordTree", () => {
  it("starts empty", () => {
    assert.equal(new CordTree().pendantCords.length, 0);
  });

  it("addPendant assigns position", () => {
    const tree = new CordTree();
    tree.addPendant(new Cord("red", encodeNumber(10)));
    tree.addPendant(new Cord("blue", encodeNumber(20)));
    assert.equal(tree.pendantCords[0].position, 0);
    assert.equal(tree.pendantCords[1].position, 1);
  });

  it("totalValue sums pendants", () => {
    const tree = new CordTree();
    tree.addPendant(new Cord("white", encodeNumber(100)));
    tree.addPendant(new Cord("white", encodeNumber(47)));
    assert.equal(tree.totalValue(), 147);
  });

  it("traverse returns all knots flat", () => {
    const tree = new CordTree();
    tree.addPendant(new Cord("white", encodeNumber(42)));
    tree.addPendant(new Cord("white", encodeNumber(7)));
    const all = tree.traverse();
    assert.equal(all.length, encodeNumber(42).length + encodeNumber(7).length);
  });

  it("serialize/deserialize round-trip", () => {
    const tree = new CordTree();
    tree.addPendant(new Cord("red", encodeNumber(30)));
    tree.addPendant(new Cord("blue", encodeNumber(12)));
    const json = tree.serialize();
    const restored = CordTree.deserialize(json);
    assert.equal(restored.pendantCords.length, 2);
    assert.equal(restored.pendantCords[0].value, 30);
    assert.equal(restored.pendantCords[1].value, 12);
  });

  it("equals identical trees", () => {
    const t1 = new CordTree();
    t1.addPendant(new Cord("red", encodeNumber(5)));
    const t2 = new CordTree();
    t2.addPendant(new Cord("red", encodeNumber(5)));
    assert.ok(t1.equals(t2));
  });

  it("differs from non-identical trees", () => {
    const t1 = new CordTree();
    t1.addPendant(new Cord("red", encodeNumber(5)));
    const t2 = new CordTree();
    t2.addPendant(new Cord("blue", encodeNumber(5)));
    assert.ok(!t1.equals(t2));
  });
});

// ── Weave / Unweave ──────────────────────────────────────────────────

describe("weave", () => {
  it("weaves two cords", () => {
    const c1 = new Cord("red", encodeNumber(3));
    const c2 = new Cord("blue", encodeNumber(7));
    const woven = weave(c1, c2);
    assert.equal(woven.value, 3 * 10000 + 7);
  });

  it("unweave round-trip", () => {
    const c1 = new Cord("red", encodeNumber(42));
    const c2 = new Cord("blue", encodeNumber(13));
    const [r1, r2] = unweave(weave(c1, c2));
    assert.equal(r1.value, 42);
    assert.equal(r2.value, 13);
  });

  it("unweave preserves colors", () => {
    const c1 = new Cord("red", encodeNumber(5));
    const c2 = new Cord("green", encodeNumber(8));
    const [r1, r2] = unweave(weave(c1, c2));
    assert.equal(r1.color, "red");
    assert.equal(r2.color, "green");
  });

  it("isAssociative returns false for non-trivial values", () => {
    const a = new Cord("a", encodeNumber(2));
    const b = new Cord("b", encodeNumber(3));
    const c = new Cord("c", encodeNumber(4));
    assert.ok(!isAssociative(a, b, c));
  });

  it("isAssociative returns true for zeros", () => {
    const a = new Cord("a", encodeNumber(0));
    const b = new Cord("b", encodeNumber(0));
    const c = new Cord("c", encodeNumber(0));
    assert.ok(isAssociative(a, b, c));
  });
});

// ── Arithmetic ───────────────────────────────────────────────────────

describe("addQuipus", () => {
  it("adds two single-pendant trees", () => {
    const a = new CordTree();
    a.addPendant(new Cord("white", encodeNumber(10)));
    const b = new CordTree();
    b.addPendant(new Cord("white", encodeNumber(25)));
    const result = addQuipus(a, b);
    assert.equal(result.pendantCords[0].value, 35);
  });

  it("adds multiple pendants element-wise", () => {
    const a = new CordTree();
    a.addPendant(new Cord("white", encodeNumber(10)));
    a.addPendant(new Cord("white", encodeNumber(20)));
    const b = new CordTree();
    b.addPendant(new Cord("white", encodeNumber(5)));
    b.addPendant(new Cord("white", encodeNumber(15)));
    const result = addQuipus(a, b);
    assert.equal(result.pendantCords[0].value, 15);
    assert.equal(result.pendantCords[1].value, 35);
  });

  it("handles different lengths", () => {
    const a = new CordTree();
    a.addPendant(new Cord("white", encodeNumber(10)));
    a.addPendant(new Cord("white", encodeNumber(20)));
    const b = new CordTree();
    b.addPendant(new Cord("white", encodeNumber(5)));
    const result = addQuipus(a, b);
    assert.equal(result.pendantCords.length, 2);
    assert.equal(result.pendantCords[1].value, 20);
  });
});

describe("subtractQuipus", () => {
  it("subtracts two trees", () => {
    const a = new CordTree();
    a.addPendant(new Cord("white", encodeNumber(50)));
    const b = new CordTree();
    b.addPendant(new Cord("white", encodeNumber(20)));
    const result = subtractQuipus(a, b);
    assert.equal(result.pendantCords[0].value, 30);
  });

  it("throws on negative result", () => {
    const a = new CordTree();
    a.addPendant(new Cord("white", encodeNumber(5)));
    const b = new CordTree();
    b.addPendant(new Cord("white", encodeNumber(10)));
    assert.throws(() => subtractQuipus(a, b), /Negative result/);
  });
});

describe("multiplyQuipus", () => {
  it("multiplies two trees", () => {
    const a = new CordTree();
    a.addPendant(new Cord("white", encodeNumber(6)));
    const b = new CordTree();
    b.addPendant(new Cord("white", encodeNumber(7)));
    const result = multiplyQuipus(a, b);
    assert.equal(result.pendantCords[0].value, 42);
  });

  it("multiplies by zero", () => {
    const a = new CordTree();
    a.addPendant(new Cord("white", encodeNumber(42)));
    const b = new CordTree();
    b.addPendant(new Cord("white", []));
    const result = multiplyQuipus(a, b);
    assert.equal(result.pendantCords[0].value, 0);
  });
});

// ── Corruption detection ─────────────────────────────────────────────

describe("detectCorruption", () => {
  it("returns clean for identical trees", () => {
    const t1 = new CordTree();
    t1.addPendant(new Cord("red", encodeNumber(10)));
    const t2 = new CordTree();
    t2.addPendant(new Cord("red", encodeNumber(10)));
    const report = detectCorruption(t1, t2);
    assert.deepEqual(report.valueMismatch, []);
    assert.equal(report.countMismatch, false);
    assert.deepEqual(report.colorMismatch, []);
    assert.equal(report.parityOk, true);
  });

  it("detects value mismatch", () => {
    const t1 = new CordTree();
    t1.addPendant(new Cord("red", encodeNumber(10)));
    const t2 = new CordTree();
    t2.addPendant(new Cord("red", encodeNumber(20)));
    const report = detectCorruption(t1, t2);
    assert.ok(report.valueMismatch.length > 0);
    assert.ok(report.valueMismatch[0].includes("Value mismatch"));
  });

  it("detects count mismatch", () => {
    const t1 = new CordTree();
    t1.addPendant(new Cord("red", encodeNumber(10)));
    const t2 = new CordTree();
    t2.addPendant(new Cord("red", encodeNumber(10)));
    t2.addPendant(new Cord("blue", encodeNumber(5)));
    const report = detectCorruption(t1, t2);
    assert.equal(report.countMismatch, true);
  });

  it("detects color mismatch", () => {
    const t1 = new CordTree();
    t1.addPendant(new Cord("red", encodeNumber(10)));
    const t2 = new CordTree();
    t2.addPendant(new Cord("blue", encodeNumber(10)));
    const report = detectCorruption(t1, t2);
    assert.ok(report.colorMismatch.length > 0);
    assert.ok(report.colorMismatch[0].includes("Color mismatch"));
  });

  it("detects parity mismatch", () => {
    const t1 = new CordTree();
    t1.addPendant(new Cord("red", encodeNumber(247))); // parity 13%10=3
    const t2 = new CordTree();
    t2.addPendant(new Cord("red", encodeNumber(100))); // parity 1%10=1
    const report = detectCorruption(t1, t2);
    assert.equal(report.parityOk, false);
  });
});
