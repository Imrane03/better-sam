/**
 * some flags (97 bytes)
 *
 *  0x01        numeric
 *  0x02        rule set 2
 *  0x04        D J L N R S T Z
 *  0x08        B D G J L M N R V W Z
 *  0x10        C G J S X Z
 *  0x20        B C D F G H J K L M N P Q R S T V W X Y Z + ` => consonants?
 *  0x40        is vowel + Y
 *  0x80        alpha or '
 */
export const charFlags = new Uint8Array([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,                                                           // ' '
  0                                           | 0x02,          // '!'
  0                                           | 0x02,          // '"'
  0                                           | 0x02,          // '#'
  0                                           | 0x02,          // '$'
  0                                           | 0x02,          // '%'
  0                                           | 0x02,          // '&'
  0 | 0x80                                    | 0x02,          // '''
  0,                                                           // '('
  0,                                                           // ')'
  0                                           | 0x02,          // '*'
  0                                           | 0x02,          // '+'
  0                                           | 0x02,          // ','
  0                                           | 0x02,          // '-'
  0                                           | 0x02,          // '.'
  0                                           | 0x02,          // '/'
  0                                           | 0x02 | 0x01,   // '0'
  0                                           | 0x02 | 0x01,   // '1'
  0                                           | 0x02 | 0x01,   // '2'
  0                                           | 0x02 | 0x01,   // '3'
  0                                           | 0x02 | 0x01,   // '4'
  0                                           | 0x02 | 0x01,   // '5'
  0                                           | 0x02 | 0x01,   // '6'
  0                                           | 0x02 | 0x01,   // '7'
  0                                           | 0x02 | 0x01,   // '8'
  0                                           | 0x02 | 0x01,   // '9'
  0                                           | 0x02,          // ':'
  0                                           | 0x02,          // ';'
  0                                           | 0x02,          // '<'
  0                                           | 0x02,          // '='
  0                                           | 0x02,          // '>'
  0                                           | 0x02,          // '?'
  0                                           | 0x02,          // '@'
  0 | 0x80 | 0x40,                                             // 'A'
  0 | 0x80        | 0x20        | 0x08,                        // 'B'
  0 | 0x80        | 0x20 | 0x10,                               // 'C'
  0 | 0x80        | 0x20        | 0x08 | 0x04,                 // 'D'
  0 | 0x80 | 0x40,                                             // 'E'
  0 | 0x80        | 0x20,                                      // 'F'
  0 | 0x80        | 0x20 | 0x10 | 0x08,                        // 'G'
  0 | 0x80        | 0x20,                                      // 'H'
  0 | 0x80 | 0x40,                                             // 'I'
  0 | 0x80        | 0x20 | 0x10 | 0x08 | 0x04,                 // 'J'
  0 | 0x80        | 0x20,                                      // 'K'
  0 | 0x80        | 0x20        | 0x08 | 0x04,                 // 'L'
  0 | 0x80        | 0x20        | 0x08,                        // 'M'
  0 | 0x80        | 0x20        | 0x08 | 0x04,                 // 'N'
  0 | 0x80 | 0x40,                                             // 'O'
  0 | 0x80        | 0x20,                                      // 'P'
  0 | 0x80        | 0x20,                                      // 'Q'
  0 | 0x80        | 0x20        | 0x08 | 0x04,                 // 'R'
  0 | 0x80        | 0x20 | 0x10        | 0x04,                 // 'S'
  0 | 0x80        | 0x20               | 0x04,                 // 'T'
  0 | 0x80 | 0x40,                                             // 'U'
  0 | 0x80        | 0x20        | 0x08,                        // 'V'
  0 | 0x80        | 0x20        | 0x08,                        // 'W'
  0 | 0x80        | 0x20 | 0x10,                               // 'X'
  0 | 0x80 | 0x40,                                             // 'Y'
  0 | 0x80        | 0x20 | 0x10 | 0x08 | 0x04,                 // 'Z'
  0,                                                           // '['
  0,                                                           // '\'
  0,                                                           // ']'
  0                                           | 0x02,          // '^'
  0,                                                           // '_'
  0               | 0x20,                                      // '`'
]);

