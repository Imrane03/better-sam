import {
  signInputTable1,
  signInputTable2,
  stressInputTable,
  flags,
  phonemeLengthTable,
  phonemeStressedLengthTable
} from './tables.es6';

import {
  pR,
  pD,
  pT,
  FLAG_8000,
  FLAG_4000,
  FLAG_FRICATIVE,
  FLAG_LIQUIC,
  FLAG_NASAL,
  FLAG_ALVEOLAR,
  FLAG_0200,
  FLAG_PUNCT,
  FLAG_VOWEL,
  FLAG_CONSONANT,
  FLAG_DIP_YX,
  FLAG_DIPTHONG,
  FLAG_0008,
  FLAG_VOICED,
  FLAG_STOPCONS,
  FLAG_UNVOICED_STOPCONS,
} from '../constants.es6'

import {BREAK, END} from '../../common/constants.es6'

import {text2Uint8Array} from '../../../src/util/util.es6';

function full_match(sign1, sign2) {
  let Y = 0;
  do {
    // GET FIRST CHARACTER AT POSITION Y IN signInputTable
    // --> should change name to PhonemeNameTable1
    let A = signInputTable1[Y];

    if (A === sign1) {
      A = signInputTable2[Y];
      // NOT A SPECIAL AND MATCHES SECOND CHARACTER?
      if ((A !== 42 /* '*' */) && (A === sign2)) {
        return Y;
      }
    }
  } while (++Y !== 81);
  return -1;
}

function wild_match (sign1) {
  let Y = 0;
  do {
    if (signInputTable2[Y] === 42 /* '*' */) {
      if (signInputTable1[Y] === sign1) {
        return Y;
      }
    }
  } while (++Y !== 81);
  return -1;
}

/**
 * The input[] buffer contains a string of phonemes and stress markers along
 * the lines of:
 *
 *     DHAX KAET IHZ AH5GLIY. <0x9B>
 *
 * The byte 0x9B marks the end of the buffer. Some phonemes are 2 bytes
 * long, such as "DH" and "AX". Others are 1 byte long, such as "T" and "Z".
 * There are also stress markers, such as "5" and ".".
 *
 * The first character of the phonemes are stored in the table signInputTable1[].
 * The second character of the phonemes are stored in the table signInputTable2[].
 * The stress characters are arranged in low to high stress order in stressInputTable[].
 *
 * The following process is used to parse the input[] buffer:
 *
 * Repeat until the <0x9B> character is reached:
 *
 *        First, a search is made for a 2 character match for phonemes that do not
 *        end with the '*' (wildcard) character. On a match, the index of the phoneme
 *        is added to phonemeIndex[] and the buffer position is advanced 2 bytes.
 *
 *        If this fails, a search is made for a 1 character match against all
 *        phoneme names ending with a '*' (wildcard). If this succeeds, the
 *        phoneme is added to phonemeIndex[] and the buffer position is advanced
 *        1 byte.
 *
 *        If this fails, search for a 1 character match in the stressInputTable[].
 *        If this succeeds, the stress value is placed in the last stress[] table
 *        at the same index of the last added phoneme, and the buffer position is
 *        advanced by 1 byte.
 *
 *        If this fails, return a 0.
 *
 * On success:
 *
 *    1. phonemeIndex[] will contain the index of all the phonemes.
 *    2. The last index in phonemeIndex[] will be 255.
 *    3. stress[] will contain the stress value for each phoneme
 *
 * input[] holds the string of phonemes, each two bytes wide
 * signInputTable1[] holds the first character of each phoneme
 * signInputTable2[] holds te second character of each phoneme
 * phonemeIndex[] holds the indexes of the phonemes after parsing input[]
 *
 * The parser scans through the input[], finding the names of the phonemes
 * by searching signInputTable1[] and signInputTable2[]. On a match, it
 * copies the index of the phoneme into the phonemeIndexTable[].
 *
 * The character <0x9B> marks the end of text in input[]. When it is reached,
 * the index 255 is placed at the end of the phonemeIndexTable[], and the
 * function returns with a 1 indicating success.
 *
 * @param {Uint8Array} input The input values.
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.stress
 *
 * @return {Number}
 */
