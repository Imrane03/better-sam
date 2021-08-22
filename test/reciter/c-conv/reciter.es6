// This is the "plain" conversion of the C reciter to javascript.
// We use it as "reference" implementation to test against.
// So: c-conv reciter is always correct - as it behaves as plain SAM.
// The unit tests of our optimized reciter should match the output against
// this implementation and only pass if they are same.

'use strict';
import * as tables from './tables.es6';
import {uint8Array2Text} from '../../../src/util/util.es6';

import {
  FLAG_NUMERIC,
  FLAG_RULESET2,
  FLAG_VOICED,
  FLAG_0X08,
  FLAG_DIPTHONG,
  FLAG_CONSONANT,
  FLAG_VOWEL_OR_Y,
  FLAG_ALPHA_OR_QUOT
} from '../../../src/reciter/constants.es6'

const TABLE_PARTITION = 37541; // 92A5 === 1001 0010 1010 0101

function getRuleContent (offset) {
  let i = 1;
  let ch = 0;
  let rule = '';
  do {
    ch = GetRuleByte(offset, i);
    if ((ch & 0x7F) === 0x3D) { // 00111101 = '='
      rule += ' -> ';
    } else {
      rule += String.fromCharCode(ch & 0x7F);
    }
    i++;
  } while ((ch & FLAG_ALPHA_OR_QUOT) === 0);
  return rule;
}

function PrintRule (offset) {
  console.log(getRuleContent(offset));
}

/**
 * Global helper to retrieve a rule byte.
 *
 * @param {Number} ruleIndex
 * @param {Number} offset
 * @return Number
 */
function GetRuleByte(ruleIndex, offset) {
  let address = ruleIndex;
  if (ruleIndex >= TABLE_PARTITION) {
    address -= TABLE_PARTITION;
    if (address + offset >= tables.rules2.length) {
      throw new Error('Exceeding table rules2 with ' + (address + offset));
    }
    return tables.rules2[address+offset];
  }
  address -= 32000; // 7D00

  if (address + offset >= tables.rules.length) {
    throw new Error('Exceeding table rules with ' + (address + offset));
  }
  return tables.rules[address+offset];
}
/**
 * Parse the rule at the given offset.
 * @param offset
 * @return {{ruleStart: (number), openBrace: (number), closingBrace: (number), equalSignInRule: (number)}}
 */
const parseRule = (offset) => {
  let mem66_openBrace, mem65_closingBrace, mem64_equalSignInRule;
  // find next rule
  do {
    offset++;
  } while ((GetRuleByte(offset, 0) & 0x80) === 0);

  let Y = 1;
  //pos36720:
  // find '('
  while (1) {
    if (GetRuleByte(offset, Y) === 40) // '('
      break;
    Y++;
  }
  // position of '('
  mem66_openBrace = Y;

  //pos36732:
  // find ')'
  do {
    Y++;
  } while (GetRuleByte(offset, Y) !== 41); // ')'
  // position of ')'
  mem65_closingBrace = Y;

  //pos36741:
  // find '='
  do {
    Y++;
  } while ((GetRuleByte(offset, Y) & 0x7F) !== 61); // '='
  mem64_equalSignInRule = Y;

  return {
    ruleStart: offset,
    openBrace: mem66_openBrace,
    closingBrace: mem65_closingBrace,
    equalSignInRule: mem64_equalSignInRule
  };
};

/**
 * Convert the text to a phoneme string.
 *
 * @param {string} input The input string to convert.
 *
 * @return {boolean|string}
 */
