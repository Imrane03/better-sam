export default function CreateOutputBuffer(buffersize) {
  const buffer = new Uint8Array(buffersize);
  let bufferpos = 0;
  let oldTimeTableIndex = 0;
  // Scale by 16 and write five times.
  const writer = (index, A) => {
    const scaled = (A & 15) * 16;
    writer.ary(index, [scaled, scaled, scaled, scaled, scaled]);
  };
  // Write the five given values.
  writer.ary = (index, array) => {
    // timetable for more accurate c64 simulation
    const timetable = [
      [162, 167, 167, 127, 128],   // formants synth
      [226, 60, 60, 0, 0],         // unvoiced sample 0
      [225, 60, 59, 0, 0],         // unvoiced sample 1
      [200, 0, 0, 54, 55],         // voiced sample 0
      [199, 0, 0, 54, 54]          // voiced sample 1
    ];
    bufferpos += timetable[oldTimeTableIndex][index];
    if (((bufferpos / 50) | 0) > buffer.length) {
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Buffer overflow, want ${((bufferpos / 50) | 0)} but buffersize is only ${buffer.length}!`);
      }
      throw new Error();
    }
    oldTimeTableIndex = index;
    // write a little bit in advance
    for (let k = 0; k < 5; k++) {
      buffer[(bufferpos / 50 | 0) + k] = array[k];
    }
  }
  writer.get = () => {
    // Hack for PhantomJS which does not have slice() on UintArray8
    if (process.env.NODE_ENV === 'karma-test') {
      return buffer.slice
        ? buffer.slice(0, bufferpos / 50 | 0)
        : new Uint8Array([].slice.call(buffer).slice(0, bufferpos / 50 | 0));
    }
    return buffer.slice(0, bufferpos / 50 | 0);
  };
  return writer;
}