function Parser1(input, {phonemeindex, stress}) {
  let i;

  // Clear the stress table.
  for(i=0; i<256; i++) {
    stress[i] = 0;
  }

  let sign1;
  let sign2;
  let position = 0;
  let srcpos   = 0;
  while((sign1 = input[srcpos]) !== 155) { // 155 (\233) is end of line marker
    sign2 = input[++srcpos];
    let match = 0;
    if ((match = full_match(sign1, sign2)) !== -1) {
      // Matched both characters (no wildcards)
      phonemeindex[position++] = match;
      ++srcpos; // Skip the second character of the input as we've matched it
    } else if ((match = wild_match(sign1)) !== -1) {
      // Matched just the first character (with second character matching '*'
      phonemeindex[position++] = match;
    } else {
      // Should be a stress character. Search through the
      // stress table backwards.
      match = 8; // End of stress table. FIXME: Don't hardcode.
      while ((sign1 !== stressInputTable[match]) && (match>0)){ --match; }

      if (match === 0) {
        return 0; // failure
      }

      stress[position-1] = match; // Set stress for prior phoneme
    }
  } //while

  phonemeindex[position] = END;
  return 1;
}

/**
 * Insert a phoneme at the given position.
 *
 * @param {object}     data               The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.phonemeLength
 * @param {Uint8Array} data.stress
 * @param {Number} position               The position in the phoneme arrays to work set.
 * @param {Number} index                  The phoneme index.
 * @param {Number} length                 The phoneme length.
 * @param {Number} stressValue            The stress.
 *
 * @return undefined
 */
function Insert({phonemeindex, phonemeLength, stress}, position, index, length, stressValue) {
  // ML : always keep last safe-guarding 255
  for(let i = 253; i >= position; i--) {
    phonemeindex[i+1]  = phonemeindex[i];
    phonemeLength[i+1] = phonemeLength[i];
    stress[i+1]        = stress[i];
  }

  phonemeindex[position]  = index;
  phonemeLength[position] = length;
  stress[position]        = stressValue;
}

/**
 * Rewrites the phonemes using the following rules:
 *
 * <DIPTHONG ENDING WITH WX> -> <DIPTHONG ENDING WITH WX> WX
 * <DIPTHONG NOT ENDING WITH WX> -> <DIPTHONG NOT ENDING WITH WX> YX
 * UL -> AX L
 * UM -> AX M
 * <STRESSED VOWEL> <SILENCE> <STRESSED VOWEL> -> <STRESSED VOWEL> <SILENCE> Q <VOWEL>
 * T R -> CH R
 * D R -> J R
 * <VOWEL> R -> <VOWEL> RX
 * <VOWEL> L -> <VOWEL> LX
 * G S -> G Z
 * K <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPTHONG NOT ENDING WITH IY>
 * G <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPTHONG NOT ENDING WITH IY>
 * S P -> S B
 * S T -> S D
 * S K -> S G
 * S KX -> S GX
 * <ALVEOLAR> UW -> <ALVEOLAR> UX
 * CH -> CH CH' (CH requires two phonemes to represent it)
 * J -> J J' (J requires two phonemes to represent it)
 * <UNSTRESSED VOWEL> T <PAUSE> -> <UNSTRESSED VOWEL> DX <PAUSE>
 * <UNSTRESSED VOWEL> D <PAUSE>  -> <UNSTRESSED VOWEL> DX <PAUSE>
 *
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.stress
 *
 * @return undefined
 */
