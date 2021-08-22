import {END} from '../common/constants.es6'
import { PhonemeNameTable } from './tables.es6';
import { phonemeHasFlag } from './util.es6';
import {
  pR,
  pD,
  pT,
  FLAG_ALVEOLAR,
  FLAG_UNVOICED_STOPCONS,
  FLAG_DIPTHONG,
  FLAG_DIP_YX,
  FLAG_VOWEL
} from './constants.es6'

/**
 * Rewrites the phonemes using the following rules:
 *
 * <DIPHTHONG ENDING WITH WX> -> <DIPHTHONG ENDING WITH WX> WX
 * <DIPHTHONG NOT ENDING WITH WX> -> <DIPHTHONG NOT ENDING WITH WX> YX
 * UL -> AX L
 * UM -> AX M
 * UN -> AX N
 * <STRESSED VOWEL> <SILENCE> <STRESSED VOWEL> -> <STRESSED VOWEL> <SILENCE> Q <VOWEL>
 * T R -> CH R
 * D R -> J R
 * <VOWEL> R -> <VOWEL> RX
 * <VOWEL> L -> <VOWEL> LX
 * G S -> G Z
 * K <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
 * G <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
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
 * @param {insertPhoneme}    insertPhoneme
 * @param {setPhoneme}       setPhoneme
 * @param {getPhoneme}       getPhoneme
 * @param {getPhonemeStress} getStress
 *
 * @return undefined
 */
