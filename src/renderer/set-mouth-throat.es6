import {frequencyData} from './tables.es6';

// mouth formants (F1) 5..29
const mouthFormants5_29 = [
  10, 14, 19, 24, 27, 23, 21, 16, 20, 14, 18, 14, 18, 18,
  16, 13, 15, 11, 18, 14, 11, 9, 6, 6, 6
];
// formant 1 frequencies (mouth) 48..53
const mouthFormants48_53 = [19, 27, 21, 27, 18, 13];

// throat formants (F2) 5..29
const throatFormants5_29 = [
  84, 73, 67, 63, 40, 44, 31, 37, 45, 73, 49,
  36, 30, 51, 37, 29, 69, 24, 50, 30, 24, 83, 46, 54, 86,
];
// formant 2 frequencies (throat) 48..53
const throatFormants48_53 = [72, 39, 31, 43, 30, 34];

function trans(mem39212, mem39213) {
  return (((mem39212 * mem39213) >> 8) & 0xFF) << 1;
}

/**
 * SAM's voice can be altered by changing the frequencies of the
 * mouth formant (F1) and the throat formant (F2). Only the voiced
 * phonemes (5-29 and 48-53) are altered.
 *
 * This returns the three base frequency arrays.
 *
 * @param {Number} mouth  valid values: 0-255
 * @param {Number} throat valid values: 0-255
 *
 * @return {Array}
 */
export default function SetMouthThroat(mouth, throat) {
  const freqdata = [[],[],[]];
  frequencyData.map((v, i) => {
    freqdata[0][i] = v & 0xFF;
    freqdata[1][i] = (v >> 8) & 0xFF;
    freqdata[2][i] = (v >> 16) & 0xFF;
  });

  // recalculate formant frequencies 5..29 for the mouth (F1) and throat (F2)
  for(let pos = 5; pos < 30; pos++) {
    // recalculate mouth frequency
    freqdata[0][pos] = trans(mouth, mouthFormants5_29[pos-5]);

    // recalculate throat frequency
    freqdata[1][pos] = trans(throat, throatFormants5_29[pos-5]);
  }

  // recalculate formant frequencies 48..53
  for(let pos = 0; pos < 6; pos++) {
    // recalculate F1 (mouth formant)
    freqdata[0][pos+48] = trans(mouth, mouthFormants48_53[pos]);
    // recalculate F2 (throat formant)
    freqdata[1][pos+48] = trans(throat, throatFormants48_53[pos]);
  }

  return freqdata;
}
