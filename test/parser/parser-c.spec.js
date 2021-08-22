import { assert } from 'chai'
import Parser from '../../src/parser/c-conv/parser.es6';

describe('parser-c', () => {
  [
    {
      "input": "PREHNTIHS",
      "output": [66, 67, 68, 23, 7, 28, 69, 70, 71, 6, 32],
      "length": [8, 2, 2, 5, 11, 5, 6, 2, 2, 8, 2],
      "stress": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      "input": "SAH5KSEHSFUHL",
      "output": [32, 10, 75, 76, 77, 32, 7, 32, 34, 12, 19],
      "length": [2,  10,  6,  1,  4,  2, 8,  2,  2, 10,  9],
      "stress": [6,   5,  0,  0,  0,  0, 0,  0,  0,  0,  0],
    },
    {
      "input": "TAA5RDIY",
      "output": [69, 70, 71, 9, 18, 30, 5],
      "length": [6, 2, 2, 14, 10, 2, 8],
      "stress": [6, 6, 6, 5, 0, 0, 0],
    },

  ].forEach((value) => {
    describe(`#ParserC.parse()`, () => {
      it(`should parse: "${value.input}".`, () => {
        const result = Parser(value.input);
        assert.notEqual(result, false, 'Parser did not succeed');

        // Seek 255 in result
        let p1;
        for (p1 = 0; p1 < result.phonemeindex.length; p1++) {
          if (result.phonemeindex[p1] === 255) break;
        }

        assert.equal(p1, value.output.length, 'Length mismatch');

        for (let i = 0; i < p1; i++) {
          assert.equal(value.output[i], result.phonemeindex[i], `phonemeindex mismatch at ${i}`);
          assert.equal(value.stress[i], result.stress[i], `stress mismatch at ${i}`);
          assert.equal(value.length[i], result.phonemeLength[i], `phonemeLength mismatch at ${i}`);
        }
      });
    });
  });
});
