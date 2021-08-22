export const pR    = 23;
export const pD    = 57;
export const pT    = 69;

export const PHONEME_PERIOD = 1;
export const PHONEME_QUESTION = 2;

/**
 * unknown: ' *', '.*', '?*', ',*', '-*'
 */
export const FLAG_8000     = 0x8000;

/**
 * unknown: '.*', '?*', ',*', '-*', 'Q*'
 */
export const FLAG_4000     = 0x4000;


export const FLAG_FRICATIVE= 0x2000;

/**
 * liquic consonant
 */
export const FLAG_LIQUIC   = 0x1000;

export const FLAG_NASAL    = 0x0800;

export const FLAG_ALVEOLAR = 0x0400;
/**
 * unused
 */
export const FLAG_0200     = 0x0200;

export const FLAG_PUNCT    = 0x0100;

export const FLAG_VOWEL    = 0x0080;

export const FLAG_CONSONANT= 0x0040;
/**
 *  dipthong ending with YX
 *
 */
export const FLAG_DIP_YX   = 0x0020;

export const FLAG_DIPTHONG = 0x0010;
/** unknown:
 *    'M*', 'N*', 'NX', 'DX', 'Q*', 'CH', 'J*', 'B*', '**', '**', 'D*',
 *    '**', '**', 'G*', '**', '**', 'GX', '**', '**', 'P*', '**', '**',
 *    'T*', '**', '**', 'K*', '**', '**', 'KX', '**', '**'
 */
export const FLAG_0008     = 0x0008;

export const FLAG_VOICED   = 0x0004;

/**
 * stop consonant
 */
export const FLAG_STOPCONS = 0x0002;

export const FLAG_UNVOICED_STOPCONS  = 0x0001;
