import {
  PhonemeNameTable,
  phonemeFlags,
} from './tables.es6';

import {END} from '../common/constants.es6'

import {
  FLAG_PUNCT,
  FLAG_NASAL,
  FLAG_LIQUIC,
  FLAG_FRICATIVE,
  FLAG_UNVOICED_STOPCONS,
  FLAG_STOPCONS,
  FLAG_VOICED,
  FLAG_CONSONANT,
  FLAG_VOWEL
} from './constants.es6'

import './typehints.es6';

import { phonemeHasFlag } from "./util.es6";
import { matchesBitmask } from "../util/util.es6";

/**
 * Applies various rules that adjust the lengths of phonemes
 *
 * Lengthen <!FRICATIVE> or <VOICED> between <VOWEL> and <PUNCTUATION> by 1.5
 * <VOWEL> <RX | LX> <CONSONANT> - decrease <VOWEL> length by 1
 * <VOWEL> <UNVOICED PLOSIVE> - decrease vowel by 1/8th
 * <VOWEL> <VOICED CONSONANT> - increase vowel by 1/4 + 1
 * <NASAL> <STOP CONSONANT> - set nasal = 5, consonant = 6
 * <STOP CONSONANT> {optional silence} <STOP CONSONANT> - shorten both to 1/2 + 1
 * <STOP CONSONANT> <LIQUID> - decrease <LIQUID> by 2
 *
 * @param {getPhoneme}    getPhoneme Callback for retrieving phonemes.
 * @param {setPhonemeLength} setLength  Callback for setting phoneme length.
 * @param {getPhonemeLength} getLength  Callback for retrieving phoneme length.
 *
 * @return undefined
 */