export function TextToPhonemes (input) {
  const pos36554_convertInput = () => {
    let mem61_inputPos = -1, mem56_phonemeOutpos = -1;
    while (1) {
      let currentChar = inputtemp[++mem61_inputPos];
      // End of input marker reached, all done.
      if (currentChar === 91) { // IS '['
        mem56_phonemeOutpos++;
        output[mem56_phonemeOutpos] = 155;
        return true;
      }
      // NOT '.' or '.' followed by number.
      if ((currentChar !== 46)
        || ((tables.charFlags[inputtemp[mem61_inputPos + 1]] & FLAG_NUMERIC) !== 0)) {
        //pos36607:
        const mem57_currentFlags = tables.charFlags[currentChar];
        if ((mem57_currentFlags & FLAG_RULESET2) !== 0) {
          let tmp = processRules(TABLE_PARTITION, mem61_inputPos, mem56_phonemeOutpos);
          mem61_inputPos = tmp.inputPos;
          mem56_phonemeOutpos = tmp.phonemeOutpos;
          continue;
        }
        //pos36630:
        if (mem57_currentFlags !== 0) {
          // pos36677:
          if ((mem57_currentFlags & FLAG_ALPHA_OR_QUOT) === 0) {
            //36683: BRK
            return false;
          }
          // go to the right rules for this character.
          const X = currentChar - 65; // 'A'
          let tmp = processRules(tables.tab37489[X] | (tables.tab37515[X] << 8), mem61_inputPos, mem56_phonemeOutpos);
          mem61_inputPos = tmp.inputPos;
          mem56_phonemeOutpos = tmp.phonemeOutpos;
          continue;
        }
        // FIXME: is this really needed?
        inputtemp[mem61_inputPos] = 32/*' '*/;
        mem56_phonemeOutpos++;
        output[mem56_phonemeOutpos] = 32;
        continue;
      }
      mem56_phonemeOutpos++;
      output[mem56_phonemeOutpos] = 46/*'.'*/;
    } //while
  };

  /**
   * @param {Number} outpos
   * @param {Number} ruleTablePos
   * @param {Number} rulePos
   * @return {Number}
   */
  const applyRule = (outpos, ruleTablePos, rulePos) => {
    if (process.env.NODE_ENV === 'development') {
      PrintRule(ruleTablePos);
    }
    // pos37461:
    while (1) {
      const ruleByte = GetRuleByte(ruleTablePos, rulePos);
      if ((ruleByte & 127) !== 61) // '='
      {
        outpos++;
        output[outpos] = (ruleByte & 127);
      }
      //37478: BIT 57
      //37480: BPL 37485  //not negative flag
      if ((ruleByte & 128) !== 0) { //???
        break;
      }
      // pos37485:
      rulePos++;
    }

    return outpos;
  };

  /**
   * Match the rule.
   *
   * @param {Number} tablePos
   * @param {Number} mem66_openBrace
   * @param {Number} mem65_closingBrace
   * @param {Number} mem64_equalSignInRule
   * @param {Number} inputPos
   */
  const matchRule = (tablePos, mem66_openBrace, mem65_closingBrace, mem64_equalSignInRule, inputPos) => {
    let mem60_inputMatchPos = inputPos;
    // compare the string within the bracket
    let Y = mem66_openBrace;
    Y++;
    let X = inputPos;
    //pos36759:
    while (1) {
      // char does not match => rule does not match.
      if (GetRuleByte(tablePos, Y) !== inputtemp[X])
        return false;
      Y++;
      if (Y === mem65_closingBrace)
        break;
      X++;
      mem60_inputMatchPos = X;
    }

    // the string in the bracket is correct
    return pos36791_checkPrefix(inputPos, tablePos, mem66_openBrace)
    && pos37184_checkRuleSuffix(mem60_inputMatchPos, tablePos, mem65_closingBrace, mem64_equalSignInRule)
      ? mem60_inputMatchPos
      : false;
  };

  /**
   *
   * @param tableStart
   * @param mem61_inputPos
   * @param mem56_phonemeOutpos
   * @return {{inputPos: boolean, phonemeOutpos: Number}}
   */
  const processRules = (tableStart, mem61_inputPos, mem56_phonemeOutpos) => {

    let rule = {ruleStart: tableStart};
    let tmp = false;
    do {
      rule = parseRule(rule.ruleStart);
    } while ((tmp = matchRule(rule.ruleStart, rule.openBrace, rule.closingBrace, rule.equalSignInRule, mem61_inputPos)) === false);

    return {
      inputPos: tmp,
      phonemeOutpos: applyRule(mem56_phonemeOutpos, rule.ruleStart, rule.equalSignInRule)
    };
  };

  /**
   *
   * @param {Number} inputPos
   * @param {Number} ruleTablePos
   * @param {Number} rulePos
   * @return {boolean}
   */
  const pos36791_checkPrefix = (inputPos, ruleTablePos, rulePos) => {
    let mem57_RuleByte;
    while(1) {
      rulePos--;
      mem57_RuleByte = GetRuleByte(ruleTablePos, rulePos);
      if ((mem57_RuleByte & 128) !== 0) {
        return true;
      }
      if ((tables.charFlags[mem57_RuleByte & 127] & FLAG_ALPHA_OR_QUOT) === 0) {
        switch (mem57_RuleByte) {
          // ' ' - previous char must not be alpha or quotation mark.
          case 32: {
            if ((tables.charFlags[inputtemp[--inputPos]] & FLAG_ALPHA_OR_QUOT) !== 0)
              return false;
            continue;
          }
          // '#' - previous char must be a vowel or Y.
          case 35: {
            if ((tables.charFlags[inputtemp[--inputPos]] & FLAG_VOWEL_OR_Y) === 0)
              return false;
            continue;
          }
          // '.' - unknown?
          case 46: {
            if((tables.charFlags[inputtemp[--inputPos]] & FLAG_0X08) === 0)
              return false;
            continue;
          }
          // '&' - previous char must be a dipthong or previous chars must be 'CH' or 'SH'
          case 38: {
            let inputChar = inputtemp[--inputPos];
            if((tables.charFlags[inputChar] & FLAG_DIPTHONG) !== 0) {
              continue;
            }
            // 'H'
            if (inputChar !== 72)
              return false;
            inputChar = inputtemp[--inputPos];
            if ((inputChar === 67) || (inputChar === 83)) { // 'C' 'S'
              continue;
            }
            return false;
          }
          // '@' - previous char must be voiced and not 'H'.
          case 64: {
            const inputChar = inputtemp[--inputPos];
            if((tables.charFlags[inputChar] & FLAG_VOICED) !== 0) {
              continue;
            }
            // 'H'
            if (inputChar !== 72)
              return false;
            // FIXME: this is always true?!? is there a "--inputPos" missing in original code?
            // Check for 'T', 'C', 'S'
            if ((inputChar !== 84) && (inputChar !== 67) && (inputChar !== 83)) {
              return false;
            }
            if (process.env.NODE_ENV === 'development') {
              throw new Error('Is always false but happened? ' + inputChar);
            }
            continue;
          }
          // '^' - previous char must be a consonant.
          case 94: {
            const inputChar = inputtemp[--inputPos];
            if((tables.charFlags[inputChar] & FLAG_CONSONANT) === 0)
              return false;
            continue;
          }
          // '+' - previous char must be either 'E', 'I' or 'Y'.
          case 43: {
            const inputChar = inputtemp[--inputPos];
            if ((inputChar === 69/*'E'*/) || (inputChar === 73/*'I'*/) || (inputChar === 89/*'Y'*/)) {
              continue;
            }
            return false;
          }
          // ':' - walk left in input position until we hit a non consonant.
          case 58: {
            while (inputPos >= 0) {
              const inputChar = inputtemp[inputPos - 1];
              if ((tables.charFlags[inputChar] & FLAG_CONSONANT) === 0)
                break;
              inputPos--;
            }
            continue;
          }
          // All other is error!
          default:
            if (process.env.NODE_ENV === 'development') {
              throw new Error(
                `Parse error in rule "${getRuleContent(ruleTablePos)}" at ${rulePos}`
              );
            }
            throw new Error();
        }
      }
      if (inputtemp[--inputPos] !== mem57_RuleByte)
        return false;
    }
  };

  /**
   *
   * @param {Number} inputPos
   * @param {Number} ruleTablePos
   * @param {Number} rulePos
   * @param {Number} ruleEnd
   * @return {boolean}
   */
  const pos37184_checkRuleSuffix = (inputPos, ruleTablePos, rulePos, ruleEnd) => {
    while (1) {
      // End of rule hit => rule matches.
      if (rulePos + 1 === ruleEnd)
        return true;
      rulePos++;
      let mem57_ruleByte = GetRuleByte(ruleTablePos, rulePos);
      // do we have to handle the byte specially?
      if ((tables.charFlags[mem57_ruleByte] & FLAG_ALPHA_OR_QUOT) === 0) {
        // pos37226:
        switch (mem57_ruleByte) {
          // ' ' - next char must not be alpha or quotation mark.
          case 32: {
            if ((tables.charFlags[inputtemp[++inputPos]] & FLAG_ALPHA_OR_QUOT) !== 0)
              return false;
            continue;
          }
          // '#' - next char must be a vowel or Y.
          case 35: {
            if ((tables.charFlags[inputtemp[++inputPos]] & FLAG_VOWEL_OR_Y) === 0) {
              return false;
            }
            continue;
          }
          // '.' - unknown?
          case 46: {
            if ((tables.charFlags[inputtemp[++inputPos]] & FLAG_0X08) === 0)
              return false;
            continue;
          }
          // '&' - next char must be a dipthong or next chars must be 'HC' or 'HS'
          case 38: {
            if((tables.charFlags[inputtemp[++inputPos]] & FLAG_DIPTHONG) !== 0) {
              continue;
            }
            if (inputtemp[inputPos] !== 72) // NOT 'H'
              return false;
            ++inputPos;
            if ((inputtemp[inputPos] === 67) || (inputtemp[inputPos] === 83)) { // 'C' OR 'S'
              continue;
            }
            return false;
          }
          // '@' - next char must be voiced and not 'H'.
          case 64: {
            if ((tables.charFlags[inputtemp[++inputPos]] & FLAG_VOICED) !== 0) {
              continue;
            }
            const inputChar = inputtemp[inputPos];
            if (inputChar !== 72) // 'H'
              return false;
            // Check for 'T', 'C', 'S'
            if ((inputChar !== 84) && (inputChar !== 67) && (inputChar !== 83))
              return false;
            // FIXME: This is illogical and can never be reached. Bug in orig. code? reciter.c:489 (pos37367)
            if (process.env.NODE_ENV === 'development') {
              throw new Error('This should not be possible ', inputChar);
            }
            continue;
          }
          // '^' - next char must be a consonant.
          case 94: {
            if((tables.charFlags[inputtemp[++inputPos]] & FLAG_CONSONANT) === 0)
              return false;
            continue;
          }
          // '+' - next char must be either 'E', 'I' or 'Y'.
          case 43: {
              const inputChar = inputtemp[++inputPos];
              if ((inputChar === 69) || (inputChar === 73) || (inputChar === 89)) { // EITHER 'E', 'I' OR 'Y'
                continue;
              }
              return false;
            }
            // ':' - walk right in input position until we hit a non consonant.
          case 58: {
            while ((tables.charFlags[inputtemp[inputPos + 1]] & FLAG_CONSONANT) !== 0) {
              inputPos++;
            }
            continue;
          }
          /* '%' - check if we have:
            - 'ING'
            - 'E' not followed by alpha or quot
            - 'ER' 'ES' or 'ED'
            - 'EFUL'
            - 'ELY'
          */
          case 37: {
            // If not 'E', check if 'ING'.
            if (inputtemp[inputPos + 1] !== 69) {
              // Are next chars "ING"?
              if ((inputtemp[inputPos + 1] === 73)
                && (inputtemp[inputPos + 2] === 78)
                && (inputtemp[inputPos + 3] === 71)) {
                inputPos += 3;
                continue;
              }
              return false;
            }
            // we have 'E' - check if not followed by alpha or quot.
            if((tables.charFlags[inputtemp[inputPos + 2]] & FLAG_ALPHA_OR_QUOT) === 0) {
              inputPos++;
              continue;
            }
            // NOT 'ER', 'ES' OR 'ED'
            if ((inputtemp[inputPos + 2] !== 83)
              && (inputtemp[inputPos + 2] !== 68)
              && (inputtemp[inputPos + 2] !== 82)
            ) {
              // NOT 'EL'
              if (inputtemp[inputPos + 2] !== 76) {
                // 'EFUL'
                if ((inputtemp[inputPos + 2] === 70)
                  && (inputtemp[inputPos + 3] === 85)
                  && (inputtemp[inputPos + 4] === 76)) { // 'FUL'
                  inputPos += 4;
                  continue;
                }
                return false;
              }
              // NOT 'ELY'
              if (inputtemp[inputPos + 3] !== 89)
                return false;
              inputPos += 3;
              continue;
            }
            inputPos += 2;
            continue;
          }
          // All other is error!
          default:
            if (process.env.NODE_ENV === 'development') {
              throw new Error(
                `Parse error in rule "${getRuleContent(ruleTablePos)}" at ${rulePos}`
              );
            }
            throw new Error();
        }
      }
      // Rule char does not match.
      if (inputtemp[++inputPos] !== mem57_ruleByte) {
        return false;
      }
    }
    return false;
  };

  // Processing starts here.

  input += '[';
  const output = new Uint8Array(256);
  let inputtemp = new Uint8Array(256);
  {
    // secure copy of input
    // because input will be overwritten by phonemes
    let tmpX = 0;
    inputtemp[0] = 32; // ' '
    do {
      output[tmpX] = input.charCodeAt(tmpX);
      let tmp = output[tmpX] & 0x7F;
      if (tmp >= 0x70) {
        tmp = tmp & 0x5F;
      } else if (tmp >= 0x60) {
        tmp = tmp & 0x4F;
      }
      inputtemp[++tmpX] = tmp;
    } while (tmpX < 255);
    inputtemp[255] = 27;
  }

  if (pos36554_convertInput()) {
    for (let pos=0;pos<255;pos++) {
      if ((output[pos] & 128) !== 0) {
        return uint8Array2Text(output.subarray(0, pos));
      }
    }
    if (process.env.NODE_ENV === 'development') {
      throw new Error('No end marker?!');
    }
  }

  return false;
}

export default TextToPhonemes;