// 26 items. From 'A' to 'Z' positions for mem62 and mem63 for each character
export const tab37489 = new Uint8Array([
  0, 149, 247, 162, 57, 197, 6, 126,
  199, 38, 55, 78, 145, 241, 85, 161,
  254, 36, 69, 45, 167, 54, 83, 46,
  71, 218
]);

// 26 bytes
export const tab37515 = new Uint8Array([
  125, 126, 126, 127, 128, 129, 130, 130,
  130, 132, 132, 132, 132, 132, 133, 135,
  135, 136, 136, 137, 138, 139, 139, 140,
  140, 140
]);

// 4071 bytes.
export const rules = encodePhonemeTable([
  ']A',
  ' (A.)=EH4Y. ',
  '(A) =AH',
  ' (ARE) =AAR',
  ' (AR)O=AXR',
  '(AR)#=EH4R',
  ' ^(AS)#=EY4S',
  '(A)WA=AX',
  '(AW)=AO5',
  ' :(ANY)=EH4NIY',
  '(A)^+#=EY5',
  '#:(ALLY)=ULIY',
  ' (AL)#=UL',
  '(AGAIN)=AXGEH4N',
  '#:(AG)E=IHJ',
  '(A)^%=EY',
  '(A)^+:#=AE',
  ' :(A)^+ =EY4',
  ' (ARR)=AXR',
  '(ARR)=AE4R',
  ' ^(AR) =AA5R',
  '(AR)=AA5R',
  '(AIR)=EH4R',
  '(AI)=EY4',
  '(AY)=EY5',
  '(AU)=AO4',
  '#:(AL) =UL',
  '#:(ALS) =ULZ',
  '(ALK)=AO4K',
  '(AL)^=AOL',
  ' :(ABLE)=EY4BUL',
  '(ABLE)=AXBUL',
  '(A)VO=EY4',
  '(ANG)+=EY4NJ',
  '(ATARI)=AHTAA4RIY',
  '(A)TOM=AE',
  '(A)TTI=AE',
  ' (AT) =AET',
  ' (A)T=AH',
  '(A)=AE',

  ']B',
  ' (B) =BIY4',
  ' (BE)^#=BIH',
  '(BEING)=BIY4IHNX',
  ' (BOTH) =BOW4TH',
  ' (BUS)#=BIH4Z',
  '(BREAK)=BREY5K',
  '(BUIL)=BIH4L',
  '(B)=B',

  ']C',
  ' (C) =SIY4',
  ' (CH)^=K',
  '^E(CH)=K',
  '(CHA)R#=KEH5',
  '(CH)=CH',
  ' S(CI)#=SAY4',
  '(CI)A=SH',
  '(CI)O=SH',
  '(CI)EN=SH',
  '(CITY)=SIHTIY',
  '(C)+=S',
  '(CK)=K',
  '(COMMODORE)=KAA4MAHDOHR',
  '(COM)=KAHM',
  '(CUIT)=KIHT',
  '(CREA)=KRIYEY',
  '(C)=K',

  ']D',
  ' (D) =DIY4',
  ' (DR.) =DAA4KTER',
  '#:(DED) =DIHD',
  '.E(D) =D',
  '#:^E(D) =T',
  ' (DE)^#=DIH',
  ' (DO) =DUW',
  ' (DOES)=DAHZ',
  '(DONE) =DAH5N',
  '(DOING)=DUW4IHNX',
  ' (DOW)=DAW',
  '#(DU)A=JUW',
  '#(DU)^#=JAX',
  '(D)=D',

  ']E',
  ' (E) =IYIY4',
  '#:(E) =',
  '\':^(E) =',
  ' :(E) =IY',
  '#(ED) =D',
  '#:(E)D =',
  '(EV)ER=EH4V',
  '(E)^%=IY4',
  '(ERI)#=IY4RIY',
  '(ERI)=EH4RIH',
  '#:(ER)#=ER',
  '(ERROR)=EH4ROHR',
  '(ERASE)=IHREY5S',
  '(ER)#=EHR',
  '(ER)=ER',
  ' (EVEN)=IYVEHN',
  '#:(E)W=',
  '@(EW)=UW',
  '(EW)=YUW',
  '(E)O=IY',
  '#:&(ES) =IHZ',
  '#:(E)S =',
  '#:(ELY) =LIY',
  '#:(EMENT)=MEHNT',
  '(EFUL)=FUHL',
  '(EE)=IY4',
  '(EARN)=ER5N',
  ' (EAR)^=ER5',
  '(EAD)=EHD',
  '#:(EA) =IYAX',
  '(EA)SU=EH5',
  '(EA)=IY5',
  '(EIGH)=EY4',
  '(EI)=IY4',
  ' (EYE)=AY4',
  '(EY)=IY',
  '(EU)=YUW5',
  '(EQUAL)=IY4KWUL',
  '(E)=EH',

  ']F',
  ' (F) =EH4F',
  '(FUL)=FUHL',
  '(FRIEND)=FREH5ND',
  '(FATHER)=FAA4DHER',
  '(F)F=',
  '(F)=F',

  ']G',
  ' (G) =JIY4',
  '(GIV)=GIH5V',
  ' (G)I^=G',
  '(GE)T=GEH5',
  'SU(GGES)=GJEH4S',
  '(GG)=G',
  ' B#(G)=G',
  '(G)+=J',
  '(GREAT)=GREY4T',
  '(GON)E=GAO5N',
  '#(GH)=',
  ' (GN)=N',
  '(G)=G',

  ']H',
  ' (H) =EY4CH',
  ' (HAV)=/HAE6V',
  ' (HERE)=/HIYR',
  ' (HOUR)=AW5ER',
  '(HOW)=/HAW',
  '(H)#=/H',
  '(H)=',

  ']I',
  ' (IN)=IHN',
  ' (I) =AY4',
  '(I) =AY',
  '(IN)D=AY5N',
  'SEM(I)=IY',
  ' ANT(I)=AY',
  '(IER)=IYER',
  '#:R(IED) =IYD',
  '(IED) =AY5D',
  '(IEN)=IYEHN',
  '(IE)T=AY4EH',
  '(I\')=AY5',
  ' :(I)^%=AY5',
  ' :(IE) =AY4',
  '(I)%=IY',
  '(IE)=IY4',
  ' (IDEA)=AYDIY5AH',
  '(I)^+:#=IH',
  '(IR)#=AYR',
  '(IZ)%=AYZ',
  '(IS)%=AYZ',
  'I^(I)^#=IH',
  '+^(I)^+=AY',
  '#:^(I)^+=IH',
  '(I)^+=AY',
  '(IR)=ER',
  '(IGH)=AY4',
  '(ILD)=AY5LD',
  ' (IGN)=IHGN',
  '(IGN) =AY4N',
  '(IGN)^=AY4N',
  '(IGN)%=AY4N',
  '(ICRO)=AY4KROH',
  '(IQUE)=IY4K',
  '(I)=IH',

  ']J',
  ' (J) =JEY4',
  '(J)=J',

  ']K',
  ' (K) =KEY4',
  ' (K)N=',
  '(K)=K',

  ']L',
  ' (L) =EH4L',
  '(LO)C#=LOW',
  'L(L)=',
  '#:^(L)%=UL',
  '(LEAD)=LIYD',
  ' (LAUGH)=LAE4F',
  '(L)=L',

  ']M',
  ' (M) =EH4M',
  ' (MR.) =MIH4STER',
  ' (MS.)=MIH5Z',
  ' (MRS.) =MIH4SIXZ',
  '(MOV)=MUW4V',
  '(MACHIN)=MAHSHIY5N',
  'M(M)=',
  '(M)=M',

  ']N',
  ' (N) =EH4N',
  'E(NG)+=NJ',
  '(NG)R=NXG',
  '(NG)#=NXG',
  '(NGL)%=NXGUL',
  '(NG)=NX',
  '(NK)=NXK',
  ' (NOW) =NAW4',
  'N(N)=',
  '(NON)E=NAH4N',
  '(N)=N',

  ']O',
  ' (O) =OH4W',
  '(OF) =AHV',
  ' (OH) =OW5',
  '(OROUGH)=ER4OW',
  '#:(OR) =ER',
  '#:(ORS) =ERZ',
  '(OR)=AOR',
  ' (ONE)=WAHN',
  '#(ONE) =WAHN',
  '(OW)=OW',
  ' (OVER)=OW5VER',
  'PR(O)V=UW4',
  '(OV)=AH4V',
  '(O)^%=OW5',
  '(O)^EN=OW',
  '(O)^I#=OW5',
  '(OL)D=OW4L',
  '(OUGHT)=AO5T',
  '(OUGH)=AH5F',
  ' (OU)=AW',
  'H(OU)S#=AW4',
  '(OUS)=AXS',
  '(OUR)=OHR',
  '(OULD)=UH5D',
  '(OU)^L=AH5',
  '(OUP)=UW5P',
  '(OU)=AW',
  '(OY)=OY',
  '(OING)=OW4IHNX',
  '(OI)=OY5',
  '(OOR)=OH5R',
  '(OOK)=UH5K',
  'F(OOD)=UW5D',
  'L(OOD)=AH5D',
  'M(OOD)=UW5D',
  '(OOD)=UH5D',
  'F(OOT)=UH5T',
  '(OO)=UW5',
  '(O\')=OH',
  '(O)E=OW',
  '(O) =OW',
  '(OA)=OW4',
  ' (ONLY)=OW4NLIY',
  ' (ONCE)=WAH4NS',
  '(ON\'T)=OW4NT',
  'C(O)N=AA',
  '(O)NG=AO',
  ' :^(O)N=AH',
  'I(ON)=UN',
  '#:(ON)=UN',
  '#^(ON)=UN',
  '(O)ST=OW',
  '(OF)^=AO4F',
  '(OTHER)=AH5DHER',
  'R(O)B=RAA',
  '^R(O):#=OW5',
  '(OSS) =AO5S',
  '#:^(OM)=AHM',
  '(O)=AA',

  ']P',
  ' (P) =PIY4',
  '(PH)=F',
  '(PEOPL)=PIY5PUL',
  '(POW)=PAW4',
  '(PUT) =PUHT',
  '(P)P=',
  '(P)S=',
  '(P)N=',
  '(PROF.)=PROHFEH4SER',
  '(P)=P',

  ']Q',
  ' (Q) =KYUW4',
  '(QUAR)=KWOH5R',
  '(QU)=KW',
  '(Q)=K',
  ']R',
  ' (R) =AA5R',
  ' (RE)^#=RIY',
  '(R)R=',
  '(R)=R',

  ']S',
  ' (S) =EH4S',
  '(SH)=SH',
  '#(SION)=ZHUN',
  '(SOME)=SAHM',
  '#(SUR)#=ZHER',
  '(SUR)#=SHER',
  '#(SU)#=ZHUW',
  '#(SSU)#=SHUW',
  '#(SED)=ZD',
  '#(S)#=Z',
  '(SAID)=SEHD',
  '^(SION)=SHUN',
  '(S)S=',
  '.(S) =Z',
  '#:.E(S) =Z',
  '#:^#(S) =S',
  'U(S) =S',
  ' :#(S) =Z',
  '##(S) =Z',
  ' (SCH)=SK',
  '(S)C+=',
  '#(SM)=ZUM',
  '#(SN)\'=ZUM',
  '(STLE)=SUL',
  '(S)=S',

  ']T',
  ' (T) =TIY4',
  ' (THE) #=DHIY',
  ' (THE) =DHAX',
  '(TO) =TUX',
  ' (THAT)=DHAET',
  ' (THIS) =DHIHS',
  ' (THEY)=DHEY',
  ' (THERE)=DHEHR',
  '(THER)=DHER',
  '(THEIR)=DHEHR',
  ' (THAN) =DHAEN',
  ' (THEM) =DHAEN',
  '(THESE) =DHIYZ',
  ' (THEN)=DHEHN',
  '(THROUGH)=THRUW4',
  '(THOSE)=DHOHZ',
  '(THOUGH) =DHOW',
  '(TODAY)=TUXDEY',
  '(TOMO)RROW=TUMAA5',
  '(TO)TAL=TOW5',
  ' (THUS)=DHAH4S',
  '(TH)=TH',
  '#:(TED)=TIXD',
  'S(TI)#N=CH',
  '(TI)O=SH',
  '(TI)A=SH',
  '(TIEN)=SHUN',
  '(TUR)#=CHER',
  '(TU)A=CHUW',
  ' (TWO)=TUW',
  '&(T)EN =',
  '(T)=T',

  ']U',
  ' (U) =YUW4',
  ' (UN)I=YUWN',
  ' (UN)=AHN',
  ' (UPON)=AXPAON',
  '@(UR)#=UH4R',
  '(UR)#=YUH4R',
  '(UR)=ER',
  '(U)^ =AH',
  '(U)^^=AH5',
  '(UY)=AY5',
  ' G(U)#=',
  'G(U)%=',
  'G(U)#=W',
  '#N(U)=YUW',
  '@(U)=UW',
  '(U)=YUW',

  ']V',
  ' (V) =VIY4',
  '(VIEW)=VYUW5',
  '(V)=V',

  ']W',
  ' (W) =DAH4BULYUW',
  ' (WERE)=WER',
  '(WA)SH=WAA',
  '(WA)ST=WEY',
  '(WA)S=WAH',
  '(WA)T=WAA',
  '(WHERE)=WHEHR',
  '(WHAT)=WHAHT',
  '(WHOL)=/HOWL',
  '(WHO)=/HUW',
  '(WH)=WH',
  '(WAR)#=WEHR',
  '(WAR)=WAOR',
  '(WOR)^=WER',
  '(WR)=R',
  '(WOM)A=WUHM',
  '(WOM)E=WIHM',
  '(WEA)R=WEH',
  '(WANT)=WAA5NT',
  'ANS(WER)=ER',
  '(W)=W',

  ']X',
  ' (X) =EH4KR',
  ' (X)=Z',
  '(X)=KS',

  ']Y',
  ' (Y) =WAY4',
  '(YOUNG)=YAHNX',
  ' (YOUR)=YOHR',
  ' (YOU)=YUW',
  ' (YES)=YEHS',
  ' (Y)=Y',
  'F(Y)=AY',
  'PS(YCH)=AYK',
  '#:^(Y)=IY',
  '#:^(Y)I=IY',
  ' :(Y) =AY',
  ' :(Y)#=AY',
  ' :(Y)^+:#=IH',
  ' :(Y)^#=AY',
  '(Y)=IH',

  ']Z',
  ' (Z) =ZIY4',
  '(Z)=Z',
  'j',
]);

