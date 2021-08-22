/**
 * This is SamJs.js v0.1.2
 *
 * A Javascript port of "SAM Software Automatic Mouth".
 *
 * (c) 2017-2020 Christian Schiffler
 *
 * @link(https://github.com/discordier/sam)
 *
 * @author 2017 Christian Schiffler <c.schiffler@cyberspectrum.de>
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.SamJs = factory());
}(this, (function () { 'use strict';

  /**
   * Test if a bit is set.
   * @param {Number} bits The bits.
   * @param {Number} mask The mask to test.
   * @return {boolean}
   */
  function matchesBitmask (bits, mask) {
    return (bits & mask) !== 0;
  }


  function text2Uint8Array (text) {
    var buffer = new Uint8Array(text.length);
    text.split('').forEach(function (e, index) {
      buffer[index] = e.charCodeAt(0);
    });
    return buffer;
  }

  function Uint32ToUint8Array (uint32) {
    var result = new Uint8Array(4);
    result[0]  = uint32;
    result[1]  = uint32 >>  8;
    result[2]  = uint32 >> 16;
    result[3]  = uint32 >> 24;

    return result;
  }

  function Uint16ToUint8Array (uint16) {
    var result = new Uint8Array(2);
    result[0]  = uint16;
    result[1]  = uint16 >> 8;

    return result;
  }

  /**
   *
   * @param {AudioContext} context
   * @param audiobuffer
   *
   * @return {Promise}
   */
  function Play(context, audiobuffer) {
    return new Promise(function (resolve) {
      var source = context.createBufferSource();
      var soundBuffer = context.createBuffer(1, audiobuffer.length, 22050);
      var buffer = soundBuffer.getChannelData(0);
      for(var i=0; i<audiobuffer.length; i++) {
        buffer[i] = audiobuffer[i];
      }
      source.buffer = soundBuffer;
      source.connect(context.destination);
      source.onended = function () {
        resolve(true);
      };
      source.start(0);
    });
  }

  var context = null;

  /**
   * Play an audio buffer.
   *
   * @param {Float32Array} audiobuffer
   *
   * @return {Promise}
   */
  function PlayBuffer(audiobuffer) {
    if (null === context) {
      context = new AudioContext();
    }

    if (!context) {
      {
        throw new Error('No player available!');
      }
    }

    return Play(context, audiobuffer);
  }

  /**
   * Convert a Uint8Array wave buffer to a Float32Array WaveBuffer
   *
   * @param {Uint8Array} buffer
   *
   * @return {Float32Array}
   */
  function UInt8ArrayToFloat32Array (buffer) {
    var audio = new Float32Array(buffer.length);
    for(var i=0; i < buffer.length; i++) {
      audio[i] = (buffer[i] - 128) / 256;
    }

    return audio
  }

  /**
   *
   * @param {Uint8Array} audiobuffer
   *
   * @return void
   */
  function RenderBuffer (audiobuffer) {
    var filename = 'sam.wav';

    // Calculate buffer size.
    var realbuffer = new Uint8Array(
      4 + // "RIFF"
      4 + // uint32 filesize
      4 + // "WAVE"
      4 + // "fmt "
      4 + // uint32 fmt length
      2 + // uint16 fmt
      2 + // uint16 channels
      4 + // uint32 sample rate
      4 + // uint32 bytes per second
      2 + // uint16 block align
      2 + // uint16 bits per sample
      4 + // "data"
      4 + // uint32 chunk length
      audiobuffer.length
    );

    var pos=0;
    var write = function (buffer) {
      realbuffer.set(buffer, pos);
      pos+=buffer.length;
    };

    //RIFF header
    write(text2Uint8Array('RIFF')); // chunkID
    write(Uint32ToUint8Array(audiobuffer.length + 12 + 16 + 8 - 8)); // ChunkSize
    write(text2Uint8Array('WAVE')); // riffType
    //format chunk
    write(text2Uint8Array('fmt '));
    write(Uint32ToUint8Array(16)); // ChunkSize
    write(Uint16ToUint8Array(1)); // wFormatTag - 1 = PCM
    write(Uint16ToUint8Array(1)); // channels
    write(Uint32ToUint8Array(22050)); // samplerate
    write(Uint32ToUint8Array(22050)); // bytes/second
    write(Uint16ToUint8Array(1)); // blockalign
    write(Uint16ToUint8Array(8)); // bits per sample
    //data chunk
    write(text2Uint8Array('data'));
    write(Uint32ToUint8Array(audiobuffer.length)); // buffer length
    write(audiobuffer);

    var blob = new Blob([realbuffer], {type: 'audio/vnd.wave'});

    var url     = (window.URL || window.webkitURL);
    var fileURL = url.createObjectURL(blob);
    var a       = document.createElement('a');
    a.href        = fileURL;
    a.target      = '_blank';
    a.download    = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    url.revokeObjectURL(fileURL);
  }

  /**
   * Char flags.
   *
   *  0x01        numeric
   *  0x02        use rule set 2
   *  0x04        D J L N R S T Z
   *  0x08        B D G J L M N R V W Z
   *  0x10        C G J S X Z
   *  0x20        B C D F G H J K L M N P Q R S T V W X Y Z + ` => probably all consonants and '`'?
   *  0x40        is vowel or Y
   *  0x80        alpha or '
   */
  var charFlags = {
    ' ':  0,
    '!':  0                                           | 0x02,
    '"':  0                                           | 0x02,
    '#':  0                                           | 0x02,
    '$':  0                                           | 0x02,
    '%':  0                                           | 0x02,
    '&':  0                                           | 0x02,
    '\'': 0 | 0x80                                    | 0x02,
    '(':  0,
    ')':  0,
    '*':  0                                           | 0x02,
    '+':  0                                           | 0x02,
    ',':  0                                           | 0x02,
    '-':  0                                           | 0x02,
    '.':  0                                           | 0x02,
    '/':  0                                           | 0x02,
    '0':  0                                           | 0x02 | 0x01,
    '1':  0                                           | 0x02 | 0x01,
    '2':  0                                           | 0x02 | 0x01,
    '3':  0                                           | 0x02 | 0x01,
    '4':  0                                           | 0x02 | 0x01,
    '5':  0                                           | 0x02 | 0x01,
    '6':  0                                           | 0x02 | 0x01,
    '7':  0                                           | 0x02 | 0x01,
    '8':  0                                           | 0x02 | 0x01,
    '9':  0                                           | 0x02 | 0x01,
    ':':  0                                           | 0x02,
    ';':  0                                           | 0x02,
    '<':  0                                           | 0x02,
    '=':  0                                           | 0x02,
    '>':  0                                           | 0x02,
    '?':  0                                           | 0x02,
    '@':  0                                           | 0x02,
    'A':  0 | 0x80 | 0x40,
    'B':  0 | 0x80        | 0x20        | 0x08,
    'C':  0 | 0x80        | 0x20 | 0x10,
    'D':  0 | 0x80        | 0x20        | 0x08 | 0x04,
    'E':  0 | 0x80 | 0x40,
    'F':  0 | 0x80        | 0x20,
    'G':  0 | 0x80        | 0x20 | 0x10 | 0x08,
    'H':  0 | 0x80        | 0x20,
    'I':  0 | 0x80 | 0x40,
    'J':  0 | 0x80        | 0x20 | 0x10 | 0x08 | 0x04,
    'K':  0 | 0x80        | 0x20,
    'L':  0 | 0x80        | 0x20        | 0x08 | 0x04,
    'M':  0 | 0x80        | 0x20        | 0x08,
    'N':  0 | 0x80        | 0x20        | 0x08 | 0x04,
    'O':  0 | 0x80 | 0x40,
    'P':  0 | 0x80        | 0x20,
    'Q':  0 | 0x80        | 0x20,
    'R':  0 | 0x80        | 0x20        | 0x08 | 0x04,
    'S':  0 | 0x80        | 0x20 | 0x10        | 0x04,
    'T':  0 | 0x80        | 0x20               | 0x04,
    'U':  0 | 0x80 | 0x40,
    'V':  0 | 0x80        | 0x20        | 0x08,
    'W':  0 | 0x80        | 0x20        | 0x08,
    'X':  0 | 0x80        | 0x20 | 0x10,
    'Y':  0 | 0x80 | 0x40,
    'Z':  0 | 0x80        | 0x20 | 0x10 | 0x08 | 0x04,
    '[':  0,
    '\\': 0,
    ']':  0,
    '^':  0                                           | 0x02,
    '_':  0,
    '`':  0               | 0x20,
  };

  var rules =
    ' (A.)=EH4Y. |' +
    '(A) =AH|' +
    ' (ARE) =AAR|' +
    ' (AR)O=AXR|' +
    '(AR)#=EH4R|' +
    ' ^(AS)#=EY4S|' +
    '(A)WA=AX|' +
    '(AW)=AO5|' +
    ' :(ANY)=EH4NIY|' +
    '(A)^+#=EY5|' +
    '#:(ALLY)=ULIY|' +
    ' (AL)#=UL|' +
    '(AGAIN)=AXGEH4N|' +
    '#:(AG)E=IHJ|' +
    '(A)^%=EY|' +
    '(A)^+:#=AE|' +
    ' :(A)^+ =EY4|' +
    ' (ARR)=AXR|' +
    '(ARR)=AE4R|' +
    ' ^(AR) =AA5R|' +
    '(AR)=AA5R|' +
    '(AIR)=EH4R|' +
    '(AI)=EY4|' +
    '(AY)=EY5|' +
    '(AU)=AO4|' +
    '#:(AL) =UL|' +
    '#:(ALS) =ULZ|' +
    '(ALK)=AO4K|' +
    '(AL)^=AOL|' +
    ' :(ABLE)=EY4BUL|' +
    '(ABLE)=AXBUL|' +
    '(A)VO=EY4|' +
    '(ANG)+=EY4NJ|' +
    '(ATARI)=AHTAA4RIY|' +
    '(A)TOM=AE|' +
    '(A)TTI=AE|' +
    ' (AT) =AET|' +
    ' (A)T=AH|' +
    '(A)=AE|' +

    ' (B) =BIY4|'+
    ' (BE)^#=BIH|'+
    '(BEING)=BIY4IHNX|'+
    ' (BOTH) =BOW4TH|'+
    ' (BUS)#=BIH4Z|'+
    '(BREAK)=BREY5K|'+
    '(BUIL)=BIH4L|'+
    '(B)=B|'+

    ' (C) =SIY4|'+
    ' (CH)^=K|'+
    '^E(CH)=K|'+
    '(CHA)R#=KEH5|'+
    '(CH)=CH|'+
    ' S(CI)#=SAY4|'+
    '(CI)A=SH|'+
    '(CI)O=SH|'+
    '(CI)EN=SH|'+
    '(CITY)=SIHTIY|'+
    '(C)+=S|'+
    '(CK)=K|'+
    '(COMMODORE)=KAA4MAHDOHR|'+
    '(COM)=KAHM|'+
    '(CUIT)=KIHT|'+
    '(CREA)=KRIYEY|'+
    '(C)=K|'+

    ' (D) =DIY4|'+
    ' (DR.) =DAA4KTER|'+
    '#:(DED) =DIHD|'+
    '.E(D) =D|'+
    '#:^E(D) =T|'+
    ' (DE)^#=DIH|'+
    ' (DO) =DUW|'+
    ' (DOES)=DAHZ|'+
    '(DONE) =DAH5N|'+
    '(DOING)=DUW4IHNX|'+
    ' (DOW)=DAW|'+
    '#(DU)A=JUW|'+
    '#(DU)^#=JAX|'+
    '(D)=D|'+

    ' (E) =IYIY4|'+
    '#:(E) =|'+
    '\':^(E) =|'+
    ' :(E) =IY|'+
    '#(ED) =D|'+
    '#:(E)D =|'+
    '(EV)ER=EH4V|'+
    '(E)^%=IY4|'+
    '(ERI)#=IY4RIY|'+
    '(ERI)=EH4RIH|'+
    '#:(ER)#=ER|'+
    '(ERROR)=EH4ROHR|'+
    '(ERASE)=IHREY5S|'+
    '(ER)#=EHR|'+
    '(ER)=ER|'+
    ' (EVEN)=IYVEHN|'+
    '#:(E)W=|'+
    '@(EW)=UW|'+
    '(EW)=YUW|'+
    '(E)O=IY|'+
    '#:&(ES) =IHZ|'+
    '#:(E)S =|'+
    '#:(ELY) =LIY|'+
    '#:(EMENT)=MEHNT|'+
    '(EFUL)=FUHL|'+
    '(EE)=IY4|'+
    '(EARN)=ER5N|'+
    ' (EAR)^=ER5|'+
    '(EAD)=EHD|'+
    '#:(EA) =IYAX|'+
    '(EA)SU=EH5|'+
    '(EA)=IY5|'+
    '(EIGH)=EY4|'+
    '(EI)=IY4|'+
    ' (EYE)=AY4|'+
    '(EY)=IY|'+
    '(EU)=YUW5|'+
    '(EQUAL)=IY4KWUL|'+
    '(E)=EH|'+

    ' (F) =EH4F|'+
    '(FUL)=FUHL|'+
    '(FRIEND)=FREH5ND|'+
    '(FATHER)=FAA4DHER|'+
    '(F)F=|'+
    '(F)=F|'+

    ' (G) =JIY4|'+
    '(GIV)=GIH5V|'+
    ' (G)I^=G|'+
    '(GE)T=GEH5|'+
    'SU(GGES)=GJEH4S|'+
    '(GG)=G|'+
    ' B#(G)=G|'+
    '(G)+=J|'+
    '(GREAT)=GREY4T|'+
    '(GON)E=GAO5N|'+
    '#(GH)=|'+
    ' (GN)=N|'+
    '(G)=G|'+

    ' (H) =EY4CH|'+
    ' (HAV)=/HAE6V|'+
    ' (HERE)=/HIYR|'+
    ' (HOUR)=AW5ER|'+
    '(HOW)=/HAW|'+
    '(H)#=/H|'+
    '(H)=|'+

    ' (IN)=IHN|'+
    ' (I) =AY4|'+
    '(I) =AY|'+
    '(IN)D=AY5N|'+
    'SEM(I)=IY|'+
    ' ANT(I)=AY|'+
    '(IER)=IYER|'+
    '#:R(IED) =IYD|'+
    '(IED) =AY5D|'+
    '(IEN)=IYEHN|'+
    '(IE)T=AY4EH|'+
    '(I\')=AY5|'+
    ' :(I)^%=AY5|'+
    ' :(IE) =AY4|'+
    '(I)%=IY|'+
    '(IE)=IY4|'+
    ' (IDEA)=AYDIY5AH|'+
    '(I)^+:#=IH|'+
    '(IR)#=AYR|'+
    '(IZ)%=AYZ|'+
    '(IS)%=AYZ|'+
    'I^(I)^#=IH|'+
    '+^(I)^+=AY|'+
    '#:^(I)^+=IH|'+
    '(I)^+=AY|'+
    '(IR)=ER|'+
    '(IGH)=AY4|'+
    '(ILD)=AY5LD|'+
    ' (IGN)=IHGN|'+
    '(IGN) =AY4N|'+
    '(IGN)^=AY4N|'+
    '(IGN)%=AY4N|'+
    '(ICRO)=AY4KROH|'+
    '(IQUE)=IY4K|'+
    '(I)=IH|'+

    ' (J) =JEY4|'+
    '(J)=J|'+

    ' (K) =KEY4|'+
    ' (K)N=|'+
    '(K)=K|'+

    ' (L) =EH4L|'+
    '(LO)C#=LOW|'+
    'L(L)=|'+
    '#:^(L)%=UL|'+
    '(LEAD)=LIYD|'+
    ' (LAUGH)=LAE4F|'+
    '(L)=L|'+

    ' (M) =EH4M|'+
    ' (MR.) =MIH4STER|'+
    ' (MS.)=MIH5Z|'+
    ' (MRS.) =MIH4SIXZ|'+
    '(MOV)=MUW4V|'+
    '(MACHIN)=MAHSHIY5N|'+
    'M(M)=|'+
    '(M)=M|'+

    ' (N) =EH4N|'+
    'E(NG)+=NJ|'+
    '(NG)R=NXG|'+
    '(NG)#=NXG|'+
    '(NGL)%=NXGUL|'+
    '(NG)=NX|'+
    '(NK)=NXK|'+
    ' (NOW) =NAW4|'+
    'N(N)=|'+
    '(NON)E=NAH4N|'+
    '(N)=N|'+

    ' (O) =OH4W|'+
    '(OF) =AHV|'+
    ' (OH) =OW5|'+
    '(OROUGH)=ER4OW|'+
    '#:(OR) =ER|'+
    '#:(ORS) =ERZ|'+
    '(OR)=AOR|'+
    ' (ONE)=WAHN|'+
    '#(ONE) =WAHN|'+
    '(OW)=OW|'+
    ' (OVER)=OW5VER|'+
    'PR(O)V=UW4|'+
    '(OV)=AH4V|'+
    '(O)^%=OW5|'+
    '(O)^EN=OW|'+
    '(O)^I#=OW5|'+
    '(OL)D=OW4L|'+
    '(OUGHT)=AO5T|'+
    '(OUGH)=AH5F|'+
    ' (OU)=AW|'+
    'H(OU)S#=AW4|'+
    '(OUS)=AXS|'+
    '(OUR)=OHR|'+
    '(OULD)=UH5D|'+
    '(OU)^L=AH5|'+
    '(OUP)=UW5P|'+
    '(OU)=AW|'+
    '(OY)=OY|'+
    '(OING)=OW4IHNX|'+
    '(OI)=OY5|'+
    '(OOR)=OH5R|'+
    '(OOK)=UH5K|'+
    'F(OOD)=UW5D|'+
    'L(OOD)=AH5D|'+
    'M(OOD)=UW5D|'+
    '(OOD)=UH5D|'+
    'F(OOT)=UH5T|'+
    '(OO)=UW5|'+
    '(O\')=OH|'+
    '(O)E=OW|'+
    '(O) =OW|'+
    '(OA)=OW4|'+
    ' (ONLY)=OW4NLIY|'+
    ' (ONCE)=WAH4NS|'+
    '(ON\'T)=OW4NT|'+
    'C(O)N=AA|'+
    '(O)NG=AO|'+
    ' :^(O)N=AH|'+
    'I(ON)=UN|'+
    '#:(ON)=UN|'+
    '#^(ON)=UN|'+
    '(O)ST=OW|'+
    '(OF)^=AO4F|'+
    '(OTHER)=AH5DHER|'+
    'R(O)B=RAA|'+
    '^R(O):#=OW5|'+
    '(OSS) =AO5S|'+
    '#:^(OM)=AHM|'+
    '(O)=AA|'+

    ' (P) =PIY4|'+
    '(PH)=F|'+
    '(PEOPL)=PIY5PUL|'+
    '(POW)=PAW4|'+
    '(PUT) =PUHT|'+
    '(P)P=|'+
    '(P)S=|'+
    '(P)N=|'+
    '(PROF.)=PROHFEH4SER|'+
    '(P)=P|'+

    ' (Q) =KYUW4|'+
    '(QUAR)=KWOH5R|'+
    '(QU)=KW|'+
    '(Q)=K|'+

    ' (R) =AA5R|'+
    ' (RE)^#=RIY|'+
    '(R)R=|'+
    '(R)=R|'+

    ' (S) =EH4S|'+
    '(SH)=SH|'+
    '#(SION)=ZHUN|'+
    '(SOME)=SAHM|'+
    '#(SUR)#=ZHER|'+
    '(SUR)#=SHER|'+
    '#(SU)#=ZHUW|'+
    '#(SSU)#=SHUW|'+
    '#(SED)=ZD|'+
    '#(S)#=Z|'+
    '(SAID)=SEHD|'+
    '^(SION)=SHUN|'+
    '(S)S=|'+
    '.(S) =Z|'+
    '#:.E(S) =Z|'+
    '#:^#(S) =S|'+
    'U(S) =S|'+
    ' :#(S) =Z|'+
    '##(S) =Z|'+
    ' (SCH)=SK|'+
    '(S)C+=|'+
    '#(SM)=ZUM|'+
    '#(SN)\'=ZUM|'+
    '(STLE)=SUL|'+
    '(S)=S|'+

    ' (T) =TIY4|'+
    ' (THE) #=DHIY|'+
    ' (THE) =DHAX|'+
    '(TO) =TUX|'+
    ' (THAT)=DHAET|'+
    ' (THIS) =DHIHS|'+
    ' (THEY)=DHEY|'+
    ' (THERE)=DHEHR|'+
    '(THER)=DHER|'+
    '(THEIR)=DHEHR|'+
    ' (THAN) =DHAEN|'+
    ' (THEM) =DHAEN|'+
    '(THESE) =DHIYZ|'+
    ' (THEN)=DHEHN|'+
    '(THROUGH)=THRUW4|'+
    '(THOSE)=DHOHZ|'+
    '(THOUGH) =DHOW|'+
    '(TODAY)=TUXDEY|'+
    '(TOMO)RROW=TUMAA5|'+
    '(TO)TAL=TOW5|'+
    ' (THUS)=DHAH4S|'+
    '(TH)=TH|'+
    '#:(TED)=TIXD|'+
    'S(TI)#N=CH|'+
    '(TI)O=SH|'+
    '(TI)A=SH|'+
    '(TIEN)=SHUN|'+
    '(TUR)#=CHER|'+
    '(TU)A=CHUW|'+
    ' (TWO)=TUW|'+
    '&(T)EN =|'+
    '(T)=T|'+

    ' (U) =YUW4|'+
    ' (UN)I=YUWN|'+
    ' (UN)=AHN|'+
    ' (UPON)=AXPAON|'+
    '@(UR)#=UH4R|'+
    '(UR)#=YUH4R|'+
    '(UR)=ER|'+
    '(U)^ =AH|'+
    '(U)^^=AH5|'+
    '(UY)=AY5|'+
    ' G(U)#=|'+
    'G(U)%=|'+
    'G(U)#=W|'+
    '#N(U)=YUW|'+
    '@(U)=UW|'+
    '(U)=YUW|'+

    ' (V) =VIY4|'+
    '(VIEW)=VYUW5|'+
    '(V)=V|'+

    ' (W) =DAH4BULYUW|'+
    ' (WERE)=WER|'+
    '(WA)SH=WAA|'+
    '(WA)ST=WEY|'+
    '(WA)S=WAH|'+
    '(WA)T=WAA|'+
    '(WHERE)=WHEHR|'+
    '(WHAT)=WHAHT|'+
    '(WHOL)=/HOWL|'+
    '(WHO)=/HUW|'+
    '(WH)=WH|'+
    '(WAR)#=WEHR|'+
    '(WAR)=WAOR|'+
    '(WOR)^=WER|'+
    '(WR)=R|'+
    '(WOM)A=WUHM|'+
    '(WOM)E=WIHM|'+
    '(WEA)R=WEH|'+
    '(WANT)=WAA5NT|'+
    'ANS(WER)=ER|'+
    '(W)=W|'+

    ' (X) =EH4KR|'+
    ' (X)=Z|'+
    '(X)=KS|'+

    ' (Y) =WAY4|'+
    '(YOUNG)=YAHNX|'+
    ' (YOUR)=YOHR|'+
    ' (YOU)=YUW|'+
    ' (YES)=YEHS|'+
    ' (Y)=Y|'+
    'F(Y)=AY|'+
    'PS(YCH)=AYK|'+
    '#:^(Y)=IY|'+
    '#:^(Y)I=IY|'+
    ' :(Y) =AY|'+
    ' :(Y)#=AY|'+
    ' :(Y)^+:#=IH|'+
    ' :(Y)^#=AY|'+
    '(Y)=IH|'+

    ' (Z) =ZIY4|'+
    '(Z)=Z'
  ;

  var rules2 =
    '(A)=|'+
    '(!)=.|'+
    '(") =-AH5NKWOWT-|'+
    '(")=KWOW4T-|'+
    '(#)= NAH4MBER|'+
    '($)= DAA4LER|'+
    '(%)= PERSEH4NT|'+
    '(&)= AEND|'+
    '(\')=|'+
    '(*)= AE4STERIHSK|'+
    '(+)= PLAH4S|'+
    '(,)=,|'+
    ' (-) =-|'+
    '(-)=|'+
    '(.)= POYNT|'+
    '(/)= SLAE4SH|'+
    '(0)= ZIY4ROW|'+
    ' (1ST)=FER4ST|'+
    ' (10TH)=TEH4NTH|'+
    '(1)= WAH4N|'+
    ' (2ND)=SEH4KUND|'+
    '(2)= TUW4|'+
    ' (3RD)=THER4D|'+
    '(3)= THRIY4|'+
    '(4)= FOH4R|'+
    ' (5TH)=FIH4FTH|'+
    '(5)= FAY4V|'+
    ' (64) =SIH4KSTIY FOHR|'+
    '(6)= SIH4KS|'+
    '(7)= SEH4VUN|'+
    ' (8TH)=EY4TH|'+
    '(8)= EY4T|'+
    '(9)= NAY4N|'+
    '(:)=.|'+
    '(;)=.|'+
    '(<)= LEH4S DHAEN|'+
    '(=)= IY4KWULZ|'+
    '(>)= GREY4TER DHAEN|'+
    '(?)=?|'+
    '(@)= AE6T|'+
    '(^)= KAE4RIXT'
  ;

  var FLAG_NUMERIC       = 0x01;
  var FLAG_RULESET2      = 0x02;
  var FLAG_VOICED        = 0x04; // FIXME: is this correct?
  var FLAG_0X08          = 0x08; // unknown.
  var FLAG_DIPTHONG      = 0x10; // FIXME: is this correct?
  var FLAG_CONSONANT     = 0x20; // FIXME: is this correct?
  var FLAG_VOWEL_OR_Y    = 0x40;
  var FLAG_ALPHA_OR_QUOT = 0x80;

  /**
   * Test if the char matches against the flags in the reciter table.
   * @param {string} c
   * @param {Number} flg
   * @return {boolean}
   */
  var flags = function (c, flg) {
    return (charFlags[c] & flg) !== 0;
  };

  /**
   *
   * @param {string} text
   * @param {Number} pos
   * @param {Number} flg
   * @return {boolean}
   */
  var flagsAt = function (text, pos, flg) {
    return flags(text[pos], flg);
  };
  /**
   *
   * @param {string} c
   * @param {Array} list
   *
   * @return {boolean}
   */
  var isOneOf = function (c, list) {
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
    var splitted = ruleString.split('=');
    var
      // Must pop and join here because of rule for '=' itself.
      target = splitted.pop(),
      source = splitted.join('=').split('('),
      tmp=source.pop().split(')'),
      pre = source[0],
      match = tmp[0],
      post = tmp[1]
    ;

    var TCS = ['T', 'C', 'S'];
    var EIY = ['E', 'I', 'Y'];

    /**
     * Test if the rule prefix matches.
     * @param {string} text The input text.
     * @param {Number} pos  The input position we are working from.
     * @return {boolean}
     */
    var checkPrefix = function (text, pos) {
      for (var rulePos = pre.length - 1; rulePos>-1;rulePos--) {
        var ruleByte = pre[rulePos];
        if (!flags(ruleByte, FLAG_ALPHA_OR_QUOT)) {
          if (!{
            // '' - previous char must not be alpha or quotation mark.
            ' ': function () { return !flagsAt(text, --pos, FLAG_ALPHA_OR_QUOT); },
            // '#' - previous char must be a vowel or Y.
            '#': function () { return flagsAt(text, --pos, FLAG_VOWEL_OR_Y); },
            // '.' - unknown?
            '.': function () { return flagsAt(text, --pos, FLAG_0X08); },
            // '&' - previous char must be a dipthong or previous chars must be 'CH' or 'SH'
            '&': function () { return (flagsAt(text, --pos, FLAG_DIPTHONG)) || (isOneOf(text.substr(--pos, 2), ['CH', 'SH'])); },
            // '@' - previous char must be voiced and not 'H'.
            '@': function () {
              if (flagsAt(text, --pos, FLAG_VOICED)) {
                return true;
              }
              var inputChar = text[pos];
              // 'H'
              if (inputChar !== 'H')
                { return false; }
              // FIXME: this is always true?!? is there a "--pos" missing in original code?
              // Check for 'T', 'C', 'S'
              if (!isOneOf(inputChar, TCS)) {
                return false;
              }
              {
                throw new Error('Is always false but happened? ' + inputChar);
              }
            },
            // '^' - previous char must be a consonant.
            '^': function () { return flagsAt(text, --pos, FLAG_CONSONANT); },
            // '+' - previous char must be either 'E', 'I' or 'Y'.
            '+': function () { return isOneOf(text[--pos], EIY); },
            // ':' - walk left in input position until we hit a non consonant or begin of string.
            ':': function () {
              while (pos >= 0) {
                if (!flagsAt(text, pos - 1, FLAG_CONSONANT))
                  { break; }
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
    var checkSuffix = function (text, pos) {
      for (var rulePos = 0; rulePos<post.length;rulePos++) {
        var ruleByte = post[rulePos];
        // do we have to handle the byte specially?
        if (!flags(ruleByte, FLAG_ALPHA_OR_QUOT)) {
          // pos37226:
          if (!{
            // ' ' - next char must not be alpha or quotation mark.
            ' ': function () { return !flagsAt(text, ++pos, FLAG_ALPHA_OR_QUOT); },
            // '#' - next char must be a vowel or Y.
            '#': function () { return flagsAt(text, ++pos, FLAG_VOWEL_OR_Y); },
            // '.' - unknown?
            '.': function () { return flagsAt(text, ++pos, FLAG_0X08); },
            // '&' - next char must be a dipthong or next chars must be 'HC' or 'HS'
            '&': function () { return flagsAt(text, ++pos, FLAG_DIPTHONG) || isOneOf(text.substr((++pos) - 2, 2), ['HC', 'HS']); },
            // '@' - next char must be voiced and not 'H'.
            '@': function () {
              if (flagsAt(text, ++pos, FLAG_VOICED)) {
                return true;
              }
              var inputChar = text[pos];
              if (inputChar !== 'H') // 'H'
                { return false; }
              // Check for 'T', 'C', 'S'
              if (!isOneOf(inputChar, TCS))
                { return false; }
              // FIXME: This is illogical and can never be reached. Bug in orig. code? reciter.c:489 (pos37367)
              {
                throw new Error('This should not be possible ', inputChar);
              }
            },
            // '^' - next char must be a consonant.
            '^': function () { return flagsAt(text, ++pos, FLAG_CONSONANT); },
            // '+' - next char must be either 'E', 'I' or 'Y'.
            '+': function () { return isOneOf(text[++pos], EIY); },
            // ':' - walk right in input position until we hit a non consonant.
            ':': function () {
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
            '%': function () {
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
                  { return false; }
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
    var matches = function (text, pos) {
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
    var result = function (text, inputPos, callback) {
      if (matches(text, inputPos)) {
        {
          console.log((source + " -> " + target));
        }
        callback(target, match.length);
        return true;
      }
    };
    result.c = match[0];

    return result;
  }

  // Map all rules and generate processors from them.
  var rules$1 = {};
  rules.split('|').map(function (rule) {
    var r = reciterRule(rule), c= r.c;
    rules$1[c] = rules$1[c] || [];
    rules$1[c].push(r);
  });
  var rules2$1 = rules2.split('|').map(reciterRule);

  /**
   * Convert the text to a phoneme string.
   *
   * @param {string} input The input string to convert.
   *
   * @return {boolean|string}
   */
  function TextToPhonemes (input) {
    return (function () {
      var text = ' ' + input.toUpperCase();

      var inputPos = 0, output = '';
      /**
       * The input callback (successCallback) used from the rules.
       *
       * @param {string} append    The string to append.
       * @param {Number} inputSkip The amount or chars to move ahead in the input.
       */
      var successCallback = function (append, inputSkip) {
        inputPos += inputSkip;
        output += append;
      };

      var c = 0;
      while ((inputPos < text.length) && (c++ < 10000)) {
        {
          var tmp = text.toLowerCase();
          console.log(
            ("processing \"" + (tmp.substr(0, inputPos)) + "%c" + (tmp[inputPos].toUpperCase()) + "%c" + (tmp.substr(inputPos + 1)) + "\""),
            'color: red;',
            'color:normal;'
          );
        }
        var currentChar = text[inputPos];

        // NOT '.' or '.' followed by number.
        if ((currentChar !== '.')
          || (flagsAt(text, inputPos + 1, FLAG_NUMERIC))) {
          //pos36607:
          if (flags(currentChar, FLAG_RULESET2)) {
            rules2$1.some(function (rule) {
              return rule(text, inputPos, successCallback);
            });

            continue;
          }
          //pos36630:
          if (charFlags[currentChar] !== 0) {
            // pos36677:
            if (!flags(currentChar, FLAG_ALPHA_OR_QUOT)) {
              //36683: BRK
              return false;
            }
            // go to the right rules for this character.
            rules$1[currentChar].some(function (rule) {
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

  var BREAK = 254;
  var END   = 255;

  var StressTable = '*12345678'.split('');

  var PhonemeNameTable = (
    ' *' + // 00
    '.*' + // 01
    '?*' + // 02
    ',*' + // 03
    '-*' + // 04
    'IY' + // 05
    'IH' + // 06
    'EH' + // 07
    'AE' + // 08
    'AA' + // 09
    'AH' + // 10
    'AO' + // 11
    'UH' + // 12
    'AX' + // 13
    'IX' + // 14
    'ER' + // 15
    'UX' + // 16
    'OH' + // 17
    'RX' + // 18
    'LX' + // 19
    'WX' + // 20
    'YX' + // 21
    'WH' + // 22
    'R*' + // 23
    'L*' + // 24
    'W*' + // 25
    'Y*' + // 26
    'M*' + // 27
    'N*' + // 28
    'NX' + // 29
    'DX' + // 30
    'Q*' + // 31
    'S*' + // 32
    'SH' + // 33
    'F*' + // 34
    'TH' + // 35
    '/H' + // 36
    '/X' + // 37
    'Z*' + // 38
    'ZH' + // 39
    'V*' + // 40
    'DH' + // 41
    'CH' + // 42
    '**' + // 43
    'J*' + // 44
    '**' + // 45
    '**' + // 46
    '**' + // 47
    'EY' + // 48
    'AY' + // 49
    'OY' + // 50
    'AW' + // 51
    'OW' + // 52
    'UW' + // 53
    'B*' + // 54
    '**' + // 55
    '**' + // 56
    'D*' + // 57
    '**' + // 58
    '**' + // 59
    'G*' + // 60
    '**' + // 61
    '**' + // 62
    'GX' + // 63
    '**' + // 64
    '**' + // 65
    'P*' + // 66
    '**' + // 67
    '**' + // 68
    'T*' + // 69
    '**' + // 70
    '**' + // 71
    'K*' + // 72
    '**' + // 73
    '**' + // 74
    'KX' + // 75
    '**' + // 76
    '**' + // 77
    'UL' + // 78
    'UM' + // 79
    'UN'   // 80
  ).match(/.{1,2}/g);

  /**
   * Flags for phoneme names.
   *
   * Merged from the original two tables via: oldFlags[i] | (oldFlags2[i] << 8)
   *
   *  0x8000
   *    ' *', '.*', '?*', ',*', '-*'
   *  0x4000
   *    '.*', '?*', ',*', '-*', 'Q*'
   *  0x2000  FLAG_FRICATIVE
   *    'S*', 'SH', 'F*', 'TH', 'Z*', 'ZH', 'V*', 'DH', 'CH', '**', '**'
   *  0x1000  FLAG_LIQUIC
   *    'R*', 'L*', 'W*', 'Y*'
   *  0x0800  FLAG_NASAL
   *    'M*', 'N*', 'NX'
   *  0x0400  FLAG_ALVEOLAR
   *    'N*', 'DX', 'S*', 'TH', 'Z*', 'DH', 'D*', '**', '**', 'T*', '**',
   *    '**'
   *  0x0200
   *    --- not used ---
   *  0x0100  FLAG_PUNCT
   *    '.*', '?*', ',*', '-*'
   *  0x0080  FLAG_VOWEL
   *    'IY', 'IH', 'EH', 'AE', 'AA', 'AH', 'AO', 'UH', 'AX', 'IX', 'ER',
   *    'UX', 'OH', 'RX', 'LX', 'WX', 'YX', 'EY', 'AY', 'OY', 'AW', 'OW',
   *    'UW', 'UL', 'UM', 'UN'
   *  0x0040  FLAG_CONSONANT
   *    'WH', 'R*', 'L*', 'W*', 'Y*', 'M*', 'N*', 'NX', 'DX', 'Q*', 'S*',
   *    'SH', 'F*', 'TH', '/H', '/X', 'Z*', 'ZH', 'V*', 'DH', 'CH', '**',
   *    'J*', '**', 'B*', '**', '**', 'D*', '**', '**', 'G*', '**', '**',
   *    'GX', '**', '**', 'P*', '**', '**', 'T*', '**', '**', 'K*', '**',
   *    '**', 'KX', '**', '**', 'UM', 'UN'
   *  0x0020  FLAG_DIP_YX  but looks like front vowels
   *    'IY', 'IH', 'EH', 'AE', 'AA', 'AH', 'AX', 'IX', 'EY', 'AY', 'OY'
   *  0x0010  FLAG_DIPTHONG
   *    'EY', 'AY', 'OY', 'AW', 'OW', 'UW'
   *  0x0008
   *    'M*', 'N*', 'NX', 'DX', 'Q*', 'CH', 'J*', 'B*', '**', '**', 'D*',
   *    '**', '**', 'G*', '**', '**', 'GX', '**', '**', 'P*', '**', '**',
   *    'T*', '**', '**', 'K*', '**', '**', 'KX', '**', '**'
   *  0x0004  FLAG_VOICED
   *    'IY', 'IH', 'EH', 'AE', 'AA', 'AH', 'AO', 'UH', 'AX', 'IX', 'ER',
   *    'UX', 'OH', 'RX', 'LX', 'WX', 'YX', 'WH', 'R*', 'L*', 'W*', 'Y*',
   *    'M*', 'N*', 'NX', 'Q*', 'Z*', 'ZH', 'V*', 'DH', 'J*', '**', 'EY',
   *    'AY', 'OY', 'AW', 'OW', 'UW', 'B*', '**', '**', 'D*', '**', '**',
   *    'G*', '**', '**', 'GX', '**', '**'
   *  0x0002  FLAG_STOPCONS
   *    'B*', '**', '**', 'D*', '**', '**', 'G*', '**', '**', 'GX', '**',
   *    '**', 'P*', '**', '**', 'T*', '**', '**', 'K*', '**', '**', 'KX',
   *    '**', '**'
   *  0x0001  FLAG_UNVOICED_STOPCONS
   *    'P*', '**', '**', 'T*', '**', '**', 'K*', '**', '**', 'KX', '**',
   *    '**', 'UM', 'UN'
   */
  var phonemeFlags = [
    0 | 0x8000,                                                                                                                                        // ' *' 00
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // '.*' 01
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // '?*' 02
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // ',*' 03
    0 | 0x8000 | 0x4000                                              | 0x0100,                                                                         // '-*' 04
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'IY' 05
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'IH' 06
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'EH' 07
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AE' 08
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AA' 09
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AH' 10
    0                                                                         | 0x0080                                     | 0x0004,                   // 'AO' 11
    0                                                                         | 0x0080                                     | 0x0004,                   // 'UH' 12
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'AX' 13
    0                                                                         | 0x0080          | 0x0020                   | 0x0004,                   // 'IX' 14
    0                                                                         | 0x0080                                     | 0x0004,                   // 'ER' 15
    0                                                                         | 0x0080                                     | 0x0004,                   // 'UX' 16
    0                                                                         | 0x0080                                     | 0x0004,                   // 'OH' 17
    0                                                                         | 0x0080                                     | 0x0004,                   // 'RX' 18
    0                                                                         | 0x0080                                     | 0x0004,                   // 'LX' 19
    0                                                                         | 0x0080                                     | 0x0004,                   // 'WX' 20
    0                                                                         | 0x0080                                     | 0x0004,                   // 'YX' 21
    0                                                                                  | 0x0040                            | 0x0004,                   // 'WH' 22
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'R*' 23
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'L*' 24
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'W*' 25
    0                            | 0x1000                                              | 0x0040                            | 0x0004,                   // 'Y*' 26
    0                                     | 0x0800                                     | 0x0040                   | 0x0008 | 0x0004,                   // 'M*' 27
    0                                     | 0x0800 | 0x0400                            | 0x0040                   | 0x0008 | 0x0004,                   // 'N*' 28
    0                                     | 0x0800                                     | 0x0040                   | 0x0008 | 0x0004,                   // 'NX' 29
    0                                              | 0x0400                            | 0x0040                   | 0x0008,                            // 'DX' 30
    0          | 0x4000                                                                | 0x0040                   | 0x0008 | 0x0004,                   // 'Q*' 31
    0                   | 0x2000                   | 0x0400                            | 0x0040,                                                       // 'S*' 32
    0                   | 0x2000                                                       | 0x0040,                                                       // 'SH' 33
    0                   | 0x2000                                                       | 0x0040,                                                       // 'F*' 34
    0                   | 0x2000                   | 0x0400                            | 0x0040,                                                       // 'TH' 35
    0                                                                                  | 0x0040,                                                       // '/H' 36
    0                                                                                  | 0x0040,                                                       // '/X' 37
    0                   | 0x2000                   | 0x0400                            | 0x0040                            | 0x0004,                   // 'Z*' 38
    0                   | 0x2000                                                       | 0x0040                            | 0x0004,                   // 'ZH' 39
    0                   | 0x2000                                                       | 0x0040                            | 0x0004,                   // 'V*' 40
    0                   | 0x2000                   | 0x0400                            | 0x0040                            | 0x0004,                   // 'DH' 41
    0                   | 0x2000                                                       | 0x0040                   | 0x0008,                            // 'CH' 42
    0                   | 0x2000                                                       | 0x0040,                                                       // '**' 43
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004,                   // 'J*' 44
    0                   | 0x2000                                                       | 0x0040                            | 0x0004,                   // '**' 45
    0,                                                                                                                                                 // '**' 46
    0,                                                                                                                                                 // '**' 47
    0                                                                         | 0x0080          | 0x0020 | 0x0010          | 0x0004,                   // 'EY' 48
    0                                                                         | 0x0080          | 0x0020 | 0x0010          | 0x0004,                   // 'AY' 49
    0                                                                         | 0x0080          | 0x0020 | 0x0010          | 0x0004,                   // 'OY' 50
    0                                                                         | 0x0080                   | 0x0010          | 0x0004,                   // 'AW' 51
    0                                                                         | 0x0080                   | 0x0010          | 0x0004,                   // 'OW' 52
    0                                                                         | 0x0080                   | 0x0010          | 0x0004,                   // 'UW' 53
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'B*' 54
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 55
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 56
    0                                              | 0x0400                            | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'D*' 57
    0                                              | 0x0400                            | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 58
    0                                              | 0x0400                            | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 59
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'G*' 60
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 61
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 62
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // 'GX' 63
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 64
    0                                                                                  | 0x0040                   | 0x0008 | 0x0004 | 0x0002,          // '**' 65
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'P*' 66
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 67
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 68
    0                                              | 0x0400                            | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'T*' 69
    0                                              | 0x0400                            | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 70
    0                                              | 0x0400                            | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 71
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'K*' 72
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 73
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 74
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // 'KX' 75
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 76
    0                                                                                  | 0x0040                   | 0x0008          | 0x0002 | 0x0001, // '**' 77
    0                                                                         | 0x0080,                                                                // 'UL' 78
    0                                                                         | 0x0080 | 0x0040                                              | 0x0001, // 'UM' 79
    0                                                                         | 0x0080 | 0x0040                                              | 0x0001  // 'UN' 80
  ];

  /**
   * Combined table of phoneme length.
   *
   * Merged from the original two tables via: phonemeLengthTable[i] | (phonemeStressedLengthTable[i] << 8)
   *
   * Use via:
   *  phonemeLengthTable[i] = combinedPhonemeLengthTable[i] & 0xFF
   *  phonemeStressedLengthTable[i] = combinedPhonemeLengthTable[i] >> 8
   */
  var combinedPhonemeLengthTable = [
    0x0000 | 0x0000, // ' *' 00
    0x0012 | 0x1200, // '.*' 01
    0x0012 | 0x1200, // '?*' 02
    0x0012 | 0x1200, // ',*' 03
    0x0008 | 0x0800, // '-*' 04
    0x0008 | 0x0B00, // 'IY' 05
    0x0008 | 0x0900, // 'IH' 06
    0x0008 | 0x0B00, // 'EH' 07
    0x0008 | 0x0E00, // 'AE' 08
    0x000B | 0x0F00, // 'AA' 09
    0x0006 | 0x0B00, // 'AH' 10
    0x000C | 0x1000, // 'AO' 11
    0x000A | 0x0C00, // 'UH' 12
    0x0005 | 0x0600, // 'AX' 13
    0x0005 | 0x0600, // 'IX' 14
    0x000B | 0x0E00, // 'ER' 15
    0x000A | 0x0C00, // 'UX' 16
    0x000A | 0x0E00, // 'OH' 17
    0x000A | 0x0C00, // 'RX' 18
    0x0009 | 0x0B00, // 'LX' 19
    0x0008 | 0x0800, // 'WX' 20
    0x0007 | 0x0800, // 'YX' 21
    0x0009 | 0x0B00, // 'WH' 22
    0x0007 | 0x0A00, // 'R*' 23
    0x0006 | 0x0900, // 'L*' 24
    0x0008 | 0x0800, // 'W*' 25
    0x0006 | 0x0800, // 'Y*' 26
    0x0007 | 0x0800, // 'M*' 27
    0x0007 | 0x0800, // 'N*' 28
    0x0007 | 0x0800, // 'NX' 29
    0x0002 | 0x0300, // 'DX' 30
    0x0005 | 0x0500, // 'Q*' 31
    0x0002 | 0x0200, // 'S*' 32
    0x0002 | 0x0200, // 'SH' 33
    0x0002 | 0x0200, // 'F*' 34
    0x0002 | 0x0200, // 'TH' 35
    0x0002 | 0x0200, // '/H' 36
    0x0002 | 0x0200, // '/X' 37
    0x0006 | 0x0600, // 'Z*' 38
    0x0006 | 0x0600, // 'ZH' 39
    0x0007 | 0x0800, // 'V*' 40
    0x0006 | 0x0600, // 'DH' 41
    0x0006 | 0x0600, // 'CH' 42
    0x0002 | 0x0200, // '**' 43
    0x0008 | 0x0900, // 'J*' 44
    0x0003 | 0x0400, // '**' 45
    0x0001 | 0x0200, // '**' 46
    0x001E | 0x0100, // '**' 47
    0x000D | 0x0E00, // 'EY' 48
    0x000C | 0x0F00, // 'AY' 49
    0x000C | 0x0F00, // 'OY' 50
    0x000C | 0x0F00, // 'AW' 51
    0x000E | 0x0E00, // 'OW' 52
    0x0009 | 0x0E00, // 'UW' 53
    0x0006 | 0x0800, // 'B*' 54
    0x0001 | 0x0200, // '**' 55
    0x0002 | 0x0200, // '**' 56
    0x0005 | 0x0700, // 'D*' 57
    0x0001 | 0x0200, // '**' 58
    0x0001 | 0x0100, // '**' 59
    0x0006 | 0x0700, // 'G*' 60
    0x0001 | 0x0200, // '**' 61
    0x0002 | 0x0200, // '**' 62
    0x0006 | 0x0700, // 'GX' 63
    0x0001 | 0x0200, // '**' 64
    0x0002 | 0x0200, // '**' 65
    0x0008 | 0x0800, // 'P*' 66
    0x0002 | 0x0200, // '**' 67
    0x0002 | 0x0200, // '**' 68
    0x0004 | 0x0600, // 'T*' 69
    0x0002 | 0x0200, // '**' 70
    0x0002 | 0x0200, // '**' 71
    0x0006 | 0x0700, // 'K*' 72
    0x0001 | 0x0200, // '**' 73
    0x0004 | 0x0400, // '**' 74
    0x0006 | 0x0700, // 'KX' 75
    0x0001 | 0x0100, // '**' 76
    0x0004 | 0x0400, // '**' 77
    0x00C7 | 0x0500, // 'UL' 78
    0x00FF | 0x0500  // 'UM' 79
  ];

  /*

  Ind  | phoneme |  flags   |
  -----|---------|----------|
  0    |   *     | 00000000 |
  1    |  .*     | 00000000 |
  2    |  ?*     | 00000000 |
  3    |  ,*     | 00000000 |
  4    |  -*     | 00000000 |

  VOWELS
  5    |  IY     | 10100100 |
  6    |  IH     | 10100100 |
  7    |  EH     | 10100100 |
  8    |  AE     | 10100100 |
  9    |  AA     | 10100100 |
  10   |  AH     | 10100100 |
  11   |  AO     | 10000100 |
  17   |  OH     | 10000100 |
  12   |  UH     | 10000100 |
  16   |  UX     | 10000100 |
  15   |  ER     | 10000100 |
  13   |  AX     | 10100100 |
  14   |  IX     | 10100100 |

  DIPHTONGS
  48   |  EY     | 10110100 |
  49   |  AY     | 10110100 |
  50   |  OY     | 10110100 |
  51   |  AW     | 10010100 |
  52   |  OW     | 10010100 |
  53   |  UW     | 10010100 |


  21   |  YX     | 10000100 |
  20   |  WX     | 10000100 |
  18   |  RX     | 10000100 |
  19   |  LX     | 10000100 |
  37   |  /X     | 01000000 |
  30   |  DX     | 01001000 |


  22   |  WH     | 01000100 |


  VOICED CONSONANTS
  23   |  R*     | 01000100 |
  24   |  L*     | 01000100 |
  25   |  W*     | 01000100 |
  26   |  Y*     | 01000100 |
  27   |  M*     | 01001100 |
  28   |  N*     | 01001100 |
  29   |  NX     | 01001100 |
  54   |  B*     | 01001110 |
  57   |  D*     | 01001110 |
  60   |  G*     | 01001110 |
  44   |  J*     | 01001100 |
  38   |  Z*     | 01000100 |
  39   |  ZH     | 01000100 |
  40   |  V*     | 01000100 |
  41   |  DH     | 01000100 |

  unvoiced CONSONANTS
  32   |  S*     | 01000000 |
  33   |  SH     | 01000000 |
  34   |  F*     | 01000000 |
  35   |  TH     | 01000000 |
  66   |  P*     | 01001011 |
  69   |  T*     | 01001011 |
  72   |  K*     | 01001011 |
  42   |  CH     | 01001000 |
  36   |  /H     | 01000000 |

  43   |  **     | 01000000 |
  45   |  **     | 01000100 |
  46   |  **     | 00000000 |
  47   |  **     | 00000000 |


  55   |  **     | 01001110 |
  56   |  **     | 01001110 |
  58   |  **     | 01001110 |
  59   |  **     | 01001110 |
  61   |  **     | 01001110 |
  62   |  **     | 01001110 |
  63   |  GX     | 01001110 |
  64   |  **     | 01001110 |
  65   |  **     | 01001110 |
  67   |  **     | 01001011 |
  68   |  **     | 01001011 |
  70   |  **     | 01001011 |
  71   |  **     | 01001011 |
  73   |  **     | 01001011 |
  74   |  **     | 01001011 |
  75   |  KX     | 01001011 |
  76   |  **     | 01001011 |
  77   |  **     | 01001011 |


  SPECIAL
  78   |  UL     | 10000000 |
  79   |  UM     | 11000001 |
  80   |  UN     | 11000001 |
  31   |  Q*     | 01001100 |

  */

  /**
   * Match both characters but not with wildcards.
   *
   * @param {string} sign1
   * @param {string} sign2
   * @return {boolean|Number}
   */
  function full_match(sign1, sign2) {
    var index = PhonemeNameTable.findIndex(function (value) {
      return ((value === sign1 + sign2) && (value[1] !== '*'))
    });
    return index !== -1 ? index : false;
  }

  /**
   * Match character with wildcard.
   *
   * @param {string} sign1
   * @return {boolean|Number}
   */
  function wild_match (sign1) {
    var index = PhonemeNameTable.findIndex(function (value) {
      return (value === sign1 + '*')
    });
    return index !== -1 ? index : false;
  }

  /**
   * The input[] buffer contains a string of phonemes and stress markers along
   * the lines of:
   *
   *     DHAX KAET IHZ AH5GLIY.
   *
   * Some phonemes are 2 bytes long, such as "DH" and "AX".
   * Others are 1 byte long, such as "T" and "Z".
   * There are also stress markers, such as "5" and ".".
   *
   * The characters of the phonemes are stored in the table PhonemeNameTable.
   * The stress characters are arranged in low to high stress order in StressTable[].
   *
   * The following process is used to parse the input buffer:
   *
   * Repeat until the end is reached:
   * 1. First, a search is made for a 2 character match for phonemes that do not
   *    end with the '*' (wildcard) character. On a match, the index of the phoneme
   *    is added to the result and the buffer position is advanced 2 bytes.
   *
   * 2. If this fails, a search is made for a 1 character match against all
   *    phoneme names ending with a '*' (wildcard). If this succeeds, the
   *    phoneme is added to result and the buffer position is advanced
   *    1 byte.
   *
   * 3. If this fails, search for a 1 character match in the stressInputTable[].
   *   If this succeeds, the stress value is placed in the last stress[] table
   *   at the same index of the last added phoneme, and the buffer position is
   *   advanced by 1 byte.
   *
   * If this fails, return false.
   *
   * On success:
   *
   *    1. phonemeIndex[] will contain the index of all the phonemes.
   *    2. The last index in phonemeIndex[] will be 255.
   *    3. stress[] will contain the stress value for each phoneme
   *
   * input holds the string of phonemes, each two bytes wide
   * signInputTable1[] holds the first character of each phoneme
   * signInputTable2[] holds the second character of each phoneme
   * phonemeIndex[] holds the indexes of the phonemes after parsing input[]
   *
   * The parser scans through the input[], finding the names of the phonemes
   * by searching signInputTable1[] and signInputTable2[]. On a match, it
   * copies the index of the phoneme into the phonemeIndexTable[].
   *
   * @param {string}   input      Holds the string of phonemes, each two bytes wide.
   * @param {function} addPhoneme The callback to use to store phoneme index values.
   * @param {function} addStress  The callback to use to store stress index values.
   *
   * @return {undefined}
   */
  function Parser1(input, addPhoneme, addStress) {
    for (var srcPos=0;srcPos<input.length;srcPos++) {
      {
        var tmp = input.toLowerCase();
        console.log(
          ("processing \"" + (tmp.substr(0, srcPos)) + "%c" + (tmp.substr(srcPos, 2).toUpperCase()) + "%c" + (tmp.substr(srcPos + 2)) + "\""),
           'color: red;',
           'color:normal;'
        );
      }
      var sign1 = input[srcPos];
      var sign2 = input[srcPos + 1] || '';
      var match = (void 0);
      if ((match = full_match(sign1, sign2)) !== false) {
        // Matched both characters (no wildcards)
        srcPos++; // Skip the second character of the input as we've matched it
        addPhoneme(match);
        continue;
      }
      if ((match = wild_match(sign1)) !== false) {
        // Matched just the first character (with second character matching '*'
        addPhoneme(match);
        continue;
      }

      // Should be a stress character. Search through the stress table backwards.
      match = StressTable.length;
      while ((sign1 !== StressTable[match]) && (match > 0)) {
        --match;
      }

      if (match === 0) {
        {
          throw Error(("Could not parse char " + sign1));
        }
      }
      addStress(match); // Set stress for prior phoneme
    }
  }

  /**
   * Test if a phoneme has the given flag.
   *
   * @param {Number} phoneme The phoneme to test.
   * @param {Number} flag    The flag to test (see constants.es6)
   *
   * @return {boolean}
   */
  function phonemeHasFlag(phoneme, flag) {
    return matchesBitmask(phonemeFlags[phoneme], flag);
  }

  var pR    = 23;
  var pD    = 57;
  var pT    = 69;

  var PHONEME_PERIOD = 1;
  var PHONEME_QUESTION = 2;


  var FLAG_FRICATIVE= 0x2000;

  /**
   * liquic consonant
   */
  var FLAG_LIQUIC   = 0x1000;

  var FLAG_NASAL    = 0x0800;

  var FLAG_ALVEOLAR = 0x0400;

  var FLAG_PUNCT    = 0x0100;

  var FLAG_VOWEL    = 0x0080;

  var FLAG_CONSONANT$1= 0x0040;
  /**
   *  dipthong ending with YX
   *
   */
  var FLAG_DIP_YX   = 0x0020;

  var FLAG_DIPTHONG$1 = 0x0010;
  /** unknown:
   *    'M*', 'N*', 'NX', 'DX', 'Q*', 'CH', 'J*', 'B*', '**', '**', 'D*',
   *    '**', '**', 'G*', '**', '**', 'GX', '**', '**', 'P*', '**', '**',
   *    'T*', '**', '**', 'K*', '**', '**', 'KX', '**', '**'
   */
  var FLAG_0008     = 0x0008;

  var FLAG_VOICED$1   = 0x0004;

  /**
   * stop consonant
   */
  var FLAG_STOPCONS = 0x0002;

  var FLAG_UNVOICED_STOPCONS  = 0x0001;

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
  function Parser2(insertPhoneme, setPhoneme, getPhoneme, getStress) {
    /**
     * Rewrites:
     *  'UW' => 'UX' if alveolar flag set on previous phoneme.
     *  'CH' => 'CH' '**'(43)
     *  'J*' => 'J*' '**'(45)
     * @param phoneme
     * @param pos
     */
    var handleUW_CH_J = function (phoneme, pos) {
      switch (phoneme) {
        // 'UW' Example: NEW, DEW, SUE, ZOO, THOO, TOO
        case 53: {
          // ALVEOLAR flag set?
          if (phonemeHasFlag(getPhoneme(pos - 1), FLAG_ALVEOLAR)) {
            { console.log((pos + " RULE: <ALVEOLAR> UW -> <ALVEOLAR> UX")); }
            setPhoneme(pos, 16); // UX
          }
          break;
        }
        // 'CH' Example: CHEW
        case 42: {
          { console.log((pos + " RULE: CH -> CH CH+1")); }
          insertPhoneme(pos + 1, 43, getStress(pos)); // '**'
          break;
        }
        // 'J*' Example: JAY
        case 44: {
          { console.log((pos + " RULE: J -> J J+1")); }
          insertPhoneme(pos + 1, 45, getStress(pos)); // '**'
          break;
        }
      }
    };

    var changeAX = function (position, suffix) {
      {
        console.log((position + " RULE: " + (PhonemeNameTable[getPhoneme(position)]) + " -> AX " + (PhonemeNameTable[suffix])));
      }
      setPhoneme(position, 13); // 'AX'
      insertPhoneme(position + 1, suffix, getStress(position));
    };

    var pos = -1;
    var phoneme;

    while((phoneme = getPhoneme(++pos)) !== END) {
      // Is phoneme pause?
      if (phoneme === 0) {
        continue;
      }

      if (phonemeHasFlag(phoneme, FLAG_DIPTHONG$1)) {
        // <DIPHTHONG ENDING WITH WX> -> <DIPHTHONG ENDING WITH WX> WX
        // <DIPHTHONG NOT ENDING WITH WX> -> <DIPHTHONG NOT ENDING WITH WX> YX
        // Example: OIL, COW
        {
          console.log(
            !phonemeHasFlag(phoneme, FLAG_DIP_YX)
              ? (pos + " RULE: insert WX following diphthong NOT ending in IY sound")
              : (pos + " RULE: insert YX following diphthong ending in IY sound")
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
            {
              console.log(((pos+2) + " RULE: Insert glottal stop between two stressed vowels with space between them"));
            }
            insertPhoneme(pos+2, 31, 0); // 31 = 'Q'
          }
        }
        continue;
      }

      var priorPhoneme = (pos === 0) ? END : getPhoneme(pos - 1);

      if (phoneme === pR) {
        // RULES FOR PHONEMES BEFORE R
        switch (priorPhoneme) {
          case pT: {
            // Example: TRACK
            { console.log((pos + " RULE: T* R* -> CH R*")); }
            setPhoneme(pos - 1, 42); // 'T*' 'R*' -> 'CH' 'R*'
            break;
          }
          case pD: {
            // Example: DRY
            { console.log((pos + " RULE: D* R* -> J* R*")); }
            setPhoneme(pos - 1, 44); // 'J*'
            break;
          }
          default: {
            if (phonemeHasFlag(priorPhoneme, FLAG_VOWEL)) {
              // Example: ART
              { console.log((pos + " <VOWEL> R* -> <VOWEL> RX")); }
              setPhoneme(pos, 18); // 'RX'
            }
          }
        }
        continue;
      }

      // 'L*'
      if ((phoneme === 24) && phonemeHasFlag(priorPhoneme, FLAG_VOWEL)) {
        // Example: ALL
        { console.log((pos + " <VOWEL> L* -> <VOWEL> LX")); }
        setPhoneme(pos, 19); // 'LX'
        continue;
      }
      // 'G*' 'S*'
      if (priorPhoneme === 60 && phoneme === 32) {
        // Can't get to fire -
        //       1. The G -> GX rule intervenes
        //       2. Reciter already replaces GS -> GZ
        { console.log((pos + " G S -> G Z")); }
        setPhoneme(pos, 38);
        continue;
      }

      // 'G*'
      if (phoneme === 60) {
        // G <VOWEL OR DIPHTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPHTHONG NOT ENDING WITH IY>
        // Example: GO
        var phoneme$1 = getPhoneme(pos + 1);
        // If diphthong ending with YX, move continue processing next phoneme
        if (!phonemeHasFlag(phoneme$1, FLAG_DIP_YX) && (phoneme$1 !== END)) {
          // replace G with GX and continue processing next phoneme
          {
            console.log(
              (pos + " RULE: G <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> GX <VOWEL OR DIPTHONG NOT ENDING WITH IY>")
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
        var Y = getPhoneme(pos + 1);
        // If at end, replace current phoneme with KX
        if (!phonemeHasFlag(Y, FLAG_DIP_YX) || Y === END) {
          // VOWELS AND DIPHTHONGS ENDING WITH IY SOUND flag set?
          {
            console.log((pos + " K <VOWEL OR DIPTHONG NOT ENDING WITH IY> -> KX <VOWEL OR DIPTHONG NOT ENDING WITH IY>"));
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
        {
          console.log((pos + " RULE: S* " + (PhonemeNameTable[phoneme]) + " -> S* " + (PhonemeNameTable[phoneme-12])));
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
            {
              console.log((pos + " Soften T or D following vowel or ER and preceding a pause -> DX"));
            }
            setPhoneme(pos, 30);
          }
        }
        continue;
      }

      {
        console.log((pos + ": " + (PhonemeNameTable[phoneme])));
      }
    } // while
  }

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
  function AdjustLengths(getPhoneme, setLength, getLength) {
    {
      console.log("AdjustLengths()");
    }

    // LENGTHEN VOWELS PRECEDING PUNCTUATION
    //
    // Search for punctuation. If found, back up to the first vowel, then
    // process all phonemes between there and up to (but not including) the punctuation.
    // If any phoneme is found that is a either a fricative or voiced, the duration is
    // increased by (length * 1.5) + 1

    // loop index
    for (var position = 0;getPhoneme(position) !== END;position++) {
      // not punctuation?
      if(!phonemeHasFlag(getPhoneme(position), FLAG_PUNCT)) {
        continue;
      }
      var loopIndex$1 = position;
      while ((--position > 1) && !phonemeHasFlag(getPhoneme(position), FLAG_VOWEL)) { /* back up while not a vowel */ }
      // If beginning of phonemes, exit loop.
      if (position === 0) {
        break;
      }

      // Now handle everything between position and loopIndex
      for (var vowel=position;position<loopIndex$1;position++) {
        // test for not fricative/unvoiced or not voiced
        if(!phonemeHasFlag(getPhoneme(position), FLAG_FRICATIVE) || phonemeHasFlag(getPhoneme(position), FLAG_VOICED$1)) {
          var A = getLength(position);
          // change phoneme length to (length * 1.5) + 1
          {
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
    var loopIndex = -1;
    var phoneme;

    while((phoneme = getPhoneme(++loopIndex)) !== END) {
      var position$1 = loopIndex;
      // vowel?
      if (phonemeHasFlag(phoneme, FLAG_VOWEL)) {
        // get next phoneme
        phoneme = getPhoneme(++position$1);
        // not a consonant
        if (!phonemeHasFlag(phoneme, FLAG_CONSONANT$1)) {
          // 'RX' or 'LX'?
          if (((phoneme === 18) || (phoneme === 19)) && phonemeHasFlag(getPhoneme(++position$1), FLAG_CONSONANT$1)) {
            // followed by consonant?
            {
              console.log(
                loopIndex +
                ' RULE: <VOWEL ' +
                PhonemeNameTable[getPhoneme(loopIndex)] +
                '>' + PhonemeNameTable[phoneme] +
                ' <CONSONANT: ' + PhonemeNameTable[getPhoneme(position$1)] +
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
        var flags = (phoneme === END) ? (FLAG_CONSONANT$1 | FLAG_UNVOICED_STOPCONS) : phonemeFlags[phoneme];
        // Unvoiced
        if (!matchesBitmask(flags, FLAG_VOICED$1)) {
          // *, .*, ?*, ,*, -*, DX, S*, SH, F*, TH, /H, /X, CH, P*, T*, K*, KX

          // unvoiced plosive
          if(matchesBitmask(flags, FLAG_UNVOICED_STOPCONS)) {
            // RULE: <VOWEL> <UNVOICED PLOSIVE>
            // <VOWEL> <P*, T*, K*, KX>
            {
              console.log((loopIndex + " <VOWEL> <UNVOICED PLOSIVE> - decrease vowel by 1/8th"));
            }
            var A$1 = getLength(loopIndex);
            setLength(loopIndex, A$1 - (A$1 >> 3));
          }
          continue;
        }

        // RULE: <VOWEL> <VOWEL or VOICED CONSONANT>
        // <VOWEL> <IY, IH, EH, AE, AA, AH, AO, UH, AX, IX, ER, UX, OH, RX, LX, WX, YX, WH, R*, L*, W*,
        //          Y*, M*, N*, NX, Q*, Z*, ZH, V*, DH, J*, EY, AY, OY, AW, OW, UW, B*, D*, G*, GX>
        {
          console.log((loopIndex + " RULE: <VOWEL> <VOWEL or VOICED CONSONANT> - increase vowel by 1/4 + 1"));
        }
        // increase length
        var A$2 = getLength(loopIndex);
        setLength(loopIndex, (A$2 >> 2) + A$2 + 1); // 5/4*A + 1
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
        phoneme = getPhoneme(++position$1);
        // is next phoneme a stop consonant?
        if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
          // B*, D*, G*, GX, P*, T*, K*, KX
          {
            console.log((position$1 + " RULE: <NASAL> <STOP CONSONANT> - set nasal = 5, consonant = 6"));
          }
          setLength(position$1, 6); // set stop consonant length to 6
          setLength(position$1 - 1, 5); // set nasal length to 5
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

        while ((phoneme = getPhoneme(++position$1)) === 0) { /* move past silence */ }
        // if another stop consonant, process.
        if (phoneme !== END && phonemeHasFlag(phoneme, FLAG_STOPCONS)) {
          // RULE: <STOP CONSONANT> {optional silence} <STOP CONSONANT>
          {
            console.log(
              (position$1 + " RULE: <STOP CONSONANT> {optional silence} <STOP CONSONANT> - shorten both to 1/2 + 1")
            );
          }
          setLength(position$1, (getLength(position$1) >> 1) + 1);
          setLength(loopIndex, (getLength(loopIndex) >> 1) + 1);
        }
        continue;
      }

      //  *, .*, ?*, ,*, -*, WH, R*, L*, W*, Y*, DX, Q*, S*, SH, F*, TH,
      // /H, /X, Z*, ZH, V*, DH, CH, J*

      // liquic consonant?
      if ((position$1>0)
        && phonemeHasFlag(phoneme, FLAG_LIQUIC)
        && phonemeHasFlag(getPhoneme(position$1-1), FLAG_STOPCONS)) {
        // R*, L*, W*, Y*
        // RULE: <STOP CONSONANT> <LIQUID>
        //       Decrease <LIQUID> by 2
        // prior phoneme is a stop consonant
        {
          console.log((position$1 + " RULE: <STOP CONSONANT> <LIQUID> - decrease by 2"));
        }
        // decrease the phoneme length by 2 frames (20 ms)
        setLength(position$1, getLength(position$1) - 2);
      }
    }
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
   * of 5 on the diphthong OY. This routine will copy the stress value of 6 (5+1)
   * to the L that precedes it.
   *
   * @param {getPhoneme}       getPhoneme Callback for retrieving phonemes.
   * @param {getPhonemeStress} getStress  Callback for retrieving phoneme stress.
   * @param {setPhonemeStress} setStress  Callback for setting phoneme stress.
   *
   * @return undefined
   */
  function CopyStress(getPhoneme, getStress, setStress) {
    // loop through all the phonemes to be output
    var position = 0;
    var phoneme;
    while((phoneme = getPhoneme(position)) !== END) {
      // if CONSONANT_FLAG set, skip - only vowels get stress
      if (phonemeHasFlag(phoneme, FLAG_CONSONANT$1)) {
        phoneme = getPhoneme(position + 1);
        // if the following phoneme is the end, or a vowel, skip
        if ((phoneme !== END) && phonemeHasFlag(phoneme, FLAG_VOWEL)) {
          // get the stress value at the next position
          var stress = getStress(position + 1);
          if ((stress !== 0) && (stress < 0x80)) {
            // if next phoneme is stressed, and a VOWEL OR ER
            // copy stress from next phoneme to this one
            setStress(position, stress + 1);
          }
        }
      }
      ++position;
    }
  }

  /**
   * change phoneme length dependent on stress
   *
   * @param {getPhoneme}    getPhoneme Callback for retrieving phonemes.
   * @param {getPhonemeStress} getStress  Callback for retrieving phoneme length.
   * @param {setPhonemeLength} setLength  Callback for setting phoneme length.
   *
   * @return undefined
   */
  function SetPhonemeLength(getPhoneme, getStress, setLength) {
    var position = 0;
    var phoneme;
    while((phoneme = getPhoneme(position)) !== END) {
      var stress = getStress(position);
      if ((stress === 0) || (stress > 0x7F)) {
        setLength(position, combinedPhonemeLengthTable[phoneme] & 0xFF);
      } else {
        setLength(position, (combinedPhonemeLengthTable[phoneme] >> 8));
      }
      position++;
    }
  }

  /**
   *
   * @param {getPhoneme}       getPhoneme    Callback for retrieving phonemes.
   * @param {setPhoneme}       setPhoneme    Callback for setting phonemes.
   * @param {insertPhoneme}    insertPhoneme Callback for inserting phonemes.
   * @param {setPhonemeStress} setStress     Callback for setting phoneme stress.
   * @param {getPhonemeLength} getLength     Callback for getting phoneme length.
   * @param {setPhonemeLength} setLength     Callback for setting phoneme length.
   *
   * @return undefined
   */
  function InsertBreath(getPhoneme, setPhoneme, insertPhoneme, setStress, getLength, setLength) {
    var mem54 = 255;
    var len = 0; // mem55
    var index; //variable Y
    var pos = -1;
    while((index = getPhoneme(++pos)) !== END) {
      len += getLength(pos);
      if (len < 232) {
        if (phonemeHasFlag(index, FLAG_PUNCT)) {
          len = 0;
          insertPhoneme(pos + 1, BREAK, 0, 0);
          continue;
        }
        if (index === 0) {
          mem54 = pos;
        }
        continue;
      }
      pos = mem54;
      setPhoneme(pos, 31); // 'Q*' glottal stop
      setLength(pos, 4);
      setStress(pos, 0);
      len = 0;
      insertPhoneme(pos + 1, BREAK, 0, 0);
    }
  }

  /**
   * Makes plosive stop consonants longer by inserting the next two following
   * phonemes from the table right behind the consonant.
   *
   * @param {getPhoneme}       getPhoneme Callback for retrieving phonemes.
   * @param {insertPhoneme}    insertPhoneme Callback for inserting phonemes.
   * @param {getPhonemeStress} getStress Callback for retrieving stress.
   *
   * @return undefined
   */
  function ProlongPlosiveStopConsonantsCode41240(getPhoneme, insertPhoneme, getStress) {
    var pos=-1;
    var index;
    while ((index = getPhoneme(++pos)) !== END) {
      // Not a stop consonant, move to next one.
      if (!phonemeHasFlag(index, FLAG_STOPCONS)) {
        continue;
      }
      //If plosive, move to next non empty phoneme and validate the flags.
      if (phonemeHasFlag(index, FLAG_UNVOICED_STOPCONS)) {
        var nextNonEmpty = (void 0);
        var X = pos;
        do { nextNonEmpty = getPhoneme(++X); } while (nextNonEmpty === 0);
        // If not END and either flag 0x0008 or '/H' or '/X'
        if ((nextNonEmpty !== END)
          && (
            phonemeHasFlag(nextNonEmpty, FLAG_0008)
            || (nextNonEmpty === 36)
            || (nextNonEmpty === 37))
        ) {
          continue;
        }
      }
      insertPhoneme(pos + 1, index + 1, getStress(pos), combinedPhonemeLengthTable[index + 1] & 0xFF);
      insertPhoneme(pos + 2, index + 2, getStress(pos), combinedPhonemeLengthTable[index + 2] & 0xFF);
      pos += 2;
    }
  }

  /**
   * Parses speech data.
   *
   * Returns array of [phoneme, length, stress]
   *
   * @param {string} input
   *
   * @return {Array|Boolean} The parsed data.
   */
  function Parser (input) {
    if (!input) {
      return false;
    }
    var getPhoneme = function (pos) {
      {
        if (pos < 0 || pos > phonemeindex.length) {
          throw new Error('Out of bounds: ' + pos)
        }
      }
      return (pos === phonemeindex.length - 1) ? END : phonemeindex[pos]
    };
    var setPhoneme = function (pos, value) {
      {
        console.log((pos + " CHANGE: " + (PhonemeNameTable[phonemeindex[pos]]) + " -> " + (PhonemeNameTable[value])));
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
    var insertPhoneme = function (pos, value, stressValue, length) {
      {
        console.log((pos + " INSERT: " + (PhonemeNameTable[value])));
      }
      for(var i = phonemeindex.length - 1; i >= pos; i--) {
        phonemeindex[i+1]  = phonemeindex[i];
        phonemeLength[i+1] = getLength(i);
        stress[i+1]        = getStress(i);
      }
      phonemeindex[pos]  = value;
      phonemeLength[pos] = length | 0;
      stress[pos]        = stressValue;
    };
    var getStress = function (pos) { return stress[pos] | 0; };
    var setStress = function (pos, stressValue) {
      {
        console.log(
          (pos + " \"" + (PhonemeNameTable[phonemeindex[pos]]) + "\" SET STRESS: " + (stress[pos]) + " -> " + stressValue)
        );
      }
      stress[pos] = stressValue;
    };
    var getLength = function (pos) { return phonemeLength[pos] | 0; };
    var setLength = function (pos, length) {
      {
        console.log(
          (pos + " \"" + (PhonemeNameTable[phonemeindex[pos]]) + "\" SET LENGTH: " + (phonemeLength[pos]) + " -> " + length)
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

    var stress = []; //numbers from 0 to 8
    var phonemeLength = [];
    var phonemeindex = [];

    var pos = 0;
    Parser1(
      input,
      function (value) {
        stress[pos] = 0;
        phonemeLength[pos] = 0;
        phonemeindex[pos++] = value;
      },
      function (value) {
        {
          if ((value & 128) !== 0) {
            throw new Error('Got the flag 0x80, see CopyStress() and SetPhonemeLength() comments!');
          }
        }
        stress[pos - 1] = value; /* Set stress for prior phoneme */
      }
    );
    phonemeindex[pos] = END;

    {
      PrintPhonemes(phonemeindex, phonemeLength, stress);
    }
    Parser2(insertPhoneme, setPhoneme, getPhoneme, getStress);
    CopyStress(getPhoneme, getStress, setStress);
    SetPhonemeLength(getPhoneme, getStress, setLength);
    AdjustLengths(getPhoneme, setLength, getLength);
    ProlongPlosiveStopConsonantsCode41240(getPhoneme, insertPhoneme, getStress);

    for (var i = 0;i<phonemeindex.length;i++) {
      if (phonemeindex[i] > 80) {
        phonemeindex[i] = END;
        // FIXME: When will this ever be anything else than END?
        break; // error: delete all behind it
      }
    }

    InsertBreath(getPhoneme, setPhoneme, insertPhoneme, getStress, getLength, setLength);

    {
      PrintPhonemes(phonemeindex, phonemeLength, stress);
    }

    return phonemeindex.map(function (v, i) { return [v, phonemeLength[i] | 0, stress[i] | 0]; });
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
      var s = '000' + num;
      return s.substr(s.length - 3);
    }

    console.log('==================================');
    console.log('Internal Phoneme presentation:');
    console.log(' pos  idx  phoneme  length  stress');
    console.log('----------------------------------');
    var loop = function ( i ) {
      var name = function (phoneme) {
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
    };

    for (var i=0;i<phonemeindex.length;i++) loop( i );
    console.log('==================================');
  }

  // Values substituted for zero bits in unvoiced consonant samples.
  // tab48426
  var sampledConsonantValues0 = [0x18, 0x1A, 0x17, 0x17, 0x17];

  var stressPitch_tab47492 = [
    0x00, 0xE0, 0xE6, 0xEC, 0xF3, 0xF9, 0x00, 0x06, 0xC, 0x06
  ];

  // Used to decide which phoneme's blend lengths. The candidate with the lower score is selected.
  // tab45856
  var blendRank = [
    0x00, 0x1F, 0x1F, 0x1F, 0x1F, 0x02, 0x02, 0x02,
    0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x05, 0x05,
    0x02, 0x0A, 0x02, 0x08, 0x05, 0x05, 0x0B, 0x0A,
    0x09, 0x08, 0x08, 0xA0, 0x08, 0x08, 0x17, 0x1F,
    0x12, 0x12, 0x12, 0x12, 0x1E, 0x1E, 0x14, 0x14,
    0x14, 0x14, 0x17, 0x17, 0x1A, 0x1A, 0x1D, 0x1D,
    0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x1A, 0x1D,
    0x1B, 0x1A, 0x1D, 0x1B, 0x1A, 0x1D, 0x1B, 0x1A,
    0x1D, 0x1B, 0x17, 0x1D, 0x17, 0x17, 0x1D, 0x17,
    0x17, 0x1D, 0x17, 0x17, 0x1D, 0x17, 0x17, 0x17
  ];

  // Number of frames at the end of a phoneme devoted to interpolating to next phoneme's final value
  //tab45696
  var outBlendLength = [
    0x00, 0x02, 0x02, 0x02, 0x02, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x03, 0x02, 0x04, 0x04, 0x02, 0x02,
    0x02, 0x02, 0x02, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02,
    0x02, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x05,
    0x05, 0x05, 0x05, 0x05, 0x04, 0x04, 0x02, 0x00,
    0x01, 0x02, 0x00, 0x01, 0x02, 0x00, 0x01, 0x02,
    0x00, 0x01, 0x02, 0x00, 0x02, 0x02, 0x00, 0x01,
    0x03, 0x00, 0x02, 0x03, 0x00, 0x02, 0xA0, 0xA0
  ];

  // Number of frames at beginning of a phoneme devoted to interpolating to phoneme's final value
  // tab45776
  var inBlendLength = [
    0x00, 0x02, 0x02, 0x02, 0x02, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04,
    0x04, 0x04, 0x03, 0x03, 0x04, 0x04, 0x03, 0x03,
    0x03, 0x03, 0x03, 0x01, 0x02, 0x03, 0x02, 0x01,
    0x03, 0x03, 0x03, 0x03, 0x01, 0x01, 0x03, 0x03,
    0x03, 0x02, 0x02, 0x03, 0x02, 0x03, 0x00, 0x00,
    0x05, 0x05, 0x05, 0x05, 0x04, 0x04, 0x02, 0x00,
    0x02, 0x02, 0x00, 0x03, 0x02, 0x00, 0x04, 0x02,
    0x00, 0x03, 0x02, 0x00, 0x02, 0x02, 0x00, 0x02,
    0x03, 0x00, 0x03, 0x03, 0x00, 0x03, 0xB0, 0xA0
  ];

  // Consists of two bitfields:
  // Low 3 bits (masked by 7) select a 256-byte section in sampleTable,
  // as well as index into sampledConsonantValues0 for unvoiced.
  // High 5 bits (masked by 248 = 11111000), for unvoiced,
  // give inverted offset within the 256-byte section.
  //
  // 32: S*    241         11110001
  // 33: SH    226         11100010
  // 34: F*    211         11010011
  // 35: TH    187         10111011
  // 36: /H    124         01111100
  // 37: /X    149         10010101
  // 38: Z*    1           00000001
  // 39: ZH    2           00000010
  // 40: V*    3           00000011
  // 41: DH    3           00000011
  // 43: CH'   114         01110010
  // 45: J'    2           00000010
  // 67: P'    27          00011011
  // 70: T'    25          00011001
  // tab45936
  var sampledConsonantFlags = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xF1, 0xE2, 0xD3, 0xBB, 0x7C, 0x95, 0x01, 0x02,
    0x03, 0x03, 0x00, 0x72, 0x00, 0x02, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x1B, 0x00, 0x00, 0x19, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ];

  //
  var frequencyData = [
  //tab45056 |tab451356 |tab45216
  //  freq1  |  freq2   |  freq3
    0x000000 | 0x000000 | 0x000000, // ' *' 00
    0x000013 | 0x004300 | 0x5B0000, // '.*' 01
    0x000013 | 0x004300 | 0x5B0000, // '?*' 02
    0x000013 | 0x004300 | 0x5B0000, // ',*' 03
    0x000013 | 0x004300 | 0x5B0000, // '-*' 04
    0x00000A | 0x005400 | 0x6E0000, // 'IY' 05
    0x00000E | 0x004800 | 0x5D0000, // 'IH' 06
    0x000012 | 0x004200 | 0x5B0000, // 'EH' 07
    0x000018 | 0x003E00 | 0x580000, // 'AE' 08
    0x00001A | 0x002800 | 0x590000, // 'AA' 09
    0x000016 | 0x002C00 | 0x570000, // 'AH' 10
    0x000014 | 0x001E00 | 0x580000, // 'AO' 11
    0x000010 | 0x002400 | 0x520000, // 'UH' 12
    0x000014 | 0x002C00 | 0x590000, // 'AX' 13
    0x00000E | 0x004800 | 0x5D0000, // 'IX' 14
    0x000012 | 0x003000 | 0x3E0000, // 'ER' 15
    0x00000E | 0x002400 | 0x520000, // 'UX' 16
    0x000012 | 0x001E00 | 0x580000, // 'OH' 17
    0x000012 | 0x003200 | 0x3E0000, // 'RX' 18
    0x000010 | 0x002400 | 0x6E0000, // 'LX' 19
    0x00000C | 0x001C00 | 0x500000, // 'WX' 20
    0x00000E | 0x004400 | 0x5D0000, // 'YX' 21
    0x00000A | 0x001800 | 0x5A0000, // 'WH' 22
    0x000012 | 0x003200 | 0x3C0000, // 'R*' 23
    0x00000E | 0x001E00 | 0x6E0000, // 'L*' 24
    0x00000A | 0x001800 | 0x5A0000, // 'W*' 25
    0x000008 | 0x005200 | 0x6E0000, // 'Y*' 26
    0x000006 | 0x002E00 | 0x510000, // 'M*' 27
    0x000006 | 0x003600 | 0x790000, // 'N*' 28
    0x000006 | 0x005600 | 0x650000, // 'NX' 29
    0x000006 | 0x003600 | 0x790000, // 'DX' 30
    0x000011 | 0x004300 | 0x5B0000, // 'Q*' 31
    0x000006 | 0x004900 | 0x630000, // 'S*' 32
    0x000006 | 0x004F00 | 0x6A0000, // 'SH' 33
    0x000006 | 0x001A00 | 0x510000, // 'F*' 34
    0x000006 | 0x004200 | 0x790000, // 'TH' 35
    0x00000E | 0x004900 | 0x5D0000, // '/H' 36
    0x000010 | 0x002500 | 0x520000, // '/X' 37
    0x000009 | 0x003300 | 0x5D0000, // 'Z*' 38
    0x00000A | 0x004200 | 0x670000, // 'ZH' 39
    0x000008 | 0x002800 | 0x4C0000, // 'V*' 40
    0x00000A | 0x002F00 | 0x5D0000, // 'DH' 41
    0x000006 | 0x004F00 | 0x650000, // 'CH' 42
    0x000006 | 0x004F00 | 0x650000, // '**' 43
    0x000006 | 0x004200 | 0x790000, // 'J*' 44
    0x000005 | 0x004F00 | 0x650000, // '**' 45
    0x000006 | 0x006E00 | 0x790000, // '**' 46
    0x000000 | 0x000000 | 0x000000, // '**' 47
    0x000012 | 0x004800 | 0x5A0000, // 'EY' 48
    0x00001A | 0x002600 | 0x580000, // 'AY' 49
    0x000014 | 0x001E00 | 0x580000, // 'OY' 50
    0x00001A | 0x002A00 | 0x580000, // 'AW' 51
    0x000012 | 0x001E00 | 0x580000, // 'OW' 52
    0x00000C | 0x002200 | 0x520000, // 'UW' 53
    0x000006 | 0x001A00 | 0x510000, // 'B*' 54
    0x000006 | 0x001A00 | 0x510000, // '**' 55
    0x000006 | 0x001A00 | 0x510000, // '**' 56
    0x000006 | 0x004200 | 0x790000, // 'D*' 57
    0x000006 | 0x004200 | 0x790000, // '**' 58
    0x000006 | 0x004200 | 0x790000, // '**' 59
    0x000006 | 0x006E00 | 0x700000, // 'G*' 60
    0x000006 | 0x006E00 | 0x6E0000, // '**' 61
    0x000006 | 0x006E00 | 0x6E0000, // '**' 62
    0x000006 | 0x005400 | 0x5E0000, // 'GX' 63
    0x000006 | 0x005400 | 0x5E0000, // '**' 64
    0x000006 | 0x005400 | 0x5E0000, // '**' 65
    0x000006 | 0x001A00 | 0x510000, // 'P*' 66
    0x000006 | 0x001A00 | 0x510000, // '**' 67
    0x000006 | 0x001A00 | 0x510000, // '**' 68
    0x000006 | 0x004200 | 0x790000, // 'T*' 69
    0x000006 | 0x004200 | 0x790000, // '**' 70
    0x000006 | 0x004200 | 0x790000, // '**' 71
    0x000006 | 0x006D00 | 0x650000, // 'K*' 72
    0x00000A | 0x005600 | 0x650000, // '**' 73
    0x00000A | 0x006D00 | 0x700000, // '**' 74
    0x000006 | 0x005400 | 0x5E0000, // 'KX' 75
    0x000006 | 0x005400 | 0x5E0000, // '**' 76
    0x000006 | 0x005400 | 0x5E0000, // '**' 77
    0x00002C | 0x007F00 | 0x080000, // 'UL' 78
    0x000013 | 0x007F00 | 0x010000  // 'UM' 79
  ];

  /**
   *
   * ampl1data[X] =  ampldata[X]        & 0xFF; // F1 amplitude
   * ampl2data[X] = (ampldata[X] >> 8)  & 0xFF; // F2 amplitude
   * ampl3data[X] = (ampldata[X] >> 16) & 0xFF; // F3 amplitude
   */
  var ampldata = [
  // ampl1   | ampl2    | ampl3
    0x000000 | 0x000000 | 0x000000, // ' *' 00
    0x000000 | 0x000000 | 0x000000, // '.*' 01
    0x000000 | 0x000000 | 0x000000, // '?*' 02
    0x000000 | 0x000000 | 0x000000, // ',*' 03
    0x000000 | 0x000000 | 0x000000, // '-*' 04
    0x00000D | 0x000A00 | 0x080000, // 'IY' 05
    0x00000D | 0x000B00 | 0x070000, // 'IH' 06
    0x00000E | 0x000D00 | 0x080000, // 'EH' 07
    0x00000F | 0x000E00 | 0x080000, // 'AE' 08
    0x00000F | 0x000D00 | 0x010000, // 'AA' 09
    0x00000F | 0x000C00 | 0x010000, // 'AH' 10
    0x00000F | 0x000C00 | 0x000000, // 'AO' 11
    0x00000F | 0x000B00 | 0x010000, // 'UH' 12
    0x00000C | 0x000900 | 0x000000, // 'AX' 13
    0x00000D | 0x000B00 | 0x070000, // 'IX' 14
    0x00000C | 0x000B00 | 0x050000, // 'ER' 15
    0x00000F | 0x000C00 | 0x010000, // 'UX' 16
    0x00000F | 0x000C00 | 0x000000, // 'OH' 17
    0x00000D | 0x000C00 | 0x060000, // 'RX' 18
    0x00000D | 0x000800 | 0x010000, // 'LX' 19
    0x00000D | 0x000800 | 0x000000, // 'WX' 20
    0x00000E | 0x000C00 | 0x070000, // 'YX' 21
    0x00000D | 0x000800 | 0x000000, // 'WH' 22
    0x00000C | 0x000A00 | 0x050000, // 'R*' 23
    0x00000D | 0x000800 | 0x010000, // 'L*' 24
    0x00000D | 0x000800 | 0x000000, // 'W*' 25
    0x00000D | 0x000A00 | 0x080000, // 'Y*' 26
    0x00000C | 0x000300 | 0x000000, // 'M*' 27
    0x000009 | 0x000900 | 0x000000, // 'N*' 28
    0x000009 | 0x000600 | 0x030000, // 'NX' 29
    0x000000 | 0x000000 | 0x000000, // 'DX' 30
    0x000000 | 0x000000 | 0x000000, // 'Q*' 31
    0x000000 | 0x000000 | 0x000000, // 'S*' 32
    0x000000 | 0x000000 | 0x000000, // 'SH' 33
    0x000000 | 0x000000 | 0x000000, // 'F*' 34
    0x000000 | 0x000000 | 0x000000, // 'TH' 35
    0x000000 | 0x000000 | 0x000000, // '/H' 36
    0x000000 | 0x000000 | 0x000000, // '/X' 37
    0x00000B | 0x000300 | 0x000000, // 'Z*' 38
    0x00000B | 0x000500 | 0x010000, // 'ZH' 39
    0x00000B | 0x000300 | 0x000000, // 'V*' 40
    0x00000B | 0x000400 | 0x000000, // 'DH' 41
    0x000000 | 0x000000 | 0x000000, // 'CH' 42
    0x000000 | 0x000000 | 0x000000, // '**' 43
    0x000001 | 0x000000 | 0x000000, // 'J*' 44
    0x00000B | 0x000500 | 0x010000, // '**' 45
    0x000000 | 0x000A00 | 0x0E0000, // '**' 46
    0x000002 | 0x000200 | 0x010000, // '**' 47
    0x00000E | 0x000E00 | 0x090000, // 'EY' 48
    0x00000F | 0x000D00 | 0x010000, // 'AY' 49
    0x00000F | 0x000C00 | 0x000000, // 'OY' 50
    0x00000F | 0x000D00 | 0x010000, // 'AW' 51
    0x00000F | 0x000C00 | 0x000000, // 'OW' 52
    0x00000D | 0x000800 | 0x000000, // 'UW' 53
    0x000002 | 0x000000 | 0x000000, // 'B*' 54
    0x000004 | 0x000100 | 0x000000, // '**' 55
    0x000000 | 0x000000 | 0x000000, // '**' 56
    0x000002 | 0x000000 | 0x000000, // 'D*' 57
    0x000004 | 0x000100 | 0x000000, // '**' 58
    0x000000 | 0x000000 | 0x000000, // '**' 59
    0x000001 | 0x000000 | 0x000000, // 'G*' 60
    0x000004 | 0x000100 | 0x000000, // '**' 61
    0x000000 | 0x000000 | 0x000000, // '**' 62
    0x000001 | 0x000000 | 0x000000, // 'GX' 63
    0x000004 | 0x000100 | 0x000000, // '**' 64
    0x000000 | 0x000000 | 0x000000, // '**' 65
    0x000000 | 0x000000 | 0x000000, // 'P*' 66
    0x000000 | 0x000000 | 0x000000, // '**' 67
    0x000000 | 0x000000 | 0x000000, // '**' 68
    0x000000 | 0x000000 | 0x000000, // 'T*' 69
    0x000000 | 0x000000 | 0x000000, // '**' 70
    0x000000 | 0x000000 | 0x000000, // '**' 71
    0x000000 | 0x000000 | 0x000000, // 'K*' 72
    0x00000C | 0x000A00 | 0x070000, // '**' 73
    0x000000 | 0x000000 | 0x000000, // '**' 74
    0x000000 | 0x000000 | 0x000000, // 'KX' 75
    0x000000 | 0x000A00 | 0x050000, // '**' 76
    0x000000 | 0x000000 | 0x000000, // '**' 77
    0x00000F | 0x000000 | 0x130000, // 'UL' 78
    0x00000F | 0x000000 | 0x100000  // 'UM' 79
  ];

  // Sampled data for consonants, consisting of five 256-byte sections
  var sampleTable = [
    //00  T', S, Z  (coronal)
    0x38, 0x84, 0x6B, 0x19, 0xC6, 0x63, 0x18, 0x86,
    0x73, 0x98, 0xC6, 0xB1, 0x1C, 0xCA, 0x31, 0x8C,
    0xC7, 0x31, 0x88, 0xC2, 0x30, 0x98, 0x46, 0x31,
    0x18, 0xC6, 0x35, 0x0C, 0xCA, 0x31, 0x0C, 0xC6,
    //20
    0x21, 0x10, 0x24, 0x69, 0x12, 0xC2, 0x31, 0x14,
    0xC4, 0x71, 0x08, 0x4A, 0x22, 0x49, 0xAB, 0x6A,
    0xA8, 0xAC, 0x49, 0x51, 0x32, 0xD5, 0x52, 0x88,
    0x93, 0x6C, 0x94, 0x22, 0x15, 0x54, 0xD2, 0x25,
    //40
    0x96, 0xD4, 0x50, 0xA5, 0x46, 0x21, 0x08, 0x85,
    0x6B, 0x18, 0xC4, 0x63, 0x10, 0xCE, 0x6B, 0x18,
    0x8C, 0x71, 0x19, 0x8C, 0x63, 0x35, 0x0C, 0xC6,
    0x33, 0x99, 0xCC, 0x6C, 0xB5, 0x4E, 0xA2, 0x99,
    //60
    0x46, 0x21, 0x28, 0x82, 0x95, 0x2E, 0xE3, 0x30,
    0x9C, 0xC5, 0x30, 0x9C, 0xA2, 0xB1, 0x9C, 0x67,
    0x31, 0x88, 0x66, 0x59, 0x2C, 0x53, 0x18, 0x84,
    0x67, 0x50, 0xCA, 0xE3, 0x0A, 0xAC, 0xAB, 0x30,
    //80
    0xAC, 0x62, 0x30, 0x8C, 0x63, 0x10, 0x94, 0x62,
    0xB1, 0x8C, 0x82, 0x28, 0x96, 0x33, 0x98, 0xD6,
    0xB5, 0x4C, 0x62, 0x29, 0xA5, 0x4A, 0xB5, 0x9C,
    0xC6, 0x31, 0x14, 0xD6, 0x38, 0x9C, 0x4B, 0xB4,
    //A0
    0x86, 0x65, 0x18, 0xAE, 0x67, 0x1C, 0xA6, 0x63,
    0x19, 0x96, 0x23, 0x19, 0x84, 0x13, 0x08, 0xA6,
    0x52, 0xAC, 0xCA, 0x22, 0x89, 0x6E, 0xAB, 0x19,
    0x8C, 0x62, 0x34, 0xC4, 0x62, 0x19, 0x86, 0x63,
    //C0
    0x18, 0xC4, 0x23, 0x58, 0xD6, 0xA3, 0x50, 0x42,
    0x54, 0x4A, 0xAD, 0x4A, 0x25, 0x11, 0x6B, 0x64,
    0x89, 0x4A, 0x63, 0x39, 0x8A, 0x23, 0x31, 0x2A,
    0xEA, 0xA2, 0xA9, 0x44, 0xC5, 0x12, 0xCD, 0x42,
    //E0
    0x34, 0x8C, 0x62, 0x18, 0x8C, 0x63, 0x11, 0x48,
    0x66, 0x31, 0x9D, 0x44, 0x33, 0x1D, 0x46, 0x31,
    0x9C, 0xC6, 0xB1, 0x0C, 0xCD, 0x32, 0x88, 0xC4,
    0x73, 0x18, 0x86, 0x73, 0x08, 0xD6, 0x63, 0x58,
    //100 CH', J', SH, ZH  (palato-alveolar)
    0x07, 0x81, 0xE0, 0xF0, 0x3C, 0x07, 0x87, 0x90,
    0x3C, 0x7C, 0x0F, 0xC7, 0xC0, 0xC0, 0xF0, 0x7C,
    0x1E, 0x07, 0x80, 0x80, 0x00, 0x1C, 0x78, 0x70,
    0xF1, 0xC7, 0x1F, 0xC0, 0x0C, 0xFE, 0x1C, 0x1F,
    //120
    0x1F, 0x0E, 0x0A, 0x7A, 0xC0, 0x71, 0xF2, 0x83,
    0x8F, 0x03, 0x0F, 0x0F, 0x0C, 0x00, 0x79, 0xF8,
    0x61, 0xE0, 0x43, 0x0F, 0x83, 0xE7, 0x18, 0xF9,
    0xC1, 0x13, 0xDA, 0xE9, 0x63, 0x8F, 0x0F, 0x83,
    //140
    0x83, 0x87, 0xC3, 0x1F, 0x3C, 0x70, 0xF0, 0xE1,
    0xE1, 0xE3, 0x87, 0xB8, 0x71, 0x0E, 0x20, 0xE3,
    0x8D, 0x48, 0x78, 0x1C, 0x93, 0x87, 0x30, 0xE1,
    0xC1, 0xC1, 0xE4, 0x78, 0x21, 0x83, 0x83, 0xC3,
    //160
    0x87, 0x06, 0x39, 0xE5, 0xC3, 0x87, 0x07, 0x0E,
    0x1C, 0x1C, 0x70, 0xF4, 0x71, 0x9C, 0x60, 0x36,
    0x32, 0xC3, 0x1E, 0x3C, 0xF3, 0x8F, 0x0E, 0x3C,
    0x70, 0xE3, 0xC7, 0x8F, 0x0F, 0x0F, 0x0E, 0x3C,
    //180
    0x78, 0xF0, 0xE3, 0x87, 0x06, 0xF0, 0xE3, 0x07,
    0xC1, 0x99, 0x87, 0x0F, 0x18, 0x78, 0x70, 0x70,
    0xFC, 0xF3, 0x10, 0xB1, 0x8C, 0x8C, 0x31, 0x7C,
    0x70, 0xE1, 0x86, 0x3C, 0x64, 0x6C, 0xB0, 0xE1,
    //1A0
    0xE3, 0x0F, 0x23, 0x8F, 0x0F, 0x1E, 0x3E, 0x38,
    0x3C, 0x38, 0x7B, 0x8F, 0x07, 0x0E, 0x3C, 0xF4,
    0x17, 0x1E, 0x3C, 0x78, 0xF2, 0x9E, 0x72, 0x49,
    0xE3, 0x25, 0x36, 0x38, 0x58, 0x39, 0xE2, 0xDE,
    //1C0
    0x3C, 0x78, 0x78, 0xE1, 0xC7, 0x61, 0xE1, 0xE1,
    0xB0, 0xF0, 0xF0, 0xC3, 0xC7, 0x0E, 0x38, 0xC0,
    0xF0, 0xCE, 0x73, 0x73, 0x18, 0x34, 0xB0, 0xE1,
    0xC7, 0x8E, 0x1C, 0x3C, 0xF8, 0x38, 0xF0, 0xE1,
    //1E0
    0xC1, 0x8B, 0x86, 0x8F, 0x1C, 0x78, 0x70, 0xF0,
    0x78, 0xAC, 0xB1, 0x8F, 0x39, 0x31, 0xDB, 0x38,
    0x61, 0xC3, 0x0E, 0x0E, 0x38, 0x78, 0x73, 0x17,
    0x1E, 0x39, 0x1E, 0x38, 0x64, 0xE1, 0xF1, 0xC1,
    //200 P', F, V, TH, DH  ([labio]dental)
    0x4E, 0x0F, 0x40, 0xA2, 0x02, 0xC5, 0x8F, 0x81,
    0xA1, 0xFC, 0x12, 0x08, 0x64, 0xE0, 0x3C, 0x22,
    0xE0, 0x45, 0x07, 0x8E, 0x0C, 0x32, 0x90, 0xF0,
    0x1F, 0x20, 0x49, 0xE0, 0xF8, 0x0C, 0x60, 0xF0,
    //220
    0x17, 0x1A, 0x41, 0xAA, 0xA4, 0xD0, 0x8D, 0x12,
    0x82, 0x1E, 0x1E, 0x03, 0xF8, 0x3E, 0x03, 0x0C,
    0x73, 0x80, 0x70, 0x44, 0x26, 0x03, 0x24, 0xE1,
    0x3E, 0x04, 0x4E, 0x04, 0x1C, 0xC1, 0x09, 0xCC,
    //240
    0x9E, 0x90, 0x21, 0x07, 0x90, 0x43, 0x64, 0xC0,
    0x0F, 0xC6, 0x90, 0x9C, 0xC1, 0x5B, 0x03, 0xE2,
    0x1D, 0x81, 0xE0, 0x5E, 0x1D, 0x03, 0x84, 0xB8,
    0x2C, 0x0F, 0x80, 0xB1, 0x83, 0xE0, 0x30, 0x41,
    //260
    0x1E, 0x43, 0x89, 0x83, 0x50, 0xFC, 0x24, 0x2E,
    0x13, 0x83, 0xF1, 0x7C, 0x4C, 0x2C, 0xC9, 0x0D,
    0x83, 0xB0, 0xB5, 0x82, 0xE4, 0xE8, 0x06, 0x9C,
    0x07, 0xA0, 0x99, 0x1D, 0x07, 0x3E, 0x82, 0x8F,
    //280
    0x70, 0x30, 0x74, 0x40, 0xCA, 0x10, 0xE4, 0xE8,
    0x0F, 0x92, 0x14, 0x3F, 0x06, 0xF8, 0x84, 0x88,
    0x43, 0x81, 0x0A, 0x34, 0x39, 0x41, 0xC6, 0xE3,
    0x1C, 0x47, 0x03, 0xB0, 0xB8, 0x13, 0x0A, 0xC2,
    //2A0
    0x64, 0xF8, 0x18, 0xF9, 0x60, 0xB3, 0xC0, 0x65,
    0x20, 0x60, 0xA6, 0x8C, 0xC3, 0x81, 0x20, 0x30,
    0x26, 0x1E, 0x1C, 0x38, 0xD3, 0x01, 0xB0, 0x26,
    0x40, 0xF4, 0x0B, 0xC3, 0x42, 0x1F, 0x85, 0x32,
    //2C0
    0x26, 0x60, 0x40, 0xC9, 0xCB, 0x01, 0xEC, 0x11,
    0x28, 0x40, 0xFA, 0x04, 0x34, 0xE0, 0x70, 0x4C,
    0x8C, 0x1D, 0x07, 0x69, 0x03, 0x16, 0xC8, 0x04,
    0x23, 0xE8, 0xC6, 0x9A, 0x0B, 0x1A, 0x03, 0xE0,
    //2E0
    0x76, 0x06, 0x05, 0xCF, 0x1E, 0xBC, 0x58, 0x31,
    0x71, 0x66, 0x00, 0xF8, 0x3F, 0x04, 0xFC, 0x0C,
    0x74, 0x27, 0x8A, 0x80, 0x71, 0xC2, 0x3A, 0x26,
    0x06, 0xC0, 0x1F, 0x05, 0x0F, 0x98, 0x40, 0xAE,
    //300 /H  (palatal)
    0x01, 0x7F, 0xC0, 0x07, 0xFF, 0x00, 0x0E, 0xFE,
    0x00, 0x03, 0xDF, 0x80, 0x03, 0xEF, 0x80, 0x1B,
    0xF1, 0xC2, 0x00, 0xE7, 0xE0, 0x18, 0xFC, 0xE0,
    0x21, 0xFC, 0x80, 0x3C, 0xFC, 0x40, 0x0E, 0x7E,
    //320
    0x00, 0x3F, 0x3E, 0x00, 0x0F, 0xFE, 0x00, 0x1F,
    0xFF, 0x00, 0x3E, 0xF0, 0x07, 0xFC, 0x00, 0x7E,
    0x10, 0x3F, 0xFF, 0x00, 0x3F, 0x38, 0x0E, 0x7C,
    0x01, 0x87, 0x0C, 0xFC, 0xC7, 0x00, 0x3E, 0x04,
    //340
    0x0F, 0x3E, 0x1F, 0x0F, 0x0F, 0x1F, 0x0F, 0x02,
    0x83, 0x87, 0xCF, 0x03, 0x87, 0x0F, 0x3F, 0xC0,
    0x07, 0x9E, 0x60, 0x3F, 0xC0, 0x03, 0xFE, 0x00,
    0x3F, 0xE0, 0x77, 0xE1, 0xC0, 0xFE, 0xE0, 0xC3,
    //360
    0xE0, 0x01, 0xDF, 0xF8, 0x03, 0x07, 0x00, 0x7E,
    0x70, 0x00, 0x7C, 0x38, 0x18, 0xFE, 0x0C, 0x1E,
    0x78, 0x1C, 0x7C, 0x3E, 0x0E, 0x1F, 0x1E, 0x1E,
    0x3E, 0x00, 0x7F, 0x83, 0x07, 0xDB, 0x87, 0x83,
    //380
    0x07, 0xC7, 0x07, 0x10, 0x71, 0xFF, 0x00, 0x3F,
    0xE2, 0x01, 0xE0, 0xC1, 0xC3, 0xE1, 0x00, 0x7F,
    0xC0, 0x05, 0xF0, 0x20, 0xF8, 0xF0, 0x70, 0xFE,
    0x78, 0x79, 0xF8, 0x02, 0x3F, 0x0C, 0x8F, 0x03,
    //3a0
    0x0F, 0x9F, 0xE0, 0xC1, 0xC7, 0x87, 0x03, 0xC3,
    0xC3, 0xB0, 0xE1, 0xE1, 0xC1, 0xE3, 0xE0, 0x71,
    0xF0, 0x00, 0xFC, 0x70, 0x7C, 0x0C, 0x3E, 0x38,
    0x0E, 0x1C, 0x70, 0xC3, 0xC7, 0x03, 0x81, 0xC1,
    //3c0
    0xC7, 0xE7, 0x00, 0x0F, 0xC7, 0x87, 0x19, 0x09,
    0xEF, 0xC4, 0x33, 0xE0, 0xC1, 0xFC, 0xF8, 0x70,
    0xF0, 0x78, 0xF8, 0xF0, 0x61, 0xC7, 0x00, 0x1F,
    0xF8, 0x01, 0x7C, 0xF8, 0xF0, 0x78, 0x70, 0x3C,
    //3e0
    0x7C, 0xCE, 0x0E, 0x21, 0x83, 0xCF, 0x08, 0x07,
    0x8F, 0x08, 0xC1, 0x87, 0x8F, 0x80, 0xC7, 0xE3,
    0x00, 0x07, 0xF8, 0xE0, 0xEF, 0x00, 0x39, 0xF7,
    0x80, 0x0E, 0xF8, 0xE1, 0xE3, 0xF8, 0x21, 0x9F,
    //400 /X  (glottal)
    0xC0, 0xFF, 0x03, 0xF8, 0x07, 0xC0, 0x1F, 0xF8,
    0xC4, 0x04, 0xFC, 0xC4, 0xC1, 0xBC, 0x87, 0xF0,
    0x0F, 0xC0, 0x7F, 0x05, 0xE0, 0x25, 0xEC, 0xC0,
    0x3E, 0x84, 0x47, 0xF0, 0x8E, 0x03, 0xF8, 0x03,
    //420
    0xFB, 0xC0, 0x19, 0xF8, 0x07, 0x9C, 0x0C, 0x17,
    0xF8, 0x07, 0xE0, 0x1F, 0xA1, 0xFC, 0x0F, 0xFC,
    0x01, 0xF0, 0x3F, 0x00, 0xFE, 0x03, 0xF0, 0x1F,
    0x00, 0xFD, 0x00, 0xFF, 0x88, 0x0D, 0xF9, 0x01,
    //440
    0xFF, 0x00, 0x70, 0x07, 0xC0, 0x3E, 0x42, 0xF3,
    0x0D, 0xC4, 0x7F, 0x80, 0xFC, 0x07, 0xF0, 0x5E,
    0xC0, 0x3F, 0x00, 0x78, 0x3F, 0x81, 0xFF, 0x01,
    0xF8, 0x01, 0xC3, 0xE8, 0x0C, 0xE4, 0x64, 0x8F,
    //460
    0xE4, 0x0F, 0xF0, 0x07, 0xF0, 0xC2, 0x1F, 0x00,
    0x7F, 0xC0, 0x6F, 0x80, 0x7E, 0x03, 0xF8, 0x07,
    0xF0, 0x3F, 0xC0, 0x78, 0x0F, 0x82, 0x07, 0xFE,
    0x22, 0x77, 0x70, 0x02, 0x76, 0x03, 0xFE, 0x00,
    //480
    0xFE, 0x67, 0x00, 0x7C, 0xC7, 0xF1, 0x8E, 0xC6,
    0x3B, 0xE0, 0x3F, 0x84, 0xF3, 0x19, 0xD8, 0x03,
    0x99, 0xFC, 0x09, 0xB8, 0x0F, 0xF8, 0x00, 0x9D,
    0x24, 0x61, 0xF9, 0x0D, 0x00, 0xFD, 0x03, 0xF0,
    //4a0
    0x1F, 0x90, 0x3F, 0x01, 0xF8, 0x1F, 0xD0, 0x0F,
    0xF8, 0x37, 0x01, 0xF8, 0x07, 0xF0, 0x0F, 0xC0,
    0x3F, 0x00, 0xFE, 0x03, 0xF8, 0x0F, 0xC0, 0x3F,
    0x00, 0xFA, 0x03, 0xF0, 0x0F, 0x80, 0xFF, 0x01,
    //4c0
    0xB8, 0x07, 0xF0, 0x01, 0xFC, 0x01, 0xBC, 0x80,
    0x13, 0x1E, 0x00, 0x7F, 0xE1, 0x40, 0x7F, 0xA0,
    0x7F, 0xB0, 0x00, 0x3F, 0xC0, 0x1F, 0xC0, 0x38,
    0x0F, 0xF0, 0x1F, 0x80, 0xFF, 0x01, 0xFC, 0x03,
    //4e0
    0xF1, 0x7E, 0x01, 0xFE, 0x01, 0xF0, 0xFF, 0x00,
    0x7F, 0xC0, 0x1D, 0x07, 0xF0, 0x0F, 0xC0, 0x7E,
    0x06, 0xE0, 0x07, 0xE0, 0x0F, 0xF8, 0x06, 0xC1,
    0xFE, 0x01, 0xFC, 0x03, 0xE0, 0x0F, 0x00, 0xFC
  ];

  // mouth formants (F1) 5..29
  var mouthFormants5_29 = [
    10, 14, 19, 24, 27, 23, 21, 16, 20, 14, 18, 14, 18, 18,
    16, 13, 15, 11, 18, 14, 11, 9, 6, 6, 6
  ];
  // formant 1 frequencies (mouth) 48..53
  var mouthFormants48_53 = [19, 27, 21, 27, 18, 13];

  // throat formants (F2) 5..29
  var throatFormants5_29 = [
    84, 73, 67, 63, 40, 44, 31, 37, 45, 73, 49,
    36, 30, 51, 37, 29, 69, 24, 50, 30, 24, 83, 46, 54, 86 ];
  // formant 2 frequencies (throat) 48..53
  var throatFormants48_53 = [72, 39, 31, 43, 30, 34];

  function trans(mem39212, mem39213) {
    return (((mem39212 * mem39213) >> 8) & 0xFF) << 1;
  }

  /**
   * SAM's voice can be altered by changing the frequencies of the
   * mouth formant (F1) and the throat formant (F2). Only the voiced
   * phonemes (5-29 and 48-53) are altered.
   *
   * This returns the three base frequency arrays.
   *
   * @param {Number} mouth  valid values: 0-255
   * @param {Number} throat valid values: 0-255
   *
   * @return {Array}
   */
  function SetMouthThroat(mouth, throat) {
    var freqdata = [[],[],[]];
    frequencyData.map(function (v, i) {
      freqdata[0][i] = v & 0xFF;
      freqdata[1][i] = (v >> 8) & 0xFF;
      freqdata[2][i] = (v >> 16) & 0xFF;
    });

    // recalculate formant frequencies 5..29 for the mouth (F1) and throat (F2)
    for(var pos = 5; pos < 30; pos++) {
      // recalculate mouth frequency
      freqdata[0][pos] = trans(mouth, mouthFormants5_29[pos-5]);

      // recalculate throat frequency
      freqdata[1][pos] = trans(throat, throatFormants5_29[pos-5]);
    }

    // recalculate formant frequencies 48..53
    for(var pos$1 = 0; pos$1 < 6; pos$1++) {
      // recalculate F1 (mouth formant)
      freqdata[0][pos$1+48] = trans(mouth, mouthFormants48_53[pos$1]);
      // recalculate F2 (throat formant)
      freqdata[1][pos$1+48] = trans(throat, throatFormants48_53[pos$1]);
    }

    return freqdata;
  }

  /**
   * CREATE TRANSITIONS.
   *
   * Linear transitions are now created to smoothly connect each
   * phoeneme. This transition is spread between the ending frames
   * of the old phoneme (outBlendLength), and the beginning frames
   * of the new phoneme (inBlendLength).
   *
   * To determine how many frames to use, the two phonemes are
   * compared using the blendRank[] table. The phoneme with the
   * smaller score is used. In case of a tie, a blend of each is used:
   *
   *      if blendRank[phoneme1] ==  blendRank[phomneme2]
   *          // use lengths from each phoneme
   *          outBlendFrames = outBlend[phoneme1]
   *          inBlendFrames = outBlend[phoneme2]
   *      else if blendRank[phoneme1] < blendRank[phoneme2]
   *          // use lengths from first phoneme
   *          outBlendFrames = outBlendLength[phoneme1]
   *          inBlendFrames = inBlendLength[phoneme1]
   *      else
   *          // use lengths from the second phoneme
   *          // note that in and out are swapped around!
   *          outBlendFrames = inBlendLength[phoneme2]
   *          inBlendFrames = outBlendLength[phoneme2]
   *
   *  Blend lengths can't be less than zero.
   *
   * For most of the parameters, SAM interpolates over the range of the last
   * outBlendFrames-1 and the first inBlendFrames.
   *
   * The exception to this is the Pitch[] parameter, which is interpolates the
   * pitch from the center of the current phoneme to the center of the next
   * phoneme.
   *
   * @param {Uint8Array} pitches
   * @param {Uint8Array} frequency
   * @param {Uint8Array} amplitude
   * @param {Array} tuples
   *
   * @return {Number}
   */
  function CreateTransitions(pitches, frequency, amplitude, tuples) {
    // 0=pitches
    // 1=frequency1
    // 2=frequency2
    // 3=frequency3
    // 4=amplitude1
    // 5=amplitude2
    // 6=amplitude3
    var tables = [pitches, frequency[0], frequency[1], frequency[2], amplitude[0], amplitude[1], amplitude[2]];
    var Read = function (table, pos) {
      {
        if (table < 0 || table > tables.length -1 ) {
          throw new Error(("Error invalid table in Read: " + table));
        }
      }
      return tables[table][pos];
    };

    // linearly interpolate values
    var interpolate = function (width, table, frame, change) {
      var sign      = (change < 0);
      var remainder = Math.abs(change) % width;
      var div       = (change / width) | 0;

      var error = 0;
      var pos   = width;

      while (--pos > 0) {
        var val = Read(table, frame) + div;
        error += remainder;
        if (error >= width) {
          // accumulated a whole integer error, so adjust output
          error -= width;
          if (sign) {
            val--;
          } else if (val) {
            // if input is 0, we always leave it alone
            val++;
          }
        }

        // Write updated value back to next frame.
        {
          if (table < 0 || table > tables.length -1 ) {
            throw new Error(("Error invalid table in Read: " + table));
          }
        }
        tables[table][++frame] = val;
        val += div;
      }
    };

    var outBlendFrames;
    var inBlendFrames;
    var boundary = 0;
    for (var pos=0;pos<tuples.length - 1;pos++) {
      var phoneme      = tuples[pos][0];
      var next_phoneme = tuples[pos+1][0];

      // get the ranking of each phoneme
      var next_rank = blendRank[next_phoneme];
      var rank      = blendRank[phoneme];

      // compare the rank - lower rank value is stronger
      if (rank === next_rank) {
        // same rank, so use out blend lengths from each phoneme
        outBlendFrames = outBlendLength[phoneme];
        inBlendFrames = outBlendLength[next_phoneme];
      } else if (rank < next_rank) {
        // next phoneme is stronger, so use its blend lengths
        outBlendFrames = inBlendLength[next_phoneme];
        inBlendFrames = outBlendLength[next_phoneme];
      } else {
        // current phoneme is stronger, so use its blend lengths
        // note the out/in are swapped
        outBlendFrames = outBlendLength[phoneme];
        inBlendFrames = inBlendLength[phoneme];
      }
      boundary += tuples[pos][1];
      var trans_end    = boundary + inBlendFrames;
      var trans_start  = boundary - outBlendFrames;
      var trans_length = outBlendFrames + inBlendFrames; // total transition

      if (((trans_length - 2) & 128) === 0) {
        // unlike the other values, the pitches[] interpolates from
        // the middle of the current phoneme to the middle of the
        // next phoneme

        // half the width of the current and next phoneme
        var cur_width  = tuples[pos][1] >> 1;
        var next_width = tuples[pos+1][1] >> 1;
        var pitch = pitches[boundary + next_width] - pitches[boundary - cur_width];
        // interpolate the values
        interpolate(cur_width + next_width, 0, trans_start, pitch);

        for (var table = 1; table < 7;table++) {
          // tables:
          // 0  pitches
          // 1  frequency1
          // 2  frequency2
          // 3  frequency3
          // 4  amplitude1
          // 5  amplitude2
          // 6  amplitude3
          var value = Read(table, trans_end) - Read(table, trans_start);
          interpolate(trans_length, table, trans_start, value);
        }
      }
    }

    // add the length of last phoneme
    return (boundary + tuples[tuples.length - 1][1]) & 0xFF;
  }

  var RISING_INFLECTION = 255;
  var FALLING_INFLECTION = 1;

  /**
   * Create a rising or falling inflection 30 frames prior to index X.
   * A rising inflection is used for questions, and a falling inflection is used for statements.
   */
  function AddInflection (inflection, pos, pitches) {
    // store the location of the punctuation
    var end = pos;
    if (pos < 30) {
      pos = 0;
    } else {
      pos -= 30;
    }

    var A;
    // FIXME: Explain this fix better, it's not obvious
    // ML : A =, fixes a problem with invalid pitch with '.'
    while ((A = pitches[pos]) === 127) {
      ++pos;
    }

    while (pos !== end) {
      // add the inflection direction
      A += inflection;

      // set the inflection
      pitches[pos] = A & 0xFF;

      while ((++pos !== end) && pitches[pos] === 255) { /* keep looping */}
    }
  }

  /** CREATE FRAMES
   *
   * The length parameter in the list corresponds to the number of frames
   * to expand the phoneme to. Each frame represents 10 milliseconds of time.
   * So a phoneme with a length of 7 = 7 frames = 70 milliseconds duration.
   *
   * The parameters are copied from the phoneme to the frame verbatim.
   *
   * Returns:
   *   [
   *      pitches,
   *      frequency,
   *      amplitude,
   *      sampledConsonantFlag
   *   ]
   *
   * @param {Number}       pitch          Input
   * @param {Array}        tuples         Input
   * @param {Uint8Array[]} frequencyData  Input
   *
   * @return Array
   */
  function CreateFrames (
    pitch,
    tuples,
    frequencyData) {
    var pitches              = [];
    var frequency            = [[], [], []];
    var amplitude            = [[], [], []];
    var sampledConsonantFlag = [];

    var X = 0;
    for (var i=0;i<tuples.length;i++) {
      // get the phoneme at the index
      var phoneme = tuples[i][0];
      if (phoneme === PHONEME_PERIOD) {
        AddInflection(FALLING_INFLECTION, X, pitches);
      } else if (phoneme === PHONEME_QUESTION) {
        AddInflection(RISING_INFLECTION, X, pitches);
      }

      // get the stress amount (more stress = higher pitch)
      var phase1 = stressPitch_tab47492[tuples[i][2]];
      // get number of frames to write
      // copy from the source to the frames list
      for (var frames = tuples[i][1];frames > 0;frames--) {
        frequency[0][X]         = frequencyData[0][phoneme];      // F1 frequency
        frequency[1][X]         = frequencyData[1][phoneme];      // F2 frequency
        frequency[2][X]         = frequencyData[2][phoneme];      // F3 frequency
        amplitude[0][X]         = ampldata[phoneme] & 0xFF;         // F1 amplitude
        amplitude[1][X]         = (ampldata[phoneme] >> 8) & 0xFF;  // F2 amplitude
        amplitude[2][X]         = (ampldata[phoneme] >> 16) & 0xFF; // F3 amplitude
        sampledConsonantFlag[X] = sampledConsonantFlags[phoneme]; // phoneme data for sampled consonants
        pitches[X]              = (pitch + phase1) & 0xFF;        // pitch
        X++;
      }
    }

    return [
      pitches,
      frequency,
      amplitude,
      sampledConsonantFlag
    ];
  }

  function CreateOutputBuffer(buffersize) {
    var buffer = new Uint8Array(buffersize);
    var bufferpos = 0;
    var oldTimeTableIndex = 0;
    // Scale by 16 and write five times.
    var writer = function (index, A) {
      var scaled = (A & 15) * 16;
      writer.ary(index, [scaled, scaled, scaled, scaled, scaled]);
    };
    // Write the five given values.
    writer.ary = function (index, array) {
      // timetable for more accurate c64 simulation
      var timetable = [
        [162, 167, 167, 127, 128],   // formants synth
        [226, 60, 60, 0, 0],         // unvoiced sample 0
        [225, 60, 59, 0, 0],         // unvoiced sample 1
        [200, 0, 0, 54, 55],         // voiced sample 0
        [199, 0, 0, 54, 54]          // voiced sample 1
      ];
      bufferpos += timetable[oldTimeTableIndex][index];
      if (((bufferpos / 50) | 0) > buffer.length) {
        {
          throw new Error(("Buffer overflow, want " + (((bufferpos / 50) | 0)) + " but buffersize is only " + (buffer.length) + "!"));
        }
      }
      oldTimeTableIndex = index;
      // write a little bit in advance
      for (var k = 0; k < 5; k++) {
        buffer[(bufferpos / 50 | 0) + k] = array[k];
      }
    };
    writer.get = function () {
      return buffer.slice(0, bufferpos / 50 | 0);
    };
    return writer;
  }

  /**
   * @param {Array} phonemes
   * @param {Number} [pitch]
   * @param {Number} [mouth]
   * @param {Number} [throat]
   * @param {Number} [speed]
   * @param {Boolean} [singmode]
   *
   * @return Uint8Array
   */
  function Renderer(phonemes, pitch, mouth, throat, speed, singmode) {
    pitch = (pitch === undefined) ? 64 : pitch & 0xFF;
    mouth = (mouth === undefined) ? 128 : mouth & 0xFF;
    throat = (throat === undefined) ? 128 : throat & 0xFF;
    speed = (speed || 72) & 0xFF;
    singmode = singmode || false;

    // Every frame is 20ms long.
    var Output = CreateOutputBuffer(
      441 // = (22050/50)
      * phonemes.reduce(function (pre, v) { return pre + (v[1] * 20); }, 0) / 50 // Combined phoneme length in ms.
      * speed | 0 // multiplied by speed.
    );

    var freqdata = SetMouthThroat(mouth, throat);

    // Main render loop.
    var srcpos  = 0; // Position in source
    // FIXME: should be tuple buffer as well.
    var tuples = [];
    while(1) {
      var A = phonemes[srcpos];
      var A0 = A[0];
      if (A0) {
        if (A0 === END) {
          Render(tuples);
          return Output.get();
        }
        if (A0 === BREAK) {
          Render(tuples);
          tuples = [];
        } else {
          tuples.push(A);
        }
      }
      ++srcpos;
    }

    /**
     * RENDER THE PHONEMES IN THE LIST
     *
     * The phoneme list is converted into sound through the steps:
     *
     * 1. Copy each phoneme <length> number of times into the frames list,
     *    where each frame represents 10 milliseconds of sound.
     *
     * 2. Determine the transitions lengths between phonemes, and linearly
     *    interpolate the values across the frames.
     *
     * 3. Offset the pitches by the fundamental frequency.
     *
     * 4. Render the each frame.
     *
     * @param {Array} tuples
     */
    function Render (tuples) {
      if (tuples.length === 0) {
        return; //exit if no data
      }

      var ref = CreateFrames(
        pitch,
        tuples,
        freqdata
      );
      var pitches = ref[0];
      var frequency = ref[1];
      var amplitude = ref[2];
      var sampledConsonantFlag = ref[3];

      var t = CreateTransitions(
        pitches,
        frequency,
        amplitude,
        tuples
      );

      if (!singmode) {
        /* ASSIGN PITCH CONTOUR
         *
         * This subtracts the F1 frequency from the pitch to create a
         * pitch contour. Without this, the output would be at a single
         * pitch level (monotone).
         */
        for(var i = 0; i < pitches.length; i++) {
          // subtract half the frequency of the formant 1.
          // this adds variety to the voice
          pitches[i] -= (frequency[0][i] >> 1);
        }
      }

      /*
       * RESCALE AMPLITUDE
       *
       * Rescale volume from a linear scale to decibels.
       */
      var amplitudeRescale = [
        0x00, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x04,
        0x04, 0x05, 0x06, 0x08, 0x09, 0x0B, 0x0D, 0x0F,
        0x00  //17 elements?
      ];
      for(var i$1 = amplitude[0].length - 1; i$1 >= 0; i$1--) {
        amplitude[0][i$1] = amplitudeRescale[amplitude[0][i$1]];
        amplitude[1][i$1] = amplitudeRescale[amplitude[1][i$1]];
        amplitude[2][i$1] = amplitudeRescale[amplitude[2][i$1]];
      }

      {
        PrintOutput(pitches, frequency, amplitude, sampledConsonantFlag);
      }

      ProcessFrames(t, speed, frequency, pitches, amplitude, sampledConsonantFlag);
    }

    /**
     * PROCESS THE FRAMES
     *
     * In traditional vocal synthesis, the glottal pulse drives filters, which
     * are attenuated to the frequencies of the formants.
     *
     * SAM generates these formants directly with sin and rectangular waves.
     * To simulate them being driven by the glottal pulse, the waveforms are
     * reset at the beginning of each glottal pulse.
     */
    function ProcessFrames(frameCount, speed, frequency, pitches, amplitude, sampledConsonantFlag) {
      var RenderSample = function (mem66, consonantFlag, mem49) {
        // mem49 == current phoneme's index - unsigned char

        // mask low three bits and subtract 1 get value to
        // convert 0 bits on unvoiced samples.
        var kind = (consonantFlag & 7) - 1;

        // determine which offset to use from table { 0x18, 0x1A, 0x17, 0x17, 0x17 }
        // T, S, Z                0          0x18
        // CH, J, SH, ZH          1          0x1A
        // P, F*, V, TH, DH       2          0x17
        // /H                     3          0x17
        // /X                     4          0x17

        var hi = kind * 256 & 0xFFFF; // unsigned short
        var off;
        // voiced sample?
        var pitch = consonantFlag & 248; // unsigned char

        function renderSample (index1, value1, index2, value2) {
          var bit = 8;
          var sample = sampleTable[hi+off];
          do {
            if ((sample & 128) !== 0) {
              Output(index1, value1);
            } else {
              Output(index2, value2);
            }
            sample <<= 1;
          } while(--bit);
        }

        if(pitch === 0) {
          // voiced phoneme: Z*, ZH, V*, DH
          var phase1 = (pitches[mem49 & 0xFF] >> 4) ^ 255 & 0xFF; // unsigned char
          off = mem66 & 0xFF; // unsigned char
          do {
            renderSample(3, 26, 4, 6);
            off++;
            off &= 0xFF;
          } while (++phase1 & 0xFF);
          return off;
        }
        // unvoiced
        off = pitch ^ 255 & 0xFF; // unsigned char
        var value0 = sampledConsonantValues0[kind] & 0xFF; // unsigned char
        do {
          renderSample(2, 5, 1, value0);
        } while (++off & 0xFF);

        return mem66;
      };

      // Removed sine table stored a pre calculated sine wave but in modern CPU, we can calculate inline.
      var sinus = function (x) {
        return Math.sin(2*Math.PI*(x/256)) * 127 | 0;
        // return ((Math.sin(
        //   (2*Math.PI)*
        //   (x/255)
        // )*128 | 0)/16|0)*16;
      };

      var speedcounter = speed;
      var phase1 = 0;
      var phase2 = 0;
      var phase3 = 0;
      var mem66 = 0;
      var pos = 0;
      var glottal_pulse = pitches[0];
      var mem38 = glottal_pulse * .75 |0;

      while(frameCount) {
        var flags = sampledConsonantFlag[pos];

        // unvoiced sampled phoneme?
        if ((flags & 248) !== 0) {
          mem66 = RenderSample(mem66, flags, pos);
          // skip ahead two in the phoneme buffer
          pos += 2;
          frameCount -= 2;
          speedcounter = speed;
        } else {
          {
            // Rectangle table consisting of:
            //   0-128 = 0x90
            // 128-255 = 0x70

            // Remove multtable, replace with logical equivalent.
            // Multtable stored the result of a 8-bit signed multiply of the upper nibble of sin/rect (interpreted as signed)
            // and the amplitude lower nibble (interpreted as unsigned), then divided by two.
            // On the 6510 this made sense, but in modern processors it's way faster and cleaner to simply do the multiply.
            // simulate the glottal pulse and formants
            var ary = [];
            var /* unsigned int */ p1 = phase1 * 256; // Fixed point integers because we need to divide later on
            var /* unsigned int */ p2 = phase2 * 256;
            var /* unsigned int */ p3 = phase3 * 256;
            for (var k=0; k<5; k++) {
              var /* signed char */ sp1 = sinus(0xff & (p1>>8));
              var /* signed char */ sp2 = sinus(0xff & (p2>>8));
              var /* signed char */ rp3 = ((0xff & (p3>>8))<129) ? -0x70 : 0x70;
              var /* signed int */ sin1 = sp1 * (/* (unsigned char) */ amplitude[0][pos] & 0x0F);
              var /* signed int */ sin2 = sp2 * (/* (unsigned char) */ amplitude[1][pos] & 0x0F);
              var /* signed int */ rect = rp3 * (/* (unsigned char) */ amplitude[2][pos] & 0x0F);
              var /* signed int */ mux = sin1 + sin2 + rect;
              mux /= 32;
              mux += 128; // Go from signed to unsigned amplitude
              ary[k] = mux |0;
              p1 += frequency[0][pos] * 256 / 4; // Compromise, this becomes a shift and works well
              p2 += frequency[1][pos] * 256 / 4;
              p3 += frequency[2][pos] * 256 / 4;
            }
            Output.ary(0, ary);
          }

          speedcounter--;
          if (speedcounter === 0) {
            pos++; //go to next amplitude
            // decrement the frame count
            frameCount--;
            if(frameCount === 0) {
              return;
            }
            speedcounter = speed;
          }

          glottal_pulse--;

          if(glottal_pulse !== 0) {
            // not finished with a glottal pulse

            mem38--;
            // within the first 75% of the glottal pulse?
            // is the count non-zero and the sampled flag is zero?
            if((mem38 !== 0) || (flags === 0)) {
              // reset the phase of the formants to match the pulse
              // TODO: we should have a switch to disable this, it causes a pretty nice voice without the masking!
              phase1 = phase1 + frequency[0][pos]; // & 0xFF;
              phase2 = phase2 + frequency[1][pos]; // & 0xFF;
              phase3 = phase3 + frequency[2][pos]; // & 0xFF;
              continue;
            }

            // voiced sampled phonemes interleave the sample with the
            // glottal pulse. The sample flag is non-zero, so render
            // the sample for the phoneme.
            mem66 = RenderSample(mem66, flags, pos);
          }
        }

        glottal_pulse = pitches[pos];
        mem38 = glottal_pulse * .75 |0;

        // reset the formant wave generators to keep them in
        // sync with the glottal pulse
        phase1 = 0;
        phase2 = 0;
        phase3 = 0;
      }
    }
  }

  function PrintOutput(pitches, frequency, amplitude, sampledConsonantFlag) {
    function pad(num) {
      var s = '00000' + num;
      return s.substr(s.length - 5);
    }
    console.log('===========================================');
    console.log('Final data for speech output:');
    console.log(' flags ampl1 freq1 ampl2 freq2 ampl3 freq3 pitch');
    console.log('------------------------------------------------');
    for (var i=0;i<sampledConsonantFlag.length;i++) {
      console.log(
        ' %s %s %s %s %s %s %s %s',
        pad(sampledConsonantFlag[i]),
        pad(amplitude[0][i]),
        pad(frequency[0][i]),
        pad(amplitude[1][i]),
        pad(frequency[1][i]),
        pad(amplitude[2][i]),
        pad(frequency[2][i]),
        pad(pitches[i])
      );
      i++;
    }
    console.log('===========================================');
  }

  /**
   * Process the input and return the audio buffer.
   *
   * @param {String} input
   *
   * @param {object}  [options]
   * @param {Boolean} [options.singmode] Default false.
   * @param {Boolean} [options.debug]    Default false.
   * @param {Number}  [options.pitch]    Default 64.
   * @param {Number}  [options.speed]    Default 72.
   * @param {Number}  [options.mouth]    Default 128.
   * @param {Number}  [options.throat]   Default 128.
   *
   * @return {Float32Array|Boolean}
   */
  function SamBuffer (input, options) {
    var buffer = SamProcess(input, options);
    if (false === buffer) {
      return false;
    }

    return UInt8ArrayToFloat32Array(buffer);
  }

  /**
   * Process the input and return the audiobuffer.
   *
   * @param {String} input
   *
   * @param {object}  [options]
   * @param {Boolean} [options.singmode] Default false.
   * @param {Boolean} [options.debug]    Default false.
   * @param {Number}  [options.pitch]    Default 64.
   * @param {Number}  [options.speed]    Default 72.
   * @param {Number}  [options.mouth]    Default 128.
   * @param {Number}  [options.throat]   Default 128.
   *
   * @return {Uint8Array|Boolean}
   */
  function SamProcess (input, options) {
    if ( options === void 0 ) options = {};

    var parsed = Parser(input);
    if (false === parsed) {
      return false;
    }

    return Renderer(parsed, options.pitch, options.mouth, options.throat, options.speed, options.singmode);
  }

  var convert = TextToPhonemes;
  var buf8 = SamProcess;
  var buf32 = SamBuffer;

  /**
   * @param {object}  [options]
   * @param {Boolean} [options.phonetic] Default false.
   * @param {Boolean} [options.singmode] Default false.
   * @param {Boolean} [options.debug]    Default false.
   * @param {Number}  [options.pitch]    Default 64.
   * @param {Number}  [options.speed]    Default 72.
   * @param {Number}  [options.mouth]    Default 128.
   * @param {Number}  [options.throat]   Default 128.
   *
   * @constructor
   */
  function SamJs (options) {
    var this$1 = this;

    var opts = options || {};

    var ensurePhonetic = function (text, phonetic) {
      if (!(phonetic || opts.phonetic)) {
        return convert(text);
      }
      return text.toUpperCase();
    };

    /**
     * Render the passed text as 8bit wave buffer array.
     *
     * @param {string}  text       The text to render or phoneme string.
     * @param {boolean} [phonetic] Flag if the input text is already phonetic data.
     *
     * @return {Uint8Array|Boolean}
     */
    this.buf8 = function (text, phonetic) {
      return buf8(ensurePhonetic(text, phonetic), opts);
    };

    /**
     * Render the passed text as 32bit wave buffer array.
     *
     * @param {string}  text       The text to render or phoneme string.
     * @param {boolean} [phonetic] Flag if the input text is already phonetic data.
     *
     * @return {Float32Array|Boolean}
     */
    this.buf32 = function (text, phonetic) {
      return buf32(ensurePhonetic(text, phonetic), opts);
    };

    /**
     * Render the passed text as wave buffer and play it over the speakers.
     *
     * @param {string}  text       The text to render or phoneme string.
     * @param {boolean} [phonetic] Flag if the input text is already phonetic data.
     *
     * @return {Promise}
     */
    this.speak = function (text, phonetic) {
      return PlayBuffer(this$1.buf32(text, phonetic));
    };

    /**
     * Render the passed text as wave buffer and download it via URL API.
     *
     * @param {string}  text       The text to render or phoneme string.
     * @param {boolean} [phonetic] Flag if the input text is already phonetic data.
     *
     * @return void
     */
    this.download = function (text, phonetic) {
      RenderBuffer(this$1.buf8(text, phonetic));
    };
  }

  SamJs.buf8 = buf8;
  SamJs.buf32 = buf32;
  SamJs.convert = convert;

  return SamJs;

})));
