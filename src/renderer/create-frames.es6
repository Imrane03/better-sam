import {
  ampldata,
  sampledConsonantFlags,
  stressPitch_tab47492,
} from './tables.es6';
import {PHONEME_PERIOD, PHONEME_QUESTION} from '../parser/constants.es6';

const RISING_INFLECTION = 255;
const FALLING_INFLECTION = 1;

/**
 * Create a rising or falling inflection 30 frames prior to index X.
 * A rising inflection is used for questions, and a falling inflection is used for statements.
 */
function AddInflection (inflection, pos, pitches) {
  // store the location of the punctuation
  let end = pos;
  if (pos < 30) {
    pos = 0;
  } else {
    pos -= 30;
  }

  let A;
  // FIXME: Explain this fix better, it's not obvious
  // ML : A =, fixes a problem with invalid pitch with '.'
  while ((A = pitches[pos]) === 127) {
    ++pos;
  }

  while (pos !== end) {
    // add the inflection direction
    A += inflection;

    // set the inflection
    pitches[pos] = A & 0xFF;

    while ((++pos !== end) && pitches[pos] === 255) { /* keep looping */}
  }
}

/** CREATE FRAMES
 *
 * The length parameter in the list corresponds to the number of frames
 * to expand the phoneme to. Each frame represents 10 milliseconds of time.
 * So a phoneme with a length of 7 = 7 frames = 70 milliseconds duration.
 *
 * The parameters are copied from the phoneme to the frame verbatim.
 *
 * Returns:
 *   [
 *      pitches,
 *      frequency,
 *      amplitude,
 *      sampledConsonantFlag
 *   ]
 *
 * @param {Number}       pitch          Input
 * @param {Array}        tuples         Input
 * @param {Uint8Array[]} frequencyData  Input
 *
 * @return Array
 */
export default function CreateFrames (
  pitch,
  tuples,
  frequencyData) {
  const pitches              = [];
  const frequency            = [[], [], []];
  const amplitude            = [[], [], []];
  const sampledConsonantFlag = [];

  let X = 0;
  for (let i=0;i<tuples.length;i++) {
    // get the phoneme at the index
    const phoneme = tuples[i][0];
    if (phoneme === PHONEME_PERIOD) {
      AddInflection(FALLING_INFLECTION, X, pitches);
    } else if (phoneme === PHONEME_QUESTION) {
      AddInflection(RISING_INFLECTION, X, pitches);
    }

    // get the stress amount (more stress = higher pitch)
    const phase1 = stressPitch_tab47492[tuples[i][2]];
    // get number of frames to write
    // copy from the source to the frames list
    for (let frames = tuples[i][1];frames > 0;frames--) {
      frequency[0][X]         = frequencyData[0][phoneme];      // F1 frequency
      frequency[1][X]         = frequencyData[1][phoneme];      // F2 frequency
      frequency[2][X]         = frequencyData[2][phoneme];      // F3 frequency
      amplitude[0][X]         = ampldata[phoneme] & 0xFF;         // F1 amplitude
      amplitude[1][X]         = (ampldata[phoneme] >> 8) & 0xFF;  // F2 amplitude
      amplitude[2][X]         = (ampldata[phoneme] >> 16) & 0xFF; // F3 amplitude
      sampledConsonantFlag[X] = sampledConsonantFlags[phoneme]; // phoneme data for sampled consonants
      pitches[X]              = (pitch + phase1) & 0xFF;        // pitch
      X++;
    }
  }

  return [
    pitches,
    frequency,
    amplitude,
    sampledConsonantFlag
  ];
}
