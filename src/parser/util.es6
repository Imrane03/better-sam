import {phonemeFlags} from './tables.es6';

import { matchesBitmask } from '../util/util.es6';

/**
 * Test if a phoneme has the given flag.
 *
 * @param {Number} phoneme The phoneme to test.
 * @param {Number} flag    The flag to test (see constants.es6)
 *
 * @return {boolean}
 */
export function phonemeHasFlag(phoneme, flag) {
  return matchesBitmask(phonemeFlags[phoneme], flag);
}