export default function AdjustLengths(getPhoneme, setLength, getLength) {
  if (process.env.DEBUG_SAM === true) {
    console.log(`AdjustLengths()`);
  }

  // LENGTHEN VOWELS PRECEDING PUNCTUATION
  //
  // Search for punctuation. If found, back up to the first vowel, then
  // process all phonemes between there and up to (but not including) the punctuation.
  // If any phoneme is found that is a either a fricative or voiced, the duration is
  // increased by (length * 1.5) + 1

  // loop index
  for (let position = 0;getPhoneme(position) !== END;position++) {
    // not punctuation?
    if(!phonemeHasFlag(getPhoneme(position), FLAG_PUNCT)) {
      continue;
    }
    let loopIndex = position;
    while ((--position > 1) && !phonemeHasFlag(getPhoneme(position), FLAG_VOWEL)) { /* back up while not a vowel */ }
    // If beginning of phonemes, exit loop.
    if (position === 0) {
      break;
    }

    // Now handle everything between position and loopIndex
    for (let vowel=position;position<loopIndex;position++) {
      // test for not fricative/unvoiced or not voiced
      if(!phonemeHasFlag(getPhoneme(position), FLAG_FRICATIVE) || phonemeHasFlag(getPhoneme(position), FLAG_VOICED)) {
        let A = getLength(position);
        // change phoneme length to (length * 1.5) + 1
        if (process.env.DEBUG_SAM === true) {
          console.log(
            position + ' RULE: Lengthen <!FRICATIVE> or <VOICED> ' +
            PhonemeNameTable[getPhoneme(position)] +
            ' between VOWEL:' + PhonemeNameTable[getPhoneme(vowel)] +
            ' and PUNCTUATION:'+PhonemeNameTable[getPhoneme(position)] +
            ' by 1.5'
          );
        }
        setLength(position, (A >> 1) + A + 1);
      }
    }
  }

  // Similar to the above routine, but shorten vowels under some circumstances
  // Loop through all phonemes
  let loopIndex = -1;
  let phoneme;

  while((phoneme = getPhoneme(++loopIndex)) !== END) {
    let position = loopIndex;
    // vowel?
    if (phonemeHasFlag(phoneme, FLAG_VOWEL)) {
      // get next phoneme
      phoneme = getPhoneme(++position);
      // not a consonant
      if (!phonemeHasFlag(phoneme, FLAG_CONSONANT)) {
        // 'RX' or 'LX'?
        if (((phoneme === 18) || (phoneme === 19)) && phonemeHasFlag(getPhoneme(++position), FLAG_CONSONANT)) {
          // followed by consonant?
          if (process.env.DEBUG_SAM === true) {
            console.log(
              loopIndex +
              ' RULE: <VOWEL ' +
              PhonemeNameTable[getPhoneme(loopIndex)] +
              '>' + PhonemeNameTable[phoneme] +
              ' <CONSONANT: ' + PhonemeNameTable[getPhoneme(position)] +
              '> - decrease length of vowel by 1'
            );
          }
          // decrease length of vowel by 1 frame
          setLength(loopIndex, getLength(loopIndex) - 1);
        }
        continue;
      }
      // Got here if not <VOWEL>
      // FIXME: the case when phoneme === END is taken over by !phonemeHasFlag(phoneme, FLAG_CONSONANT)
      let flags = (phoneme === END) ? (FLAG_CONSONANT | FLAG_UNVOICED_STOPCONS) : phonemeFlags[phoneme];
      // Unvoiced
      if (!matchesBitmask(flags, FLAG_VOICED)) {
        // *, .*, ?*, ,*, -*, DX, S*, SH, F*, TH, /H, /X, CH, P*, T*, K*, KX

        // unvoiced plosive
        if(matchesBitmask(flags, FLAG_UNVOICED_STOPCONS)) {
          // RULE: <VOWEL> <UNVOICED PLOSIVE>
          // <VOWEL> <P*, T*, K*, KX>
          if (process.env.DEBUG_SAM === true) {
            console.log(`${loopIndex} <VOWEL> <UNVOICED PLOSIVE> - decrease vowel by 1/8th`);
          }
          let A = getLength(loopIndex);
          setLength(loopIndex, A - (A >> 3));
        }
        continue;
      }

      // RULE: <VOWEL> <VOWEL or VOICED CONSONANT>
      // <VOWEL> <IY, IH, EH, AE, AA, AH, AO, UH, AX, IX, ER, UX, OH, RX, LX, WX, YX, WH, R*, L*, W*,
      //          Y*, M*, N*, NX, Q*, Z*, ZH, V*, DH, J*, EY, AY, OY, AW, OW, UW, B*, D*, G*, GX>
      if (process.env.DEBUG_SAM === true) {
        console.log(`${loopIndex} RULE: <VOWEL> <VOWEL or VOICED CONSONANT> - increase vowel by 1/4 + 1`);
      }
      // increase length
      let A = getLength(loopIndex);
      setLength(loopIndex, (A >> 2) + A + 1); // 5/4*A + 1
      continue;
    }

    //  *, .*, ?*, ,*, -*, WH, R*, L*, W*, Y*, M*, N*, NX, DX, Q*, S*, SH, F*,
    // TH, /H, /X, Z*, ZH, V*, DH, CH, J*, B*, D*, G*, GX, P*, T*, K*, KX

    // nasal?
    if(phonemeHasFlag(phoneme, FLAG_NASAL)) {
      // RULE: <NASAL> <STOP CONSONANT>
      //       Set punctuation length to 6
      //       Set stop consonant length to 5

      // M*, N*, NX,
      phoneme = getPhoneme(++position);
      // is next phoneme a stop consonant?
      if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
        // B*, D*, G*, GX, P*, T*, K*, KX
        if (process.env.DEBUG_SAM === true) {
          console.log(`${position} RULE: <NASAL> <STOP CONSONANT> - set nasal = 5, consonant = 6`);
        }
        setLength(position, 6); // set stop consonant length to 6
        setLength(position - 1, 5); // set nasal length to 5
      }
      continue;
    }

    //  *, .*, ?*, ,*, -*, WH, R*, L*, W*, Y*, DX, Q*, S*, SH, F*, TH,
    // /H, /X, Z*, ZH, V*, DH, CH, J*, B*, D*, G*, GX, P*, T*, K*, KX

    // stop consonant?
    if(phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
      // B*, D*, G*, GX

      // RULE: <STOP CONSONANT> {optional silence} <STOP CONSONANT>
      //       Shorten both to (length/2 + 1)

      while ((phoneme = getPhoneme(++position)) === 0) { /* move past silence */ }
      // if another stop consonant, process.
      if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
        // RULE: <STOP CONSONANT> {optional silence} <STOP CONSONANT>
        if (process.env.DEBUG_SAM === true) {
          console.log(
            `${position} RULE: <STOP CONSONANT> {optional silence} <STOP CONSONANT> - shorten both to 1/2 + 1`
          );
        }
        setLength(position, (getLength(position) >> 1) + 1);
        setLength(loopIndex, (getLength(loopIndex) >> 1) + 1);
      }
      continue;
    }

    //  *, .*, ?*, ,*, -*, WH, R*, L*, W*, Y*, DX, Q*, S*, SH, F*, TH,
    // /H, /X, Z*, ZH, V*, DH, CH, J*

    // liquic consonant?
    if ((position>0)
      && phonemeHasFlag(phoneme, FLAG_LIQUIC)
      && phonemeHasFlag(getPhoneme(position-1), FLAG_STOPCONS)) {
      // R*, L*, W*, Y*
      // RULE: <STOP CONSONANT> <LIQUID>
      //       Decrease <LIQUID> by 2
      // prior phoneme is a stop consonant
      if (process.env.DEBUG_SAM === true) {
        console.log(`${position} RULE: <STOP CONSONANT> <LIQUID> - decrease by 2`);
      }
      // decrease the phoneme length by 2 frames (20 ms)
      setLength(position, getLength(position) - 2);
    }
  }
}
