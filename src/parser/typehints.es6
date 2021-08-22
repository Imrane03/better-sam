/**
 * Retrieves a phoneme from the buffer.
 *
 * @callback getPhoneme
 * @param {Number} position The position in the phoneme array to get.
 * @return {Number}
 */

/**
 * Set a phoneme in the buffer.
 *
 * @callback setPhoneme
 * @param {Number} position    The position in the phoneme array to set.
 * @param {Number} phoneme     The phoneme to set.
 */

/**
 * Insert a phoneme at the given position.
 *
 * @callback insertPhoneme
 * @param {Number} position    The position in the phoneme array to insert at.
 * @param {Number} phoneme     The phoneme to insert.
 * @param {Number} stressValue The stress.
 * @param {Number} [length]    The (optional) phoneme length, if not given, length will be 0.
 */

/**
 * Set the length for a phoneme in the buffer.
 *
 * @callback setPhonemeLength
 * @param {Number} position The position in the phoneme array to set.
 * @param {Number} length   The phoneme length to set.
 */

/**
 * Retrieve the length for a phoneme from the buffer.
 *
 * @callback getPhonemeLength
 * @param {Number} position    The position in the phoneme array to get.
 * @return {Number}
 */

/**
 * Set the stress for a phoneme in the buffer.
 *
 * @callback setPhonemeStress
 * @param {Number} position The position in the phoneme array to set.
 * @param {Number} length   The phoneme stress to set.
 */

/**
 * Retrieve the stress for a phoneme from the buffer.
 *
 * @callback getPhonemeStress
 * @param {Number} position    The position in the phoneme array to get.
 * @return {Number}
 */

