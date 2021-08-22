import * as tables from './tables.es6';

import {
  FLAG_NUMERIC,
  FLAG_RULESET2,
  FLAG_VOICED,
  FLAG_0X08,
  FLAG_DIPTHONG,
  FLAG_CONSONANT,
  FLAG_VOWEL_OR_Y,
  FLAG_ALPHA_OR_QUOT
} from './constants.es6'

/**
 * Test if the char matches against the flags in the reciter table.
 * @param {string} c
 * @param {Number} flg
 * @return {boolean}
 */
const flags = (c, flg) => {
  return (tables.charFlags[c] & flg) !== 0;
};

/**
 *
 * @param {string} text
 * @param {Number} pos
 * @param {Number} flg
 * @return {boolean}
 */
const flagsAt = (text, pos, flg) => {
  return flags(text[pos], flg);
};
/**
 *
 * @param {string} c
 * @param {Array} list
 *
 * @return {boolean}
 */
const isOneOf = (c, list) => {
  return list.indexOf(c) !== -1;
};

/**
 * Set a phoneme in the buffer.
 *
 * @callback successCallback
 *
 * @param {string} append    The string to append.
 * @param {Number} inputSkip The amount or chars to move ahead in the input.
 */

/**
 * Generator for self processing rule instances.
 * @param {String} ruleString 'xxx(yyy)zzz=foobar' 'xxx(yyy)zzz' is the source value, 'foobar' is the destination value.
 * @return {result}
 */
function reciterRule (ruleString) {
  const splitted = ruleString.split('=');
  const
    // Must pop and join here because of rule for '=' itself.
    target = splitted.pop(),
    source = splitted.join('=').split('('),
    tmp=source.pop().split(')'),
    pre = source[0],
    match = tmp[0],
    post = tmp[1]
  ;

  const TCS = ['T', 'C', 'S'];
  const EIY = ['E', 'I', 'Y'];

  /**
   * Test if the rule prefix matches.
   * @param {string} text The input text.
   * @param {Number} pos  The input position we are working from.
   * @return {boolean}
   */
  const checkPrefix = (text, pos) => {
    for (let rulePos = pre.length - 1; rulePos>-1;rulePos--) {
      const ruleByte = pre[rulePos];
      if (!flags(ruleByte, FLAG_ALPHA_OR_QUOT)) {
        if (!{
          // '' - previous char must not be alpha or quotation mark.
          ' ': () => !flagsAt(text, --pos, FLAG_ALPHA_OR_QUOT),
          // '#' - previous char must be a vowel or Y.
          '#': () => flagsAt(text, --pos, FLAG_VOWEL_OR_Y),
          // '.' - unknown?
          '.': () => flagsAt(text, --pos, FLAG_0X08),
          // '&' - previous char must be a dipthong or previous chars must be 'CH' or 'SH'
          '&': () => (flagsAt(text, --pos, FLAG_DIPTHONG)) || (isOneOf(text.substr(--pos, 2), ['CH', 'SH'])),
          // '@' - previous char must be voiced and not 'H'.
          '@': () => {
            if (flagsAt(text, --pos, FLAG_VOICED)) {
              return true;
            }
            const inputChar = text[pos];
            // 'H'
            if (inputChar !== 'H')
              return false;
            // FIXME: this is always true?!? is there a "--pos" missing in original code?
            // Check for 'T', 'C', 'S'
            if (!isOneOf(inputChar, TCS)) {
              return false;
            }
            if (process.env.NODE_ENV === 'development') {
              throw new Error('Is always false but happened? ' + inputChar);
            }
            return true;
          },
          // '^' - previous char must be a consonant.
          '^': () => flagsAt(text, --pos, FLAG_CONSONANT),
          // '+' - previous char must be either 'E', 'I' or 'Y'.
          '+': () => isOneOf(text[--pos], EIY),
          // ':' - walk left in input position until we hit a non consonant or begin of string.
          ':': () => {
            while (pos >= 0) {
              if (!flagsAt(text, pos - 1, FLAG_CONSONANT))
                break;
              pos--;
            }
            return true;
          }
        }[ruleByte]()) {
          return false;
        }
      }
      // Rule char does not match.
      else if (text[--pos] !== ruleByte) {
        return false;
      }
    }
    return true;
  };

  /**
   * Test if the rule suffix matches.
   * @param {string} text The input text.
   * @param {Number} pos  The input position we are working from.
   * @return {boolean}
   */
  const checkSuffix = (text, pos) => {
    for (let rulePos = 0; rulePos<post.length;rulePos++) {
      const ruleByte = post[rulePos];
      // do we have to handle the byte specially?
      if (!flags(ruleByte, FLAG_ALPHA_OR_QUOT)) {
        // pos37226:
        if (!{
          // ' ' - next char must not be alpha or quotation mark.
          ' ': () => !flagsAt(text, ++pos, FLAG_ALPHA_OR_QUOT),
          // '#' - next char must be a vowel or Y.
          '#': () => flagsAt(text, ++pos, FLAG_VOWEL_OR_Y),
          // '.' - unknown?
          '.': () => flagsAt(text, ++pos, FLAG_0X08),
          // '&' - next char must be a dipthong or next chars must be 'HC' or 'HS'
          '&': () => flagsAt(text, ++pos, FLAG_DIPTHONG) || isOneOf(text.substr((++pos) - 2, 2), ['HC', 'HS']),
          // '@' - next char must be voiced and not 'H'.
          '@': () => {
            if (flagsAt(text, ++pos, FLAG_VOICED)) {
              return true;
            }
            const inputChar = text[pos];
            if (inputChar !== 'H') // 'H'
              return false;
            // Check for 'T', 'C', 'S'
            if (!isOneOf(inputChar, TCS))
              return false;
            // FIXME: This is illogical and can never be reached. Bug in orig. code? reciter.c:489 (pos37367)
            if (process.env.NODE_ENV === 'development') {
              throw new Error('This should not be possible ', inputChar);
            }
            return true;
          },
          // '^' - next char must be a consonant.
          '^': () => flagsAt(text, ++pos, FLAG_CONSONANT),
          // '+' - next char must be either 'E', 'I' or 'Y'.
          '+': () => isOneOf(text[++pos], EIY),
          // ':' - walk right in input position until we hit a non consonant.
          ':': () => {
            while (flagsAt(text, pos + 1, FLAG_CONSONANT)) {
              pos++;
            }
            return true;
          },
          /* '%' - check if we have:
            - 'ING'
            - 'E' not followed by alpha or quot
            - 'ER' 'ES' or 'ED'
            - 'EFUL'
            - 'ELY'
          */
          '%': () => {
            // If not 'E', check if 'ING'.
            if (text[pos + 1] !== 'E') {
              // Are next chars "ING"?
              if (text.substr(pos + 1, 3) ==='ING') {
                pos += 3;
                return true;
              }
              return false;
            }
            // we have 'E' - check if not followed by alpha or quot.
            if (!flagsAt(text, pos + 2, FLAG_ALPHA_OR_QUOT)) {
              pos++;
              return true;
            }
            // NOT 'ER', 'ES' OR 'ED'
            if (!isOneOf(text[pos + 2], ['R', 'S', 'D'])) {
              // NOT 'EL'
              if (text[pos + 2] !== 'L') {
                // 'EFUL'
                if (text.substr(pos + 2, 3) === 'FUL') { // 'FUL'
                  pos += 4;
                  return true;
                }
                return false;
              }
              // NOT 'ELY'
              if (text[pos + 3] !== 'Y')
                return false;
              pos += 3;
              return true;
            }
            pos += 2;
              return true;
          }
        }[ruleByte]()) {
            return false;
        }
      }
      // Rule char does not match.
      else if (text[++pos] !== ruleByte) {
        return false;
      }
    }
    return true;
  };

  /**
   * Test if the rule matches.
   *
   * @param {string} text The input text.
   * @param {Number} pos  The input position we are working from.
   * @return {boolean}
   */
  const matches = function (text, pos) {
    // check if content in brackets matches.
    if (!text.startsWith(match, pos)) {
      return false;
    }

    // Check left...
    if (!checkPrefix(text, pos)) {
      return false;
    }

    // Check right...
    return (checkSuffix(text, pos + (match.length - 1)));
  };

  /**
   * This is the real implementation of rule processing.
   *
   * @param {string}          text     The text to process.
   * @param {Number}          inputPos The current position in the stream.
   * @param {successCallback} callback
   *
   * @return {boolean}
   */
  const result = function (text, inputPos, callback) {
    if (matches(text, inputPos)) {
      if (process.env.DEBUG_SAM === true) {
        console.log(`${source} -> ${target}`)
      }
      callback(target, match.length);
      return true;
    }
  };
  result.c = match[0];

  return result;
}

