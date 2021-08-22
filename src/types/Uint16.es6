export default class Uint16 {
  constructor(value) {
    this.set(value || 0);
  }

  get () {
    return this._value;
  }

  set (value) {
    this._value = value & 0xFFFF;

    return this;
  }

  inc(delta) {
    this.set(this.get() + (delta || 1));

    return this;
  }

  dec(delta) {
    this.set(this.get() - (delta || 1));

    return this;
  }

  valueOf() {
    return this.get();
  }

  asUint8Array () {
    const result = new Uint8Array(2);
    result[0]  = this._value;
    result[1]  = this._value >> 8;

    return result;
  }
}
