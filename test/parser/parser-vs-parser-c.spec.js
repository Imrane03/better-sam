import { assert } from 'chai'

import Parser from '../../src/parser/parser.es6';
import ParserC from '../../src/parser/c-conv/parser.es6';

describe('parser-vs-parser-c', () => {
  [
    'SAH5KSEHSFUHL',
    'PREHNTIHS',
    'AENIHZAAGAEMAXS',
    '/HEHLOW, MAY NEYM IHZ SAEM.',
    'IHZ KAORREHKT, PLEY5 AXGEH4N? AOR DUW YUW PRIY4FER PAONX?',
    'JAH5ST TEHSTIHNX',
    'WAH4N ZIY4ROW POYNT FAY4V PERSEH4NT',
    'WAH4N  TUW4  THRIY4  FOH4R  FAY4V  SIH4KS  ZIY4ROW POYNT FAY4V, AY4 KAEN KAWNT.',
    'KAHMPYUWTER',
    '/HEHLOW',
    'WIHZAA5RD',
    'KEY4S FAWND AH PLEYS AET DHAX BAA5R, BEHTWIY4N DHIY AHNLIHKLIY TAEN AAN WAHN AHV LAHNIYZUNEHS /HUWRZ AEND DHAX KRIHSP NAEVUL YUWNIHFAORM AHV AH TAOL AEFRIHKAEN /HUWZEHKIY4KBOW5NZ WER RIHDJD WIHTH PREHSAYZ ROWZ AHV TRIHBUL SKAA5RZ.',
    'MEHDDUL',
    'AESTRUNAHMIY',
    'FAH5NKSHUN',
    'AXWEY5',
    'EY4T',
    'TRAEK',
    'DRAY',
    'AA5RT',
    'AOL',
    'KOW',
    'SPAY',
    'STAY',
    'SKAY',
    'SKOWL',
    'NUW',
    'DUW',
    'SUW',
    'ZUW5',
    'THUW5',
    'TUW5',
    'CHYUW',
    'JEY5',
    'PAA5RTIY',
    'TAA5RDIY',
    'MEHDDUL AESTRUNAHMIY FAH5NKSHUN AXWEY5 EY4T TRAEK DRAY AA5RT AOL KOW SPAY STAY SKAY SKOWL NUW DUW SUW ZUW5 THUW5 TUW5 CHYUW JEY5 PAA5RTIY TAA5RDIY',
    'KEY4S FAWND AH PLEYS AET DHAX BAA5R. BEHTWIY4N DHIY AHNLIHKLIY TAEN AAN WAHN AHV LAHNIYZUNEHS /HUWRZ.'
  ].forEach((value) => {
    describe(`#Parser.parse() vs. ParserC.parse()`, () => {
      it(`should parse: "${value}".` , () => {
        const resultC = ParserC(value);
        const result = Parser(value);
        assert.notEqual(result, false, 'Parser did not succeed');

        // Seek 255 in result
        let p1, p2;
        p1 = result.length - 1;
        for (p2 = 0;p2<resultC.phonemeindex.length;p2++) { if (resultC.phonemeindex[p2] === 255) break;}

        assert.equal(p1, p2, 'Length mismatch');

        for (let i = 0;i<p1;i++) {
          assert.equal(result[i][0], resultC.phonemeindex[i], `phonemeindex mismatch at ${i}`);
        }
        for (let i = 0;i<p1;i++) {
          assert.equal(result[i][1], resultC.phonemeLength[i], `phonemeLength mismatch at ${i}`);
        }
        for (let i = 0;i<p1;i++) {
          assert.equal(result[i][2], resultC.stress[i], `stress mismatch at ${i}`);
        }
      });
    });
  });
});
