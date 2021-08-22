import { assert } from 'chai'
import Parser from "../../src/parser/parse1.es6";
import loadFixture from '../fixture-reader.js';

export default function (files) {
  describe('parser1.es6', () => {
    files.forEach((file) => {
      describe(`#Parser1(${file})`, () => {
        loadFixture('parser/fixtures/' + file).forEach((test) => {
          it(`should parse: "${test.input}".` , () => {
            const output = [];
            const stress = [];
            const result = Parser(
              test.input,
              (value) => { output.push(value); stress.push(0); },
              (value) => { stress[stress.length - 1] = value; }
            );
            assert.notEqual(result, false, 'Parser did not succeed');
            assert.deepEqual(output, test.output, 'Output mismatches');
            assert.deepEqual(stress, test.stress, 'Stress mismatches');
          });
        });
      });
    });
  });
}
