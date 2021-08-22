import {SamSpeak as Renderer} from './sam/sam.es6';

const lookup_ones = ["WAHN", "TUW5", "THRIY5", "FOHR5", "FAY5V", "SIH5KS", "SEH5VUN", "EY5T", "NAY5N"];
const lookup_teens = [
  "TEH4N",
  "IHLEH4VIXN",
  "TWEH4LV",
  "THER4TIY6N",
  "FOH4RTIY6N",
  "FIH4FTIY6N",
  "SIH4KSTIY6N",
  "SEH4VUNTIY6N",
  "EY4TIY6N",
  "NAY4NTIY6N",
];
const lookup_tens =
  ["TWEHNTIY", "THERTIY", "FOHRTIY", "FIH4FTIY6", "SIHKSTIY6", "SEH4VUNTIY6", "EY4T1Y6", "NAY4NTIY6"];

const GUESS_A_NUMBER_BETWEEN_0_AND_ONE_HUNDRED = 'GEH3S DHAX NAH4MBER BIXTWIY5N WAH4N Q AEND WAHN /HAH4NDRIHD';
const THATS_MORE_THAN_100 = 'DHAET IHZ MAOR DHAEN WAHN /HAH5NDRIHD';
const THATS_LESS_THAN_ONE = 'DHAE5TS LEH3S DHAEN WAH5N.';
const IS_MUCH_TOO_HIGH = 'IHZ MAH3CH TUW5 /HAY6.';
const IS_TOO_HIGH = 'IHZ TUW3 /HAY6.';
const IS_A_LITTLE_TOO_HIGH = 'IHZ AH LIH3TUL TUW4 /HAY6,';
const IS_MUCH_TOO_LOW = 'IHZ MAH3CH TUW4 LAXOW,';
const IS_TOO_LOW = 'IHZ TUW3 LAXOW.';
const IS_A_LITTLE_TOO_LOW = 'IHZ AH LIH3TUL TUW4 LAXOW,';
const IS_CORRECT = 'IHZ KAORREHKT, PLEY5 AXGEH4N? AOR DUW5 YUW PRIY4FER PAONX?';

function numberToPhonemes(number) {
  if (number >= 10 && number < 20) {
    return lookup_teens[number - 10];
  }
  let n;
  let phonemes = '';
  if ((n = Math.floor(number / 10) - 2) >= 0) {
    phonemes += lookup_tens[n];
  }
  if ((n = number % 10)) {
    phonemes += ' ' + lookup_ones[n - 1];
  }

  return phonemes;
}

/**
 * @param {Element} e
 */
function GuessNum(e) {
    const output = e.ownerDocument.createElement('pre');
    const button = e.ownerDocument.createElement('button');
    const input  = e.ownerDocument.createElement('input');
    const show = (e) => e.style.display = 'inline-block';
    const hide = (e) => e.style.display = 'none';
    let number
    e.appendChild(output);
    e.appendChild(button);
    e.appendChild(input);
    hide(input);
    button.type='button';
    button.innerText = 'Start game';
    button.addEventListener('click', function() {
      output.textContent = '';
      number = Math.floor((Math.random() * 99) + 1);
      say(GUESS_A_NUMBER_BETWEEN_0_AND_ONE_HUNDRED);
      hide(button);
      show(input);
    });
    function say(phonemes, raw) {
      let text = phonemes;
      while (text.length < 256) {
        text += ' '
      }
      if (raw) {
        output.innerText += "\n" + raw;
      }
      Renderer(phonemes);
    }
    input.onkeydown = (e) => {
      if (e.keyCode === 13) {
        e.preventDefault();
        if (guess(parseInt(input.value))) {
          output.innerText = "\n" + output.innerText.split("\n").pop();
          hide(input);
          show(button);
        }
        input.value = '';
      }
    };

  /**
   * Guess the number.
   *
   * @param {Number} guess The guess
   */
  function guess(guess) {
    if (guess > 100) {
      say(THATS_MORE_THAN_100);
      return false;
    }
    if (guess < 1) {
      say(THATS_LESS_THAN_ONE);
      return false;
    }
    let phonetic = numberToPhonemes(guess);
    if (guess > number + 25) {
      say(phonetic + ' ' + IS_MUCH_TOO_HIGH, guess + ' is much too high.');
      return false;
    }
    if (guess > number + 5) {
      say(phonetic + ' ' + IS_TOO_HIGH, guess + ' is too high.');
      return false;
    }
    if (guess > number) {
      say(phonetic + ' ' + IS_A_LITTLE_TOO_HIGH, guess + ' is a little too high.');
      return false;
    }
    if (guess < number - 25) {
      say(phonetic + ' ' + IS_MUCH_TOO_LOW, guess + ' is much too low.');
      return false;
    }
    if (guess < number - 5) {
      say(phonetic + ' ' + IS_TOO_LOW, guess + ' is too low.');
      return false;
    }
    if (guess < number) {
      say(phonetic + ' ' + IS_A_LITTLE_TOO_LOW, guess + ' is a little too low.');
      return false;
    }
    if (guess === number) {
      say(phonetic + ' ' + IS_CORRECT, guess + ' is correct, play again? or do you prefer PONG?.');
      return true;
    }
  }
}

export default GuessNum;