export default function Parser2(insertPhoneme, setPhoneme, getPhoneme, getStress) {
  /**
   * Rewrites:
   *  'UW' => 'UX' if alveolar flag set on previous phoneme.
   *  'CH' => 'CH' '**'(43)
   *  'J*' => 'J*' '**'(45)
   * @param phoneme
   * @param pos
   */
  const handleUW_CH_J = (phoneme, pos) => {
    switch (phoneme) {
      // 'UW' Example: NEW, DEW, SUE, ZOO, THOO, TOO
      case 53: {
        // ALVEOLAR flag set?
        if (phonemeHasFlag(getPhoneme(pos - 1), FLAG_ALVEOLAR)) {
          if (process.env.DEBUG_SAM === true) { console.log(`${pos} RULE: <ALVEOLAR> UW -> <ALVEOLAR> UX`); }
          setPhoneme(pos, 16); // UX
        }
        break;
      }
      // 'CH' Example: CHEW
      case 42: {
        if (process.env.DEBUG_SAM === true) { console.log(`${pos} RULE: CH -> CH CH+1`); }
        insertPhoneme(pos + 1, 43, getStress(pos)); // '**'
        break;
      }
      // 'J*' Example: JAY
      case 44: {
        if (process.env.DEBUG_SAM === true) { console.log(`${pos} RULE: J -> J J+1`); }
        insertPhoneme(pos + 1, 45, getStress(pos)); // '**'
        break;
      }
    }
  };

  const changeAX = (position, suffix) => {
    if (process.env.DEBUG_SAM === true) {
      console.log(`${position} RULE: ${PhonemeNameTable[getPhoneme(position)]} -> AX ${PhonemeNameTable[suffix]}`);
    }
    setPhoneme(position, 13); // 'AX'
    insertPhoneme(position + 1, suffix, getStress(position));
  };

  let pos = -1;
  let phoneme;

  while((phoneme = getPhoneme(++pos)) !== END) {
    // Is phoneme pause?
    if (phoneme === 0) {
      continue;
    }

    if (phonemeHasFlag(phoneme, FLAG_DIPTHONG)) {
      // <DIPHTHONG ENDING WITH WX> -> <DIPHTHONG ENDING WITH WX> WX
      // <DIPHTHONG NOT ENDING WITH WX> -> <DIPHTHONG NOT ENDING WITH WX> YX
      // Example: OIL, COW
      if (process.env.DEBUG_SAM === true) {
        console.log(
          !phonemeHasFlag(phoneme, FLAG_DIP_YX)
            ? `${pos} RULE: insert WX following diphthong NOT ending in IY sound`
            : `${pos} RULE: insert YX following diphthong ending in IY sound`
        );
      }
      // If ends with IY, use YX, else use WX
      // Insert at WX or YX following, copying the stress
      // 'WX' = 20 'YX' = 21
      insertPhoneme(pos + 1, phonemeHasFlag(phoneme, FLAG_DIP_YX) ? 21 : 20, getStress(pos));
      handleUW_CH_J(phoneme, pos);
      continue;
    }
    if (phoneme === 78) {
      // 'UL' => 'AX' 'L*'
      // Example: MEDDLE
      changeAX(pos, 24);
      continue;
    }
    if (phoneme === 79) {
      // 'UM' => 'AX' 'M*'
      // Example: ASTRONOMY
      changeAX(pos, 27);
      continue;
    }
    if (phoneme === 80) {
      // 'UN' => 'AX' 'N*'
      changeAX(pos, 28);
      continue;
    }
    if (phonemeHasFlag(phoneme, FLAG_VOWEL) && getStress(pos)) {
      // Example: FUNCTION
      // RULE:
      //       <STRESSED VOWEL> <SILENCE> <STRESSED VOWEL> -> <STRESSED VOWEL> <SILENCE> Q <VOWEL>
      // EXAMPLE: AWAY EIGHT
      if (!getPhoneme(pos+1)) { // If following phoneme is a pause, get next
        phoneme = getPhoneme(pos+2);
        if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_VOWEL) && getStress(pos+2)) {
          if (process.env.DEBUG_SAM === true) {
            console.log(`${pos+2} RULE: Insert glottal stop between two stressed vowels with space between them`);
          }
          insertPhoneme(pos+2, 31, 0); // 31 = 'Q'
        }
      }
      continue;
    }

    let priorPhoneme = (pos === 0) ? END : getPhoneme(pos - 1);

    if (phoneme === pR) {
      // RULES FOR PHONEMES BEFORE R
      switch (priorPhoneme) {
        case pT: {
          // Example: TRACK
          if (process.env.DEBUG_SAM === true) { console.log(`${pos} RULE: T* R* -> CH R*`); }
          setPhoneme(pos - 1, 42); // 'T*' 'R*' -> 'CH' 'R*'
          break;
        }
        case pD: {
          // Example: DRY
          if (process.env.DEBUG_SAM === true) { console.log(`${pos} RULE: D* R* -> J* R*`); }
          setPhoneme(pos - 1, 44); // 'J*'
          break;
        }
        default: {
          if (phonemeHasFlag(priorPhoneme, FLAG_VOWEL)) {
            // Example: ART
            if (process.env.DEBUG_SAM === true) { console.log(`${pos} <VOWEL> R* -> <VOWEL> RX`); }
            setPhoneme(pos, 18); // 'RX'
          }
        }
      }
      continue;
    }

    // 'L*'
    if ((phoneme === 24) && phonemeHasFlag(priorPhoneme, FLAG_VOWEL)) {
      // Example: ALL
      if (process.env.DEBUG_SAM === true) { console.log(`${pos} <VOWEL> L* -> <VOWEL> LX`); }
      setPhoneme(pos, 19); // 'LX'
      continue;
    }
    // 'G*' 'S*'
    if (priorPhoneme === 60 && phoneme === 32) {
      // Can't get to fire -
      //       1. The G -> GX rule intervenes
      //       2. Reciter already replaces GS -> GZ
      if (process.env.DEBUG_SAM === true) { console.log(`${pos} G S -> G Z`); }
      setPhoneme(pos, 38);
      continue;
    }

    // 'G*'
    if (phoneme === 60) {
      // G <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
      // Example: GO
      let phoneme = getPhoneme(pos + 1);
      // If diphthong ending with YX, move continue processing next phoneme
      if (!phonemeHasFlag(phoneme, FLAG_DIP_YX) && (phoneme !== END)) {
        // replace G with GX and continue processing next phoneme
        if (process.env.DEBUG_SAM === true) {
          console.log(
            `${pos} RULE: G <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPTHONG NOT ENDING WITH IY>`
          );
        }
        setPhoneme(pos, 63); // 'GX'
      }
      continue;
    }

    // 'K*'
    if (phoneme === 72) {
      // K <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
      // Example: COW
      let Y = getPhoneme(pos + 1);
      // If at end, replace current phoneme with KX
      if (!phonemeHasFlag(Y, FLAG_DIP_YX) || Y === END) {
        // VOWELS AND DIPHTHONGS ENDING WITH IY SOUND flag set?
        if (process.env.DEBUG_SAM === true) {
          console.log(`${pos} K <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPTHONG NOT ENDING WITH IY>`);
        }
        setPhoneme(pos, 75);
        phoneme  = 75;
      }
    }

    // Replace with softer version?
    if (phonemeHasFlag(phoneme, FLAG_UNVOICED_STOPCONS) && (priorPhoneme === 32)) { // 'S*'
      // RULE:
      //   'S*' 'P*' -> 'S*' 'B*'
      //   'S*' 'T*' -> 'S*' 'D*'
      //   'S*' 'K*' -> 'S*' 'G*'
      //   'S*' 'KX' -> 'S*' 'GX'
      //   'S*' 'UM' -> 'S*' '**'
      //   'S*' 'UN' -> 'S*' '**'
      // Examples: SPY, STY, SKY, SCOWL
      if (process.env.DEBUG_SAM === true) {
        console.log(`${pos} RULE: S* ${PhonemeNameTable[phoneme]} -> S* ${PhonemeNameTable[phoneme-12]}`);
      }
      setPhoneme(pos, phoneme - 12);
    } else if (!phonemeHasFlag(phoneme, FLAG_UNVOICED_STOPCONS)) {
      handleUW_CH_J(phoneme, pos);
    }

    // 'T*', 'D*'
    if (phoneme === 69 || phoneme === 57) {
      // RULE: Soften T following vowel
      // NOTE: This rule fails for cases such as "ODD"
      //       <UNSTRESSED VOWEL> T <PAUSE> -> <UNSTRESSED VOWEL> DX <PAUSE>
      //       <UNSTRESSED VOWEL> D <PAUSE>  -> <UNSTRESSED VOWEL> DX <PAUSE>
      // Example: PARTY, TARDY
      if ((pos > 0) && phonemeHasFlag(getPhoneme(pos-1), FLAG_VOWEL)) {
        phoneme = getPhoneme(pos + 1);
        if (!phoneme) {
          phoneme = getPhoneme(pos + 2);
        }
        if (phonemeHasFlag(phoneme, FLAG_VOWEL) && !getStress(pos+1)) {
          if (process.env.DEBUG_SAM === true) {
            console.log(`${pos} Soften T or D following vowel or ER and preceding a pause -> DX`);
          }
          setPhoneme(pos, 30);
        }
      }
      continue;
    }

    if (process.env.DEBUG_SAM === true) {
      console.log(`${pos}: ${PhonemeNameTable[phoneme]}`);
    }
  } // while
}
