/**
 * Quipu Math — Mathematics of Incan knotted cord data structures.
 *
 * Incan quipu encode decimal numbers using knot sequences on cords.
 * Each position represents a decimal place (ones, tens, hundreds…).
 * - Long knots (multiple turns) encode digit values 2–9.
 * - A figure-eight knot encodes the digit 1.
 * - A single knot encodes 1 in non-units positions.
 * - Absence of knots at a position encodes 0.
 */

// ── Types ────────────────────────────────────────────────────────────

export enum KnotType {
  SINGLE = "single",
  FIGURE_EIGHT = "figure_eight",
  LONG = "long",
  EMPTY = "empty",
}

export interface KnotNode {
  type: KnotType;
  value: number; // digit value this knot represents
  position: number; // decimal position (0=units, 1=tens, 2=hundreds…)
  turns: number; // number of turns (meaningful only for LONG knots)
}

export interface CordJSON {
  color: string;
  knots: KnotNodeJSON[];
  position: number;
  children: CordJSON[];
}

export interface KnotNodeJSON {
  type: string;
  value: number;
  position: number;
  turns: number;
}

// ── Knot encoding / decoding ─────────────────────────────────────────

export function encodeNumber(n: number): KnotNode[] {
  if (n < 0) throw new Error(`Cannot encode negative number: ${n}`);
  if (n === 0) return [];

  const digits: number[] = [];
  let v = n;
  while (v > 0) {
    digits.push(v % 10);
    v = Math.floor(v / 10);
  }

  const knots: KnotNode[] = [];
  for (let position = 0; position < digits.length; position++) {
    const digit = digits[position];
    if (digit === 0) continue;

    if (digit === 1) {
      if (position === 0) {
        knots.push({ type: KnotType.FIGURE_EIGHT, value: 1, position, turns: 0 });
      } else {
        knots.push({ type: KnotType.SINGLE, value: 1, position, turns: 0 });
      }
    } else {
      knots.push({ type: KnotType.LONG, value: digit, position, turns: digit });
    }
  }
  return knots;
}

export function decodeKnots(knots: KnotNode[]): number {
  if (!knots || knots.length === 0) return 0;
  let total = 0;
  for (const node of knots) {
    total += node.value * Math.pow(10, node.position);
  }
  return total;
}

export function checksum(knots: KnotNode[]): number {
  return knots.reduce((sum, node) => sum + node.value, 0);
}

// ── Cord ──────────────────────────────────────────────────────────────

export class Cord {
  color: string;
  knots: KnotNode[];
  position: number;
  children: Cord[];

  constructor(
    color: string = "white",
    knots: KnotNode[] = [],
    position: number = 0,
    children: Cord[] = [],
  ) {
    this.color = color;
    this.knots = knots;
    this.position = position;
    this.children = children;
  }

  get value(): number {
    return decodeKnots(this.knots);
  }

  addKnot(knot: KnotNode): this {
    this.knots.push(knot);
    return this;
  }

  addChild(child: Cord): this {
    this.children.push(child);
    return this;
  }

  serialize(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  toJSON(): CordJSON {
    return {
      color: this.color,
      knots: this.knots.map((k) => ({
        type: k.type,
        value: k.value,
        position: k.position,
        turns: k.turns,
      })),
      position: this.position,
      children: this.children.map((c) => c.toJSON()),
    };
  }

  static fromJSON(data: CordJSON): Cord {
    const knots: KnotNode[] = (data.knots || []).map((d: KnotNodeJSON) => ({
      type: d.type as KnotType,
      value: d.value,
      position: d.position,
      turns: d.turns,
    }));
    const children = (data.children || []).map((c: CordJSON) => Cord.fromJSON(c));
    return new Cord(data.color || "white", knots, data.position || 0, children);
  }

  static deserialize(json: string): Cord {
    const data = JSON.parse(json);
    return Cord.fromJSON(data);
  }
}

// ── CordTree ──────────────────────────────────────────────────────────

export interface CordTreeJSON {
  mainCord: CordJSON;
  pendantCords: CordJSON[];
}

export class CordTree {
  mainCord: Cord;
  pendantCords: Cord[];

  constructor(mainCord?: Cord) {
    this.mainCord = mainCord ?? new Cord("main");
    this.pendantCords = [];
  }

  addPendant(cord: Cord): this {
    cord.position = this.pendantCords.length;
    this.pendantCords.push(cord);
    return this;
  }

  totalValue(): number {
    return this.pendantCords.reduce((sum, c) => sum + c.value, 0);
  }

  traverse(): KnotNode[] {
    const result: KnotNode[] = [];
    for (const cord of this.pendantCords) {
      result.push(...cord.knots);
      for (const child of cord.children) {
        result.push(...child.knots);
      }
    }
    return result;
  }