export const rules2 = encodePhonemeTable([
  '(A)=',
  '(!)=.',
  '(") =-AH5NKWOWT-',
  '(")=KWOW4T-',
  '(#)= NAH4MBER',
  '($)= DAA4LER',
  '(%)= PERSEH4NT',
  '(&)= AEND',
  '(\')=',
  '(*)= AE4STERIHSK',
  '(+)= PLAH4S',
  '(,)=,',
  ' (-) =-',
  '(-)=',
  '(.)= POYNT',
  '(/)= SLAE4SH',
  '(0)= ZIY4ROW',
  ' (1ST)=FER4ST',
  ' (10TH)=TEH4NTH',
  '(1)= WAH4N',
  ' (2ND)=SEH4KUND',
  '(2)= TUW4',
  ' (3RD)=THER4D',
  '(3)= THRIY4',
  '(4)= FOH4R',
  ' (5TH)=FIH4FTH',
  '(5)= FAY4V',
  ' (64) =SIH4KSTIY FOHR',
  '(6)= SIH4KS',
  '(7)= SEH4VUN',
  ' (8TH)=EY4TH',
  '(8)= EY4T',
  '(9)= NAY4N',
  '(:)=.',
  '(;)=.',
  '(<)= LEH4S DHAEN',
  '(=)= IY4KWULZ',
  '(>)= GREY4TER DHAEN',
  '(?)=?',
  '(@)= AE6T',
  '(^)= KAE4RIXT',
  ']A',
]);

function encodePhonemeTable (table) {
  let count     = 0;
  const buffers = [];
  table.forEach(function (rule) {
    count += rule.length;
    const buffer = new Uint8Array(rule.length);
    rule.split('').forEach((e, index) => {
      buffer[index] = e.charCodeAt(0)
    });
    buffer[buffer.length -1] = buffer[buffer.length -1] | 0x80;
    buffers.push(buffer);
  });
  const rules   = new Uint8Array(count);
  let pos = 0;
  buffers.forEach(function (buffer) {
    rules.set(buffer, pos);
    pos += buffer.length;
  });
  return rules;
}
