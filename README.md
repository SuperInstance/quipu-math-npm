# quipu-math

Mathematics of Incan knotted cord (quipu) data structures for JavaScript/TypeScript.

Quipu are Incan knotted cord recording devices. This package implements the mathematics of knotted data structures: encoding numbers as knot sequences, building cord hierarchies, arithmetic on quipus, and error detection via parity knots.

Ported from the [Python quipu-math](https://github.com/SuperInstance/quipu-math) package.

## Install

```bash
npm install quipu-math
```

## Usage

```typescript
import { encodeNumber, decodeKnots, Cord, CordTree, addQuipus } from "quipu-math";

// Encode a number as a knot sequence
const knots = encodeNumber(247);

// Decode back
const n = decodeKnots(knots); // 247

// Build a cord tree
const tree = new CordTree();
tree.addPendant(new Cord("red", encodeNumber(100)));
tree.addPendant(new Cord("blue", encodeNumber(47)));

// Quipu arithmetic
const result = addQuipus(tree, otherTree);
```

## API

- **knot**: `encodeNumber(n)`, `decodeKnots(knots)`, `checksum(knots)`
- **cord**: `Cord` class with `addKnot`, `serialize()`, `deserialize(json)`, `CordTree` class with `addPendant`, `traverse()`
- **weave**: `weave(cord1, cord2)`, `unweave(cord)`, `isAssociative(a, b, c)`
- **arithmetic**: `addQuipus(t1, t2)`, `subtractQuipus(t1, t2)`, `multiplyQuipus(t1, t2)`
- **detect**: `detectCorruption(original, copy)` → `CorruptionReport`

## Test

```bash
npm test
```

MIT License
