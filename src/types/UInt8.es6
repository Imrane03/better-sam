export default class Uint8 {
  constructor(value) {
    this.set(value || 0);
  }

  /**
   * Retrieve the value.
   * @returns {Number}
   */
  get () {
    return this._value;
  }

  /**
   * Set the value.
   *
   * @param {Number} value
   *
   * @returns {Uint8}
   */
  set (value) {
    this._value = value & 0xFF;

    return this;
  }

  /**
   * Increment.
   *
   * @param {Number} [delta]
   *
   * @returns {Uint8}
   */
  inc(delta) {
    this.set(this.get() + (delta || 1));

    return this;
  }

  /**
   * Decrement.
   *
   * @param {Number} [delta]
   *
   * @returns {Uint8}
   */
  dec(delta) {
    this.set(this.get() - (delta || 1));

    return this;
  }

  valueOf() {
    return this.get();
  }
}
