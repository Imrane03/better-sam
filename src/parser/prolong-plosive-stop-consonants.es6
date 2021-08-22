import {END} from '../common/constants.es6'
import {combinedPhonemeLengthTable} from './tables.es6';
import {FLAG_0008, FLAG_STOPCONS, FLAG_UNVOICED_STOPCONS} from './constants.es6'
import { phonemeHasFlag } from './util.es6';

/**
 * Makes plosive stop consonants longer by inserting the next two following
 * phonemes from the table right behind the consonant.
 *
 * @param {getPhoneme}       getPhoneme Callback for retrieving phonemes.
 * @param {insertPhoneme}    insertPhoneme Callback for inserting phonemes.
 * @param {getPhonemeStress} getStress Callback for retrieving stress.
 *
 * @return undefined
 */
export default function ProlongPlosiveStopConsonantsCode41240(getPhoneme, insertPhoneme, getStress) {
  let pos=-1;
  let index;
  while ((index = getPhoneme(++pos)) !== END) {
    // Not a stop consonant, move to next one.
    if (!phonemeHasFlag(index, FLAG_STOPCONS)) {
      continue;
    }
    //If plosive, move to next non empty phoneme and validate the flags.
    if (phonemeHasFlag(index, FLAG_UNVOICED_STOPCONS)) {
      let nextNonEmpty;
      let X = pos;
      do { nextNonEmpty = getPhoneme(++X); } while (nextNonEmpty === 0);
      // If not END and either flag 0x0008 or '/H' or '/X'
      if ((nextNonEmpty !== END)
        && (
          phonemeHasFlag(nextNonEmpty, FLAG_0008)
          || (nextNonEmpty === 36)
          || (nextNonEmpty === 37))
      ) {
        continue;
      }
    }
    insertPhoneme(pos + 1, index + 1, getStress(pos), combinedPhonemeLengthTable[index + 1] & 0xFF);
    insertPhoneme(pos + 2, index + 2, getStress(pos), combinedPhonemeLengthTable[index + 2] & 0xFF);
    pos += 2;
  }
}