// Map all rules and generate processors from them.
const rules = {};
tables.rules.split('|').map((rule) => {
  const r = reciterRule(rule), c= r.c;
  rules[c] = rules[c] || [];
  rules[c].push(r);
});
const rules2 = tables.rules2.split('|').map(reciterRule);

/**
 * Convert the text to a phoneme string.
 *
 * @param {string} input The input string to convert.
 *
 * @return {boolean|string}
 */
export function TextToPhonemes (input) {
  return (function () {
    const text = ' ' + input.toUpperCase();

    let inputPos = 0, output = '';
    /**
     * The input callback (successCallback) used from the rules.
     *
     * @param {string} append    The string to append.
     * @param {Number} inputSkip The amount or chars to move ahead in the input.
     */
    const successCallback = function (append, inputSkip) {
      inputPos += inputSkip;
      output += append;
    };

    let c = 0;
    while ((inputPos < text.length) && (c++ < 10000)) {
      if (process.env.DEBUG_SAM === true) {
        const tmp = text.toLowerCase();
        console.log(
          `processing "${tmp.substr(0, inputPos)}%c${tmp[inputPos].toUpperCase()}%c${tmp.substr(inputPos + 1)}"`,
          'color: red;',
          'color:normal;'
        );
      }
      const currentChar = text[inputPos];

      // NOT '.' or '.' followed by number.
      if ((currentChar !== '.')
        || (flagsAt(text, inputPos + 1, FLAG_NUMERIC))) {
        //pos36607:
        if (flags(currentChar, FLAG_RULESET2)) {
          rules2.some((rule) => {
            return rule(text, inputPos, successCallback);
          });

          continue;
        }
        //pos36630:
        if (tables.charFlags[currentChar] !== 0) {
          // pos36677:
          if (!flags(currentChar, FLAG_ALPHA_OR_QUOT)) {
            //36683: BRK
            return false;
          }
          // go to the right rules for this character.
          rules[currentChar].some((rule) => {
            return rule(text, inputPos, successCallback);
          });
          continue;
        }

        output += ' ';
        inputPos++;
        continue;
      }
      output += '.';
      inputPos++;
    }
    return output;
  })();
}

export default TextToPhonemes;
