import {BREAK, END} from '../common/constants.es6'
import {PhonemeNameTable} from './tables.es6';
import Parser1 from './parse1.es6';
import Parser2 from './parse2.es6';
import AdjustLengths from './adjust-lengths.es6';
import CopyStress from './copy-stress.es6';
import SetPhonemeLength from './set-phoneme-length.es6';
import InsertBreath from './insert-breath.es6';
import ProlongPlosiveStopConsonantsCode41240 from './prolong-plosive-stop-consonants.es6';

/**
 * Parses speech data.
 *
 * Returns array of [phoneme, length, stress]
 *
 * @param {string} input
 *
 * @return {Array|Boolean} The parsed data.
 */
export default function Parser (input) {
  if (!input) {
    return false;
  }
  const getPhoneme = (pos) => {
    if (process.env.NODE_ENV === 'development') {
      if (pos < 0 || pos > phonemeindex.length) {
        throw new Error('Out of bounds: ' + pos)
      }
    }
    return (pos === phonemeindex.length - 1) ? END : phonemeindex[pos]
  };
  const setPhoneme = (pos, value) => {
    if (process.env.DEBUG_SAM === true) {
      console.log(`${pos} CHANGE: ${PhonemeNameTable[phonemeindex[pos]]} -> ${PhonemeNameTable[value]}`);
    }
    phonemeindex[pos]  = value;
  };

  /**
   * @param {Number} pos         The position in the phoneme array to insert at.
   * @param {Number} value       The phoneme to insert.
   * @param {Number} stressValue The stress.
   * @param {Number} [length]    The (optional) phoneme length, if not given, length will be 0.
   *
   * @return {undefined}
   */
  const insertPhoneme = (pos, value, stressValue, length) => {
    if (process.env.DEBUG_SAM === true) {
      console.log(`${pos} INSERT: ${PhonemeNameTable[value]}`);
    }
    for(let i = phonemeindex.length - 1; i >= pos; i--) {
      phonemeindex[i+1]  = phonemeindex[i];
      phonemeLength[i+1] = getLength(i);
      stress[i+1]        = getStress(i);
    }
    phonemeindex[pos]  = value;
    phonemeLength[pos] = length | 0;
    stress[pos]        = stressValue;
  };
  const getStress = (pos) => stress[pos] | 0;
  const setStress = (pos, stressValue) => {
    if (process.env.DEBUG_SAM === true) {
      console.log(
        `${pos} "${PhonemeNameTable[phonemeindex[pos]]}" SET STRESS: ${stress[pos]} -> ${stressValue}`
      );
    }
    stress[pos] = stressValue;
  };
  const getLength = (pos) => phonemeLength[pos] | 0;
  const setLength = (pos, length) => {
    if (process.env.DEBUG_SAM === true) {
      console.log(
        `${pos} "${PhonemeNameTable[phonemeindex[pos]]}" SET LENGTH: ${phonemeLength[pos]} -> ${length}`
      );
      if ((length & 128) !== 0) {
        throw new Error('Got the flag 0x80, see CopyStress() and SetPhonemeLength() comments!');
      }
      if (pos<0 || pos>phonemeindex.length) {
        throw new Error('Out of bounds: ' + pos)
      }
    }
    phonemeLength[pos] = length;
  };

  const stress = []; //numbers from 0 to 8
  const phonemeLength = [];
  const phonemeindex = [];

  let pos = 0;
  Parser1(
    input,
    (value) => {
      stress[pos] = 0;
      phonemeLength[pos] = 0;
      phonemeindex[pos++] = value;
    },
    (value) => {
      if (process.env.DEBUG_SAM === true) {
        if ((value & 128) !== 0) {
          throw new Error('Got the flag 0x80, see CopyStress() and SetPhonemeLength() comments!');
        }
      }
      stress[pos - 1] = value; /* Set stress for prior phoneme */
    }
  );
  phonemeindex[pos] = END;

  if (process.env.DEBUG_SAM === true) {
    PrintPhonemes(phonemeindex, phonemeLength, stress);
  }
  Parser2(insertPhoneme, setPhoneme, getPhoneme, getStress);
  CopyStress(getPhoneme, getStress, setStress);
  SetPhonemeLength(getPhoneme, getStress, setLength);
  AdjustLengths(getPhoneme, setLength, getLength);
  ProlongPlosiveStopConsonantsCode41240(getPhoneme, insertPhoneme, getStress);

  for (let i = 0;i<phonemeindex.length;i++) {
    if (phonemeindex[i] > 80) {
      phonemeindex[i] = END;
      // FIXME: When will this ever be anything else than END?
      break; // error: delete all behind it
    }
  }

  InsertBreath(getPhoneme, setPhoneme, insertPhoneme, getStress, getLength, setLength);

  if (process.env.DEBUG_SAM === true) {
    PrintPhonemes(phonemeindex, phonemeLength, stress);
  }

  return phonemeindex.map((v, i) => [v, phonemeLength[i] | 0, stress[i] | 0]);
}

/**
 * Debug printing.
 *
 * @param {Array} phonemeindex
 * @param {Array} phonemeLength
 * @param {Array} stress
 *
 * @return undefined
 */
function PrintPhonemes (phonemeindex, phonemeLength, stress) {
  function pad(num) {
    let s = '000' + num;
    return s.substr(s.length - 3);
  }

  console.log('==================================');
  console.log('Internal Phoneme presentation:');
  console.log(' pos  idx  phoneme  length  stress');
  console.log('----------------------------------');
  for (let i=0;i<phonemeindex.length;i++) {
    const name = (phoneme) => {
      if (phonemeindex[i] < 81) {
        return PhonemeNameTable[phonemeindex[i]];
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
  }
  console.log('==================================');
}
