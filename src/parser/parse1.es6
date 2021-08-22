import {PhonemeNameTable, StressTable} from './tables.es6';

/**
 * Match both characters but not with wildcards.
 *
 * @param {string} sign1
 * @param {string} sign2
 * @return {boolean|Number}
 */
function full_match(sign1, sign2) {
  const index = PhonemeNameTable.findIndex((value) => {
    return ((value === sign1 + sign2) && (value[1] !== '*'))
  });
  return index !== -1 ? index : false;
}

/**
 * Match character with wildcard.
 *
 * @param {string} sign1
 * @return {boolean|Number}
 */
function wild_match (sign1) {
  const index = PhonemeNameTable.findIndex((value) => {
    return (value === sign1 + '*')
  });
  return index !== -1 ? index : false;
}

/**
 * The input[] buffer contains a string of phonemes and stress markers along
 * the lines of:
 *
 *     DHAX KAET IHZ AH5GLIY.
 *
 * Some phonemes are 2 bytes long, such as "DH" and "AX".
 * Others are 1 byte long, such as "T" and "Z".
 * There are also stress markers, such as "5" and ".".
 *
 * The characters of the phonemes are stored in the table PhonemeNameTable.
 * The stress characters are arranged in low to high stress order in StressTable[].
 *
 * The following process is used to parse the input buffer:
 *
 * Repeat until the end is reached:
 * 1. First, a search is made for a 2 character match for phonemes that do not
 *    end with the '*' (wildcard) character. On a match, the index of the phoneme
 *    is added to the result and the buffer position is advanced 2 bytes.
 *
 * 2. If this fails, a search is made for a 1 character match against all
 *    phoneme names ending with a '*' (wildcard). If this succeeds, the
 *    phoneme is added to result and the buffer position is advanced
 *    1 byte.
 *
 * 3. If this fails, search for a 1 character match in the stressInputTable[].
 *   If this succeeds, the stress value is placed in the last stress[] table
 *   at the same index of the last added phoneme, and the buffer position is
 *   advanced by 1 byte.
 *
 * If this fails, return false.
 *
 * On success:
 *
 *    1. phonemeIndex[] will contain the index of all the phonemes.
 *    2. The last index in phonemeIndex[] will be 255.
 *    3. stress[] will contain the stress value for each phoneme
 *
 * input holds the string of phonemes, each two bytes wide
 * signInputTable1[] holds the first character of each phoneme
 * signInputTable2[] holds the second character of each phoneme
 * phonemeIndex[] holds the indexes of the phonemes after parsing input[]
 *
 * The parser scans through the input[], finding the names of the phonemes
 * by searching signInputTable1[] and signInputTable2[]. On a match, it
 * copies the index of the phoneme into the phonemeIndexTable[].
 *
 * @param {string}   input      Holds the string of phonemes, each two bytes wide.
 * @param {function} addPhoneme The callback to use to store phoneme index values.
 * @param {function} addStress  The callback to use to store stress index values.
 *
 * @return {undefined}
 */
export default function Parser1(input, addPhoneme, addStress) {
  for (let srcPos=0;srcPos<input.length;srcPos++) {
    if (process.env.DEBUG_SAM === true) {
      let tmp = input.toLowerCase();
      console.log(
        `processing "${tmp.substr(0, srcPos)}%c${tmp.substr(srcPos, 2).toUpperCase()}%c${tmp.substr(srcPos + 2)}"`,
         'color: red;',
         'color:normal;'
      );
    }
    let sign1 = input[srcPos];
    let sign2 = input[srcPos + 1] || '';
    let match;
    if ((match = full_match(sign1, sign2)) !== false) {
      // Matched both characters (no wildcards)
      srcPos++; // Skip the second character of the input as we've matched it
      addPhoneme(match);
      continue;
    }
    if ((match = wild_match(sign1)) !== false) {
      // Matched just the first character (with second character matching '*'
      addPhoneme(match);
      continue;
    }

    // Should be a stress character. Search through the stress table backwards.
    match = StressTable.length;
    while ((sign1 !== StressTable[match]) && (match > 0)) {
      --match;
    }

    if (match === 0) {
      if (process.env.NODE_ENV === 'development') {
        throw Error(`Could not parse char ${sign1}`);
      }
      throw Error();
    }
    addStress(match); // Set stress for prior phoneme
  }
}
