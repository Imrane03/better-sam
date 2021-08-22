import {blendRank, inBlendLength, outBlendLength} from './tables.es6';

/**
 * CREATE TRANSITIONS.
 *
 * Linear transitions are now created to smoothly connect each
 * phoeneme. This transition is spread between the ending frames
 * of the old phoneme (outBlendLength), and the beginning frames
 * of the new phoneme (inBlendLength).
 *
 * To determine how many frames to use, the two phonemes are
 * compared using the blendRank[] table. The phoneme with the
 * smaller score is used. In case of a tie, a blend of each is used:
 *
 *      if blendRank[phoneme1] ==  blendRank[phomneme2]
 *          // use lengths from each phoneme
 *          outBlendFrames = outBlend[phoneme1]
 *          inBlendFrames = outBlend[phoneme2]
 *      else if blendRank[phoneme1] < blendRank[phoneme2]
 *          // use lengths from first phoneme
 *          outBlendFrames = outBlendLength[phoneme1]
 *          inBlendFrames = inBlendLength[phoneme1]
 *      else
 *          // use lengths from the second phoneme
 *          // note that in and out are swapped around!
 *          outBlendFrames = inBlendLength[phoneme2]
 *          inBlendFrames = outBlendLength[phoneme2]
 *
 *  Blend lengths can't be less than zero.
 *
 * For most of the parameters, SAM interpolates over the range of the last
 * outBlendFrames-1 and the first inBlendFrames.
 *
 * The exception to this is the Pitch[] parameter, which is interpolates the
 * pitch from the center of the current phoneme to the center of the next
 * phoneme.
 *
 * @param {Uint8Array} pitches
 * @param {Uint8Array} frequency
 * @param {Uint8Array} amplitude
 * @param {Array} tuples
 *
 * @return {Number}
 */
export default function CreateTransitions(pitches, frequency, amplitude, tuples) {
  // 0=pitches
  // 1=frequency1
  // 2=frequency2
  // 3=frequency3
  // 4=amplitude1
  // 5=amplitude2
  // 6=amplitude3
  const tables = [pitches, frequency[0], frequency[1], frequency[2], amplitude[0], amplitude[1], amplitude[2]];
  const Read = (table, pos) => {
    if (process.env.NODE_ENV === 'development') {
      if (table < 0 || table > tables.length -1 ) {
        throw new Error(`Error invalid table in Read: ${table}`);
      }
    }
    return tables[table][pos];
  };

  // linearly interpolate values
  const interpolate = (width, table, frame, change) => {
    const sign      = (change < 0);
    const remainder = Math.abs(change) % width;
    const div       = (change / width) | 0;

    let error = 0;
    let pos   = width;

    while (--pos > 0) {
      let val = Read(table, frame) + div;
      error += remainder;
      if (error >= width) {
        // accumulated a whole integer error, so adjust output
        error -= width;
        if (sign) {
          val--;
        } else if (val) {
          // if input is 0, we always leave it alone
          val++;
        }
      }

      // Write updated value back to next frame.
      if (process.env.NODE_ENV === 'development') {
        if (table < 0 || table > tables.length -1 ) {
          throw new Error(`Error invalid table in Read: ${table}`);
        }
      }
      tables[table][++frame] = val;
      val += div;
    }
  };

  let outBlendFrames;
  let inBlendFrames;
  let boundary = 0;
  for (let pos=0;pos<tuples.length - 1;pos++) {
    const phoneme      = tuples[pos][0];
    const next_phoneme = tuples[pos+1][0];

    // get the ranking of each phoneme
    const next_rank = blendRank[next_phoneme];
    const rank      = blendRank[phoneme];

    // compare the rank - lower rank value is stronger
    if (rank === next_rank) {
      // same rank, so use out blend lengths from each phoneme
      outBlendFrames = outBlendLength[phoneme];
      inBlendFrames = outBlendLength[next_phoneme];
    } else if (rank < next_rank) {
      // next phoneme is stronger, so use its blend lengths
      outBlendFrames = inBlendLength[next_phoneme];
      inBlendFrames = outBlendLength[next_phoneme];
    } else {
      // current phoneme is stronger, so use its blend lengths
      // note the out/in are swapped
      outBlendFrames = outBlendLength[phoneme];
      inBlendFrames = inBlendLength[phoneme];
    }
    boundary += tuples[pos][1];
    const trans_end    = boundary + inBlendFrames;
    const trans_start  = boundary - outBlendFrames;
    const trans_length = outBlendFrames + inBlendFrames; // total transition

    if (((trans_length - 2) & 128) === 0) {
      // unlike the other values, the pitches[] interpolates from
      // the middle of the current phoneme to the middle of the
      // next phoneme

      // half the width of the current and next phoneme
      const cur_width  = tuples[pos][1] >> 1;
      const next_width = tuples[pos+1][1] >> 1;
      const pitch = pitches[boundary + next_width] - pitches[boundary - cur_width];
      // interpolate the values
      interpolate(cur_width + next_width, 0, trans_start, pitch);

      for (let table = 1; table < 7;table++) {
        // tables:
        // 0  pitches
        // 1  frequency1
        // 2  frequency2
        // 3  frequency3
        // 4  amplitude1
        // 5  amplitude2
        // 6  amplitude3
        const value = Read(table, trans_end) - Read(table, trans_start);
        interpolate(trans_length, table, trans_start, value);
      }
    }
  }

  // add the length of last phoneme
  return (boundary + tuples[tuples.length - 1][1]) & 0xFF;
}
