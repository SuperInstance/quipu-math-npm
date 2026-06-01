# quipu-math

> Incan knotted cord mathematics for JavaScript — encode, decode, compute, and detect corruption in quipu number systems.

## What This Does

`quipu-math` implements the Incan quipu number system for JavaScript. It encodes numbers as knot sequences (long knots, figure-eight knots, single knots), performs arithmetic on quipu-encoded values, detects corruption, and supports weaving/unweaving of cords. Use it for educational tools, novel encoding schemes, or cultural math exploration.

## The Cultural Root

See the Python version (`quipu-math` on PyPI) for the full cultural background. Quipu encode decimal numbers in knotted cords — a tactile, positional number system that predates European contact with the Americas.

## Install

```bash
npm install quipu-math
```

## Quick Start

```typescript
import {
  KnotType, encodeNumber, decodeNumber, checksum,
  Cord, CordTree,
  weave, unweave, isAssociative,
  addQuipus, subtractQuipus, multiplyQuipus,
  detectCorruption,
} from "quipu-math";

// Encode and decode
const knots = encodeNumber(135);
console.log(decodeNumber(knots));  // 135
console.log(checksum(knots));      // 9

// Build a quipu tree
const tree = new CordTree();
tree.addPendant(new Cord("red", encodeNumber(42)));
tree.addPendant(new Cord("blue", encodeNumber(17)));

// Arithmetic
const tree2 = new CordTree();
tree2.addPendant(new Cord("green", encodeNumber(10)));
const sum = addQuipus(tree, tree2);
console.log(sum.pendantCords[0].value);  // 52

// Weaving
const woven = weave(new Cord("red", encodeNumber(7)), new Cord("blue", encodeNumber(3)));
const [a, b] = unweave(woven);

// Corruption detection
const copy = new CordTree();
copy.addPendant(new Cord("red", encodeNumber(40)));  // Wrong!
const report = detectCorruption(tree, copy);
console.log(report.corrupted);  // true
```

## API Reference

### Knot Types
```typescript
enum KnotType { SINGLE, FIGURE_EIGHT, LONG, EMPTY }
interface KnotNode { type: KnotType; value: number; position: number; turns: number; }
```

### Encoding
- `encodeNumber(n: number) → KnotNode[]`
- `decodeNumber(knots: KnotNode[]) → number`
- `checksum(knots: KnotNode[]) → number`

### Cord & CordTree
```typescript
class Cord {
  color: string;
  knots: KnotNode[];
  position: number;
  children: Cord[];
  get value(): number;
  toJSON(): CordJSON;
  static fromJSON(json: CordJSON): Cord;
}

class CordTree {
  pendantCords: Cord[];
  addPendant(cord: Cord): void;
  totalValue(): number;
  toJSON(): CordTreeJSON;
  static fromJSON(json: CordTreeJSON): CordTree;
}
```

### Weaving
- `weave(cord1: Cord, cord2: Cord) → Cord`
- `unweave(cord: Cord) → [Cord, Cord]`
- `isAssociative(a: Cord, b: Cord, c: Cord) → boolean`

### Arithmetic
- `addQuipus(a: CordTree, b: CordTree) → CordTree`
- `subtractQuipus(a: CordTree, b: CordTree) → CordTree` — Throws if negative
- `multiplyQuipus(a: CordTree, b: CordTree) → CordTree`

### Corruption
- `detectCorruption(original: CordTree, copy: CordTree) → CorruptionReport`

## How It Works

Same algorithms as the Python version. Numbers are decomposed into decimal digits, each digit mapped to a knot type. Arithmetic is element-wise on pendant cords. Weaving interleaves knot sequences from two cords.

## License

MIT
