// Fixed-size sample window plus lifetime aggregates; no frame history growth.
export class Samples {
  constructor(capacity = 3600) { this.values = new Float64Array(capacity); this.reset(); }
  reset() { this.count = 0; this.sum = 0; this.max = 0; }
  add(value) {
    this.values[this.count % this.values.length] = value;
    this.count++; this.sum += value; this.max = Math.max(this.max, value);
  }
  summary() {
    const values = Array.from(this.values.subarray(0, Math.min(this.count, this.values.length))).sort((a, b) => a - b);
    return { count: this.count, mean: this.count ? this.sum / this.count : 0, max: this.max,
      windowP95: values[Math.floor(values.length * .95)] ?? 0,
      windowP99: values[Math.floor(values.length * .99)] ?? 0 };
  }
}