function Parser2({phonemeindex, phonemeLength, stress}) {
  const rule_alveolar_uw = (X) => {
    // ALVEOLAR flag set?
    if ((flags[phonemeindex[X-1]] & FLAG_ALVEOLAR) !== 0) {
      if (process.env.NODE_ENV === 'development') { console.log(`${X} RULE: <ALVEOLAR> UW -> <ALVEOLAR> UX`); }
      phonemeindex[X] = 16;
    }
  };

  const rule_ch = (X) => {
    if (process.env.NODE_ENV === 'development') { console.log(`${X} RULE: CH -> CH CH+1`); }
    Insert({phonemeindex, phonemeLength, stress}, X + 1, 43, 0, stress[X]);
  };

  const rule_j = (X) => {
    if (process.env.NODE_ENV === 'development') { console.log(`${X} RULE: J -> J J+1`); }
    Insert({phonemeindex, phonemeLength, stress}, X + 1, 45, 0, stress[X]);
  };

  const rule_g = (pos) => {
    // G <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPTHONG NOT ENDING WITH IY>
    // Example: GO

    let index = phonemeindex[pos+1];

    // If dipthong ending with YX, move continue processing next phoneme
    if ((index !== 255) && ((flags[index] & FLAG_DIP_YX) === 0)) {
      // replace G with GX and continue processing next phoneme
      if (process.env.NODE_ENV === 'development') {
        console.log(`${pos} RULE: G <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPTHONG NOT ENDING WITH IY>`);
      }
      phonemeindex[pos] = 63; // 'GX'
    }
  };

  const rule_dipthong = (p, pf, pos) => {
    // <DIPTHONG ENDING WITH WX> -> <DIPTHONG ENDING WITH WX> WX
    // <DIPTHONG NOT ENDING WITH WX> -> <DIPTHONG NOT ENDING WITH WX> YX
    // Example: OIL, COW

    // If ends with IY, use YX, else use WX
    const A = ((pf & FLAG_DIP_YX) !== 0) ? 21 : 20; // 'WX' = 20 'YX' = 21

    // Insert at WX or YX following, copying the stress
    if (A === 20) {
      if (process.env.NODE_ENV === 'development') { console.log(`${pos} insert WX following dipthong NOT ending in IY sound`); }
    }
    if (A === 21) {
      if (process.env.NODE_ENV === 'development') { console.log(`${pos} insert YX following dipthong ending in IY sound`); }
    }
    Insert({phonemeindex, phonemeLength, stress}, (pos + 1) & 0xFF, A, 0, stress[pos]);

    if (p === 53 || p === 42 || p === 44) {
      if (p === 53) {
        // Example: NEW, DEW, SUE, ZOO, THOO, TOO
        rule_alveolar_uw(pos);
      } else if (p === 42) {
        // Example: CHEW
        rule_ch(pos, 0);
      } else if (p === 44) {
        // Example: JAY
        rule_j(pos, 0);
      }
    }
  };

  const ChangeRule = (position, rule, mem60, stressValue) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${position} RULE: ${String.fromCharCode(signInputTable1[phonemeindex[position]], signInputTable2[phonemeindex[position]])} -> AX ${String.fromCharCode(signInputTable1[mem60], signInputTable2[mem60])}`);
    }
    position = position & 0xFF;
    phonemeindex[position] = rule;
    Insert({phonemeindex, phonemeLength, stress}, position + 1, mem60, 0, stressValue);
  };

  let pos = 0; //mem66;
  let p;

  while((p = phonemeindex[pos]) !== END) {
    if (process.env.NODE_ENV === 'development') {
      console.log('%d: %s', pos, String.fromCharCode(signInputTable1[p], signInputTable2[p]));
    }

    if (p === 0) { // Is phoneme pause?
      ++pos;
      continue;
    }

    let pf = flags[p];
    let prior = phonemeindex[pos-1];

    if ((pf & FLAG_DIPTHONG) !== 0) {
      rule_dipthong(p, pf, pos, 0);
    } else if (p === 78) {
      // Example: MEDDLE
      if (process.env.NODE_ENV === 'development') { console.log(`${pos} RULE: UL -> AX L`); }
      ChangeRule(pos, 13, 24, stress[pos]);
    } else if (p === 79) {
      // Example: ASTRONOMY
      if (process.env.NODE_ENV === 'development') { console.log(`${pos} RULE: UM -> AX M`); }
      ChangeRule(pos, 13, 27, stress[pos]);
    } else if (p === 80) {
      if (process.env.NODE_ENV === 'development') { console.log(`${pos} RULE: UN -> AX N`); }
      ChangeRule(pos, 13, 28, stress[pos]);
    } // Example: FUNCTION
    else if ((pf & FLAG_VOWEL) && stress[pos]) {
      // RULE:
      //       <STRESSED VOWEL> <SILENCE> <STRESSED VOWEL> -> <STRESSED VOWEL> <SILENCE> Q <VOWEL>
      // EXAMPLE: AWAY EIGHT
      if (!phonemeindex[pos+1]) { // If following phoneme is a pause, get next
        p = phonemeindex[pos+2];
        if (p !== END && ((flags[p] & FLAG_VOWEL) !== 0) && stress[pos+2]) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`${pos+2} Insert glottal stop between two stressed vowels with space between them`);
          }
          Insert({phonemeindex, phonemeLength, stress}, pos+2, 31, 0, 0); // 31 = 'Q'
        }
      }
    } else if (p === pR) { // RULES FOR PHONEMES BEFORE R
      if (prior === pT) {
        // Example: TRACK
        if (process.env.NODE_ENV === 'development') { console.log(`${pos} RULE: T* R* -> CH R*`); }
        phonemeindex[pos-1] = 42;
      } else if (prior === pD) {
        // Example: DRY
        if (process.env.NODE_ENV === 'development') { console.log(`${pos} RULE: D* R* -> J* R*`); }
        phonemeindex[pos-1] = 44;
      } else if ((flags[prior] & FLAG_VOWEL) !== 0) {
        // Example: ART
        if (process.env.NODE_ENV === 'development') { console.log(`${pos} <VOWEL> R* -> <VOWEL> RX`); }
        phonemeindex[pos] = 18;
      }
    } else if ((p === 24) && ((flags[prior] & FLAG_VOWEL) !== 0)) {
      // Example: ALL
      if (process.env.NODE_ENV === 'development') { console.log(`${pos} <VOWEL> L* -> <VOWEL> LX`); }
      phonemeindex[pos] = 19;
    } else if (prior === 60 && p === 32) { // 'G' 'S'
      // Can't get to fire -
      //       1. The G -> GX rule intervenes
      //       2. Reciter already replaces GS -> GZ
      if (process.env.NODE_ENV === 'development') { console.log(`${pos} G S -> G Z`); }
      phonemeindex[pos] = 38;
    } else if (p === 60) {
      rule_g(pos);
    } else {
      if (p === 72) {  // 'K'
        // K <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPTHONG NOT ENDING WITH IY>
        // Example: COW
        let Y = phonemeindex[pos+1];
        // If at end, replace current phoneme with KX
        if ((flags[Y] & FLAG_DIP_YX) === 0 || Y === END) {
          // VOWELS AND DIPTHONGS ENDING WITH IY SOUND flag set?
          if (process.env.NODE_ENV === 'development') {
            console.log(`${pos} K <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPTHONG NOT ENDING WITH IY>`);
          }
          phonemeindex[pos] = 75;
          p  = 75;
          pf = flags[p];
        }
      }

      // Replace with softer version?
      if ((flags[p] & FLAG_UNVOICED_STOPCONS) && (prior === 32)) { // 'S'
        // RULE:
        //      S P -> S B
        //      S T -> S D
        //      S K -> S G
        //      S KX -> S GX
        // Examples: SPY, STY, SKY, SCOWL
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `${pos} RULE: S* %s%s -> S* %s%s`,
            signInputTable1[p],
            signInputTable2[p],
            signInputTable1[p-12],
            signInputTable2[p-12]
          );
        }
        phonemeindex[pos] = p-12;
      } else if ((pf & FLAG_UNVOICED_STOPCONS) === 0) {
        p = phonemeindex[pos];
        if (p === 53) {
          // Example: NEW, DEW, SUE, ZOO, THOO, TOO
          rule_alveolar_uw(pos);
        } else if (p === 42) {
          rule_ch(pos);
        } // Example: CHEW
        else if (p === 44) {
          // Example: JAY
          rule_j(pos);
        }
      }

      if (p === 69 || p === 57) { // 'T', 'D'
        // RULE: Soften T following vowel
        // NOTE: This rule fails for cases such as "ODD"
        //       <UNSTRESSED VOWEL> T <PAUSE> -> <UNSTRESSED VOWEL> DX <PAUSE>
        //       <UNSTRESSED VOWEL> D <PAUSE>  -> <UNSTRESSED VOWEL> DX <PAUSE>
        // Example: PARTY, TARDY
        if ((flags[phonemeindex[pos-1]] & FLAG_VOWEL) !== 0) {
          p = phonemeindex[pos+1];
          if (!p) {
            p = phonemeindex[pos+2];
          }
          if ((flags[p] & FLAG_VOWEL) && !stress[pos+1]) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`${pos} Soften T or D following vowel or ER and preceding a pause -> DX`);
            }
            phonemeindex[pos] = 30;
          }
        }
      }
    }
    pos++;
  } // while
}

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
 * of 5 on the dipthong OY. This routine will copy the stress value of 6 (5+1)
 * to the L that precedes it.
 *
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.stress
 *
 * @return undefined
 */
function CopyStress({phonemeindex, stress}) {
  // loop thought all the phonemes to be output
  let pos = 0; //mem66
  let Y;
  while((Y = phonemeindex[pos]) !== END) {
    // if CONSONANT_FLAG set, skip - only vowels get stress
    if ((flags[Y] & 64) !== 0) {
      Y = phonemeindex[pos+1];
      // if the following phoneme is the end, or a vowel, skip
      if ((Y !== END) && (flags[Y] & 128) !== 0) {
        // get the stress value at the next position
        Y = stress[pos+1];
        if (Y && ((Y & 128) === 0)) {
          // if next phoneme is stressed, and a VOWEL OR ER
          // copy stress from next phoneme to this one
          stress[pos] = Y+1;
        }
      }
    }
    ++pos;
  }
}

/**
 * change phonemelength depedendent on stress
 *
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.phonemeLength
 * @param {Uint8Array} data.stress
 *
 * @return undefined
 */
function SetPhonemeLength({phonemeindex, phonemeLength, stress}) {
  let position = 0;
  while(phonemeindex[position] !== 255) {
    let A = stress[position];
    if ((A === 0) || ((A&128) !== 0)) {
      phonemeLength[position] = phonemeLengthTable[phonemeindex[position]];
    } else {
      phonemeLength[position] = phonemeStressedLengthTable[phonemeindex[position]];
    }
    position++;
  }
}

/**
 * Applies various rules that adjust the lengths of phonemes
 *
 * Lengthen <FRICATIVE> or <VOICED> between <VOWEL> and <PUNCTUATION> by 1.5
 * <VOWEL> <RX | LX> <CONSONANT> - decrease <VOWEL> length by 1
 * <VOWEL> <UNVOICED PLOSIVE> - decrease vowel by 1/8th
 * <VOWEL> <UNVOICED CONSONANT> - increase vowel by 1/2 + 1
 * <NASAL> <STOP CONSONANT> - set nasal = 5, consonant = 6
 * <VOICED STOP CONSONANT> {optional silence} <STOP CONSONANT> - shorten both to 1/2 + 1
 * <LIQUID CONSONANT> <DIPTHONG> - decrease by 2
 *
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.phonemeLength
 *
 * @return undefined
 */
function AdjustLengths({phonemeindex, phonemeLength}) {
  // LENGTHEN VOWELS PRECEDING PUNCTUATION
  //
  // Search for punctuation. If found, back up to the first vowel, then
  // process all phonemes between there and up to (but not including) the punctuation.
  // If any phoneme is found that is a either a fricative or voiced, the duration is
  // increased by (length * 1.5) + 1

  // loop index
  let X = 0;
  let index;

  while((index = phonemeindex[X]) !== END) {
    // not punctuation?
    if((flags[index] & FLAG_PUNCT) === 0) {
      ++X;
      continue;
    }

    let loopIndex = X;

    while (--X && ((flags[phonemeindex[X]] & FLAG_VOWEL) === 0)) { /* back up while not a vowel */ }
    if (X === 0) {
      break;
    }

    do {
      // test for vowel
      index = phonemeindex[X];

      // test for fricative/unvoiced or not voiced
      if(((flags[index] & FLAG_FRICATIVE) === 0) || ((flags[index] & FLAG_VOICED) !== 0)) { //nochmal überprüfen
        // change phoneme length to (length * 1.5) + 1
        if (process.env.NODE_ENV === 'development') {
          console.log(`${X} PRE phoneme ${String.fromCharCode(signInputTable1[phonemeindex[X]], signInputTable2[phonemeindex[X]])} length ${phonemeLength[X]}`);
          console.log(`${X} Lengthen <FRICATIVE> or <VOICED> between <VOWEL> and <PUNCTUATION> by 1.5`);
        }
        let A = phonemeLength[X];
        phonemeLength[X] = (A >> 1) + A + 1;
        if (process.env.NODE_ENV === 'development') {
          console.log(`${X} POST phoneme ${String.fromCharCode(signInputTable1[phonemeindex[X]], signInputTable2[phonemeindex[X]])} length ${phonemeLength[X]}`);
        }
      }
    } while (++X !== loopIndex);
    X++;
  }  // while

  // Similar to the above routine, but shorten vowels under some circumstances

  // Loop through all phonemes
  let loopIndex=0;

  while((index = phonemeindex[loopIndex]) !== END) {
    let X = loopIndex;

    if ((flags[index] & FLAG_VOWEL) !== 0) {
      index = phonemeindex[loopIndex+1];
      if ((flags[index] & FLAG_CONSONANT) === 0) {
        if ((index === 18) || (index === 19)) { // 'RX', 'LX'
          index = phonemeindex[loopIndex+2];
          if ((flags[index] & FLAG_CONSONANT) !== 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`${loopIndex} PRE phoneme ${String.fromCharCode(signInputTable1[phonemeindex[loopIndex]], signInputTable2[phonemeindex[loopIndex]])} length ${phonemeLength[loopIndex]}`);
              console.log(`${loopIndex} <VOWEL> <RX | LX> <CONSONANT> - decrease length of vowel by 1`);
            }
            phonemeLength[loopIndex]--;
            if (process.env.NODE_ENV === 'development') {
              console.log(`${loopIndex} POST phoneme ${String.fromCharCode(signInputTable1[phonemeindex[loopIndex]], signInputTable2[phonemeindex[loopIndex]])} length ${phonemeLength[loopIndex]}`);
            }
          }
        }
      } else { // Got here if not <VOWEL>
        let flag = (index === END) ? 65 : flags[index]; // 65 if end marker

        // Unvoiced
        if ((flag & FLAG_VOICED) === 0) {
          // *, .*, ?*, ,*, -*, DX, S*, SH, F*, TH, /H, /X, CH, P*, T*, K*, KX

          // unvoiced plosive
          if((flag & FLAG_UNVOICED_STOPCONS) !== 0) {
            // RULE: <VOWEL> <UNVOICED PLOSIVE>
            // <VOWEL> <P*, T*, K*, KX>
            if (process.env.NODE_ENV === 'development') {
              console.log(`${loopIndex} PRE phoneme ${String.fromCharCode(signInputTable1[phonemeindex[loopIndex]], signInputTable2[phonemeindex[loopIndex]])} length ${phonemeLength[loopIndex]}`);
              console.log(`${loopIndex} <VOWEL> <UNVOICED PLOSIVE> - decrease vowel by 1/8th`);
            }
            phonemeLength[loopIndex] -= (phonemeLength[loopIndex] >> 3);
            if (process.env.NODE_ENV === 'development') {
              console.log(`${loopIndex} POST phoneme ${String.fromCharCode(signInputTable1[phonemeindex[loopIndex]], signInputTable2[phonemeindex[loopIndex]])} length ${phonemeLength[loopIndex]}`);
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`${loopIndex} PRE phoneme ${String.fromCharCode(signInputTable1[phonemeindex[loopIndex]], signInputTable2[phonemeindex[loopIndex]])} length ${phonemeLength[loopIndex]}`);
            console.log(`${index} <VOWEL> <VOICED CONSONANT> - increase vowel by 1/2 + 1`);
          }
          // decrease length
          let A = phonemeLength[loopIndex];
          phonemeLength[loopIndex] = (A >> 2) + A + 1;     // 5/4*A + 1
          if (process.env.NODE_ENV === 'development') {
            console.log(`${loopIndex} POST phoneme ${String.fromCharCode(signInputTable1[phonemeindex[loopIndex]], signInputTable2[phonemeindex[loopIndex]])} length ${phonemeLength[loopIndex]}`);
          }
        }
      }
    } else if((flags[index] & FLAG_NASAL) !== 0) { // nasal?
      // RULE: <NASAL> <STOP CONSONANT>
      //       Set punctuation length to 6
      //       Set stop consonant length to 5
      index = phonemeindex[++X];
      if (index !== END && ((flags[index] & FLAG_STOPCONS) !== 0)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`${X} RULE: <NASAL> <STOP CONSONANT> - set nasal = 5, consonant = 6`);
        }
        phonemeLength[X]   = 6; // set stop consonant length to 6
        phonemeLength[X-1] = 5; // set nasal length to 5
      }
    } else if((flags[index] & FLAG_STOPCONS) !== 0) { // (voiced) stop consonant?
      // RULE: <VOICED STOP CONSONANT> {optional silence} <STOP CONSONANT>
      //       Shorten both to (length/2 + 1)

      while ((index = phonemeindex[++X]) === 0) { /* move past silence */ }

      if (index !== END && ((flags[index] & FLAG_STOPCONS) !== 0)) {
        // FIXME, this looks wrong?
        // RULE: <UNVOICED STOP CONSONANT> {optional silence} <STOP CONSONANT>
        if (process.env.NODE_ENV === 'development') {
          console.log(`${X} RULE: <UNVOICED STOP CONSONANT> {optional silence} <STOP CONSONANT> - shorten both to 1/2 + 1`);
        }
        phonemeLength[X]         = (phonemeLength[X] >> 1) + 1;
        phonemeLength[loopIndex] = (phonemeLength[loopIndex] >> 1) + 1;
      }
    } else if ((flags[index] & FLAG_LIQUIC) !== 0) { // liquic consonant?
      // RULE: <VOICED NON-VOWEL> <DIPTHONG>
      //       Decrease <DIPTHONG> by 2
      index = phonemeindex[X-1]; // prior phoneme;

      // FIXME: The debug code here breaks the rule.
      // FIXME: changed with braces by CS, check if it is correct.
      // prior phoneme a stop consonant>
      if((flags[index] & FLAG_STOPCONS) !== 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`${X} PRE phoneme ${String.fromCharCode(signInputTable1[phonemeindex[X]], signInputTable2[phonemeindex[X]])} length ${phonemeLength[X]}`);
          console.log(`${X} <LIQUID CONSONANT> <DIPTHONG> - decrease by 2`);
        }
        phonemeLength[X] -= 2; // 20ms
        if (process.env.NODE_ENV === 'development') {
          console.log(`${X} POST phoneme ${String.fromCharCode(signInputTable1[phonemeindex[X]], signInputTable2[phonemeindex[X]])} length ${phonemeLength[X]}`);
        }
      }
    }

    ++loopIndex;
  }
}

/**
 *
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.stress
 *
 * @return undefined
 */
function Code41240({phonemeindex, phonemeLength, stress}) {
  let pos = -1;
  let index;
  while (((index = phonemeindex[++pos]) !== END) && (pos < phonemeindex.length)) {
    index = phonemeindex[pos];
    if ((flags[index] & FLAG_STOPCONS) === 0) { continue; }
    if ((flags[index] & FLAG_UNVOICED_STOPCONS) === 0) {
      Insert({phonemeindex, phonemeLength, stress}, pos+1, index+1, phonemeLengthTable[index+1], stress[pos]);
      Insert({phonemeindex, phonemeLength, stress}, pos+2, index+2, phonemeLengthTable[index+2], stress[pos]);
      pos += 2;
      continue;
    }
    let X = pos;
    let A;
    do { A = phonemeindex[++X]; } while ((A === 0) && (A < phonemeindex.length));

    if (A !== 255) {
      if ((flags[A] & FLAG_0008) !== 0) { continue; }
      if ((A === 36) || (A === 37)) { continue; } // '/H' '/X'
    }
    Insert({phonemeindex, phonemeLength, stress}, pos+1, index+1, phonemeLengthTable[index+1], stress[pos]);
    Insert({phonemeindex, phonemeLength, stress}, pos+2, index+2, phonemeLengthTable[index+2], stress[pos]);
    pos += 2;
  }
}

/**
 *
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.phonemeLength
 * @param {Uint8Array} data.stress
 *
 * @return undefined
 */
function InsertBreath({phonemeindex, phonemeLength, stress}) {
  let pausePos = 255;
  let len = 0; // mem55
  let phoneme; //variable Y
  let pos = 0; // mem66

  while(((phoneme = phonemeindex[pos]) !== END) && (pos<phonemeindex.length)) {
    //pos48440:
    phoneme = phonemeindex[pos];
    len += phonemeLength[pos];
    if (len < 232)
    {
      if (phoneme !== 254) // ML : Prevents an index out of bounds problem
      {
        // console.log("%s: flags2[%s] == %s&1 == %s\n", pos, phoneme, flags[phoneme], (flags[phoneme]&FLAG_DIPTHONG));
        if((flags[phoneme]&FLAG_PUNCT) !== 0)
        {
          len = 0;
          Insert({phonemeindex, phonemeLength, stress}, pos + 1, BREAK, 0, 0);
          pos += 2;
          continue;
        }
      }
      if (phoneme === 0) { pausePos = pos; }
      pos++;
      continue;
    }
    phonemeindex[pausePos] = 31;   // 'Q*' glottal stop
    phonemeLength[pausePos] = 4;
    stress[pausePos] = 0;
    len = 0;
    Insert({phonemeindex, phonemeLength, stress}, pausePos + 1, BREAK, 0, 0);
    pos = pausePos + 2;
  }
}

/**
 * Parsed speech data.
 * @typedef {Object} ParsedSpeechData
 * @property {Uint8Array} stress
 * @property {Uint8Array} phonemeLength
 * @property {Uint8Array} phonemeindex
 */

/**
 * Parses speech data.
 *
 * @param {string} _input
 *
 * @return {ParsedSpeechData|Boolean} The parsed data.
 */
export default function Parser (_input) {
  const input = text2Uint8Array(_input + String.fromCharCode(0x9b));

  const result = {
    stress : new Uint8Array(256), //numbers from 0 to 8
    phonemeLength: new Uint8Array(256), //tab40160
    phonemeindex: new Uint8Array(256)
  };

  result.phonemeindex[255] = 32; //to prevent buffer overflow

  if (!Parser1(input, result)) {
    return false;
  }
  if (process.env.NODE_ENV === 'development') {
    PrintPhonemes(result);
  }

  Parser2(result);
  CopyStress(result);
  SetPhonemeLength(result);
  AdjustLengths(result);
  Code41240(result);

  for (let i = 0;i<result.phonemeindex.length;i++) {
    if (result.phonemeindex[i] > 80) {
      result.phonemeindex[i] = END;
      break; // error: delete all behind it
    }
  }

  InsertBreath(result);

  if (process.env.NODE_ENV === 'development') {
    PrintPhonemes(result);
  }

  return result;
}

/**
 * Debug printing.
 *
 * @param {object}     data The data to populate.
 * @param {Uint8Array} data.phonemeindex
 * @param {Uint8Array} data.phonemeLength
 * @param {Uint8Array} data.stress
 *
 * @return undefined
 */
function PrintPhonemes ({phonemeindex, phonemeLength, stress}) {
  function pad(num) {
    let s = '000' + num;
    return s.substr(s.length - 3);
  }

  let i = 0;
  console.log('==================================');
  console.log('Internal Phoneme presentation:');
  console.log(' pos  idx  phoneme  length  stress');
  console.log('----------------------------------');

  while((phonemeindex[i] !== 255) && (i < 255))
  {
    const name = (phoneme) => {
      if (phonemeindex[i] < 81) {
        return String.fromCharCode(signInputTable1[phonemeindex[i]], signInputTable2[phonemeindex[i]]);
      }
      if (phoneme === BREAK) {
        return '  ';
      }
      return '??'
    };
    console.log(
      ' %s  %s  %s       %s     %s',
      pad(i),
      pad(phonemeindex[i]),
      name(phonemeindex[i]),
      pad(phonemeLength[i]),
      pad(stress[i])
    );
    i++;
  }
  console.log('==================================');
}
