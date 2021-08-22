/**
 * Test if a bit is set.
 * @param {Number} bits The bits.
 * @param {Number} mask The mask to test.
 * @return {boolean}
 */
export function matchesBitmask (bits, mask) {
  return (bits & mask) !== 0;
}


export function text2Uint8Array (text) {
  const buffer = new Uint8Array(text.length);
  text.split('').forEach((e, index) => {
    buffer[index] = e.charCodeAt(0)
  });
  return buffer;
}

/**
 *
 * @param {Uint8Array} buffer
 * @return {string}
 */
export function uint8Array2Text (buffer) {
  let text = '';
  for (let i=0;i<buffer.length;i++) {
    text += String.fromCharCode(buffer[i]);
  }

  return text;
}

export function Uint32ToUint8Array (uint32) {
  const result = new Uint8Array(4);
  result[0]  = uint32;
  result[1]  = uint32 >>  8;
  result[2]  = uint32 >> 16;
  result[3]  = uint32 >> 24;

  return result;
}

export function Uint16ToUint8Array (uint16) {
  const result = new Uint8Array(2);
  result[0]  = uint16;
  result[1]  = uint16 >> 8;

  return result;
}
