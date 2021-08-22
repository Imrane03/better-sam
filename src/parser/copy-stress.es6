import {END} from '../common/constants.es6'
import {FLAG_VOWEL, FLAG_CONSONANT} from './constants.es6'

import { phonemeHasFlag } from './util.es6';

/**
 * Iterates through the phoneme buffer, copying the stress value from
 * the following phoneme under the following circumstance:
 *     1. The current phoneme is voiced, excluding plosives and fricatives
 *     2. The following phoneme is voiced, excluding plosives and fricatives, and
 *     3. The following phoneme is stressed
 *
 *  In those cases, the stress value+1 from the following phoneme is copied.
 *
 * For example, the word LOITER is represented as LOY5TER, with as stress
 * of 5 on the diphthong OY. This routine will copy the stress value of 6 (5+1)
 * to the L that precedes it.
 *
 * @param {getPhoneme}       getPhoneme Callback for retrieving phonemes.
 * @param {getPhonemeStress} getStress  Callback for retrieving phoneme stress.
 * @param {setPhonemeStress} setStress  Callback for setting phoneme stress.
 *
 * @return undefined
 */
export default function CopyStress(getPhoneme, getStress, setStress) {
  // loop through all the phonemes to be output
  let position = 0;
  let phoneme;
  while((phoneme = getPhoneme(position)) !== END) {
    // if CONSONANT_FLAG set, skip - only vowels get stress
    if (phonemeHasFlag(phoneme, FLAG_CONSONANT)) {
      phoneme = getPhoneme(position + 1);
      // if the following phoneme is the end, or a vowel, skip
      if ((phoneme !== END) && phonemeHasFlag(phoneme, FLAG_VOWEL)) {
        // get the stress value at the next position
        let stress = getStress(position + 1);
        if ((stress !== 0) && (stress < 0x80)) {
          // if next phoneme is stressed, and a VOWEL OR ER
          // copy stress from next phoneme to this one
          setStress(position, stress + 1);
        }
      }
    }
    ++position;
  }
}