  serialize(): string {
    return JSON.stringify(
      {
        mainCord: this.mainCord.toJSON(),
        pendantCords: this.pendantCords.map((c) => c.toJSON()),
      },
      null,
      2,
    );
  }

  static deserialize(json: string): CordTree {
    const data = JSON.parse(json);
    const main = Cord.fromJSON(data.mainCord);
    const pendants = (data.pendantCords || []).map((d: CordJSON) => Cord.fromJSON(d));
    const tree = new CordTree(main);
    tree.pendantCords = pendants;
    return tree;
  }

  equals(other: CordTree): boolean {
    return this.serialize() === other.serialize();
  }
}

// ── Weave (categorical product) ──────────────────────────────────────

export function weave(cord1: Cord, cord2: Cord): Cord {
  const v1 = cord1.value;
  const v2 = cord2.value;
  const combinedValue = v1 * 10000 + v2;
  const combinedColor = `woven:${cord1.color}+${cord2.color}`;
  const combinedKnots = encodeNumber(combinedValue);
  const combinedChildren = [...cord1.children, ...cord2.children];

  return new Cord(combinedColor, combinedKnots, cord1.position, combinedChildren);
}

export function unweave(cord: Cord): [Cord, Cord] {
  const combined = cord.value;
  const v2 = combined % 10000;
  const v1 = Math.floor(combined / 10000);

  let c1Color = "white";
  let c2Color = "white";
  if (cord.color.startsWith("woven:") && cord.color.includes("+")) {
    const colorsPart = cord.color.slice("woven:".length);
    const idx = colorsPart.indexOf("+");
    c1Color = colorsPart.slice(0, idx);
    c2Color = colorsPart.slice(idx + 1);
  }

  return [new Cord(c1Color, encodeNumber(v1)), new Cord(c2Color, encodeNumber(v2))];
}

export function isAssociative(a: Cord, b: Cord, c: Cord): boolean {
  const left = weave(weave(a, b), c);
  const right = weave(a, weave(b, c));
  return left.value === right.value;
}

// ── Arithmetic ───────────────────────────────────────────────────────

function maxLen(a: CordTree, b: CordTree): number {
  return Math.max(a.pendantCords.length, b.pendantCords.length);
}

function pendantValue(tree: CordTree, i: number): number {
  return i < tree.pendantCords.length ? tree.pendantCords[i].value : 0;
}

export function addQuipus(a: CordTree, b: CordTree): CordTree {
  const result = new CordTree();
  for (let i = 0; i < maxLen(a, b); i++) {
    result.addPendant(new Cord("green", encodeNumber(pendantValue(a, i) + pendantValue(b, i))));
  }
  return result;
}

export function subtractQuipus(a: CordTree, b: CordTree): CordTree {
  const result = new CordTree();
  for (let i = 0; i < maxLen(a, b); i++) {
    const diff = pendantValue(a, i) - pendantValue(b, i);
    if (diff < 0) {
      throw new Error(`Negative result at position ${i}: ${pendantValue(a, i)} - ${pendantValue(b, i)} = ${diff}`);
    }
    result.addPendant(new Cord("blue", encodeNumber(diff)));
  }
  return result;
}

export function multiplyQuipus(a: CordTree, b: CordTree): CordTree {
  const result = new CordTree();
  for (let i = 0; i < maxLen(a, b); i++) {
    result.addPendant(new Cord("yellow", encodeNumber(pendantValue(a, i) * pendantValue(b, i))));
  }
  return result;
}

// ── Corruption detection ─────────────────────────────────────────────

export interface CorruptionReport {
  valueMismatch: string[];
  countMismatch: boolean;
  colorMismatch: string[];
  parityOk: boolean;
}

export function detectCorruption(original: CordTree, copy: CordTree): CorruptionReport {
  const valueMismatch: string[] = [];
  const colorMismatch: string[] = [];
  const countMismatch = original.pendantCords.length !== copy.pendantCords.length;
  let parityOk = true;

  const minLen = Math.min(original.pendantCords.length, copy.pendantCords.length);

  for (let i = 0; i < minLen; i++) {
    const origCord = original.pendantCords[i];
    const copyCord = copy.pendantCords[i];

    if (origCord.value !== copyCord.value) {
      valueMismatch.push(`Value mismatch at pendant ${i}: ${origCord.value} vs ${copyCord.value}`);
    }

    if (origCord.color !== copyCord.color) {
      colorMismatch.push(`Color mismatch at pendant ${i}: '${origCord.color}' vs '${copyCord.color}'`);
    }

    const origParity = checksum(origCord.knots) % 10;
    const copyParity = checksum(copyCord.knots) % 10;
    if (origParity !== copyParity) {
      parityOk = false;
    }
  }

  // If count mismatch, overall parity is off
  if (countMismatch) parityOk = false;

  return { valueMismatch, countMismatch, colorMismatch, parityOk };
}
