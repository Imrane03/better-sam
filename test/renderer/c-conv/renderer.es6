// This is the "plain" conversion of the C renderer to javascript.
// We use it as "reference" implementation to test against.
// So: c-conv renderer is always correct - as it behaves as plain SAM.
// The unit tests of our optimized renderer should match the output against
// this implementation and only pass if they are same.

import {
  mouthFormants5_29,
  throatFormants5_29,
  mouthFormants48_53,
  throatFormants48_53,
  freq1data,
  freq2data,
  freq3data,
  ampl1data,
  ampl2data,
  ampl3data,
  sampledConsonantFlags,
  tab47492,
  tab48426,
  sampleTable,
  blendRank,
  inBlendLength,
  outBlendLength,
  multtable,
  sinus,
  rectangle
} from './tables.es6';

import {BREAK, END} from '../../../src/common/constants.es6'

import UInt8 from '../../../src/types/UInt8.es6';

const PHONEME_PERIOD = 1;
const PHONEME_QUESTION = 2;
const RISING_INFLECTION = 1;
const FALLING_INFLECTION = 255;

function trans(mem39212, mem39213) {
  // return ((((mem39212 & 0xFF) * (mem39213 & 0xFF)) >> 8) & 0xFF) << 1;
  let carry;
  let temp;
  let mem39214 = 0, mem39215 = 0;
  let A = 0;
  let X = 8;
  do {
    carry = mem39212 & 0x01;
    mem39212 = mem39212 >> 1;
    if (carry !== 0)
    {
      carry = 0;
      A = mem39215;
      temp = (A + mem39213) & 0xFFFF;
      A = A + mem39213;
      if (temp > 255) carry = 1;
      mem39215 = A & 0xFF;
    }
    temp = mem39215 & 0x01;
    mem39215 = (mem39215 >> 1) | (carry?0x80:0);
    carry = temp;
    X--;
  } while (X !== 0);
  temp = mem39214 & 0x80;
  carry = temp;
  mem39215 = (mem39215 << 1) | (carry?0x01:0);

  return mem39215;
}

/**
 * SAM's voice can be altered by changing the frequencies of the
 * mouth formant (F1) and the throat formant (F2). Only the voiced
 * phonemes (5-29 and 48-53) are altered.
 *
 * This returns the three base frequency arrays.
 *
 * @return {Array}
 */
function SetMouthThroat(mouth, throat) {
  let initialFrequency;
  let newFrequency = 0;
  let pos = 5;
  const freqdata = [freq1data.slice(), freq2data.slice(), freq3data];

  // recalculate formant frequencies 5..29 for the mouth (F1) and throat (F2)
  while(pos < 30) {
    // recalculate mouth frequency
    initialFrequency = mouthFormants5_29[pos];
    if (initialFrequency !== 0) {
      newFrequency = trans(mouth, initialFrequency);
    }
    freqdata[0][pos] = newFrequency;

    // recalculate throat frequency
    initialFrequency = throatFormants5_29[pos];
    if(initialFrequency !== 0) {
      newFrequency = trans(throat, initialFrequency);
    }
    freqdata[1][pos] = newFrequency;
    pos++;
  }

  // recalculate formant frequencies 48..53
  pos = 0;
  while(pos < 6) {
    // recalculate F1 (mouth formant)
    initialFrequency = mouthFormants48_53[pos];
    newFrequency = trans(mouth, initialFrequency);
    freqdata[0][pos+48] = newFrequency;
    // recalculate F2 (throat formant)
    initialFrequency = throatFormants48_53[pos];
    newFrequency = trans(throat, initialFrequency);
    freqdata[1][pos+48] = newFrequency;
    pos++;
  }

  return freqdata;
}

/** CREATE FRAMES
 *
 * The length parameter in the list corresponds to the number of frames
 * to expand the phoneme to. Each frame represents 10 milliseconds of time.
 * So a phoneme with a length of 7 = 7 frames = 70 milliseconds duration.
 *
 * The parameters are copied from the phoneme to the frame verbatim.
 *
 * @param {Number} pitch
 * @param {Uint8Array} pitches
 * @param {Uint8Array} frequency
 * @param {Uint8Array} amplitude
 * @param {Uint8Array} phonemeIndexOutput
 * @param {Uint8Array} phonemeLengthOutput
 * @param {Uint8Array} stressOutput
 * @param {Uint8Array} sampledConsonantFlag
 * @param {Uint8Array[]} frequencyData
 *
 * @return undefined
 */
function CreateFrames (
  pitch,
  pitches,
  frequency,
  amplitude,
  phonemeIndexOutput,
  phonemeLengthOutput,
  stressOutput,
  sampledConsonantFlag,
  frequencyData) {
  /**
   * Create a rising or falling inflection 30 frames prior to index X.
   * A rising inflection is used for questions, and a falling inflection is used for statements.
   */
  const AddInflection = (inflection, pos) => {
    let A = new UInt8(0);
    // store the location of the punctuation
    let end = pos;
    if (pos < 30) {
      pos = 0;
    } else {
      pos -= 30;
    }
    // FIXME: Explain this fix better, it's not obvious
    // ML : A =, fixes a problem with invalid pitch with '.'
    while (A.set(pitches[pos]).get() === 127) {
      ++pos;
    }

    while (pos !== end) {
      // add the inflection direction
      A.inc(inflection);

      // set the inflection
      pitches[pos] = A.get();

      while ((++pos !== end) && pitches[pos] === 255) { /* keep looping */}
    }
  };

  let X = new UInt8(0);
  let i = 0;
  while(i < 256) {
    // get the phoneme at the index
    let phoneme = phonemeIndexOutput[i];

    // if terminal phoneme, exit the loop
    if (phoneme === 255) break;

    if (phoneme === PHONEME_PERIOD) {
      AddInflection(RISING_INFLECTION, X.get());
    } else if (phoneme === PHONEME_QUESTION) {
      AddInflection(FALLING_INFLECTION, X.get());
    }

    // get the stress amount (more stress = higher pitch)
    let phase1 = tab47492[stressOutput[i] + 1];

    // get number of frames to write
    let phase2 = phonemeLengthOutput[i];

    // copy from the source to the frames list
    do {
      frequency[0][X.get()] = frequencyData[0][phoneme];     // F1 frequency
      frequency[1][X.get()] = frequencyData[1][phoneme];     // F2 frequency
      frequency[2][X.get()] = frequencyData[2][phoneme];     // F3 frequency
      amplitude[0][X.get()] = ampl1data[phoneme];     // F1 amplitude
      amplitude[1][X.get()] = ampl2data[phoneme];     // F2 amplitude
      amplitude[2][X.get()] = ampl3data[phoneme];     // F3 amplitude
      sampledConsonantFlag[X.get()] = sampledConsonantFlags[phoneme]; // phoneme data for sampled consonants
      pitches[X.get()] = pitch + phase1;      // pitch
      X.inc();
    } while(--phase2 > 0);
    ++i;
  }
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
 * @param {Uint8Array} phonemeIndexOutput
 * @param {Uint8Array} phonemeLengthOutput
 *
 * @return {Number}
 */
function CreateTransitions(pitches, frequency, amplitude, phonemeIndexOutput, phonemeLengthOutput) {
  //written by me because of different table positions.
  // mem[47] = ...
  // 168=pitches
  // 169=frequency1
  // 170=frequency[1]
  // 171=frequency3
  // 172=amplitude1
  // 173=amplitude2
  // 174=amplitude3
  const Read = (p, Y) => {
    switch(p) {
      case 168: return pitches[Y];
      case 169: return frequency[0][Y];
      case 170: return frequency[1][Y];
      case 171: return frequency[2][Y];
      case 172: return amplitude[0][Y];
      case 173: return amplitude[1][Y];
      case 174: return amplitude[2][Y];
    }

    throw new Error ('Error reading from tables');
  };

  const Write = (p, Y, value) => {
    switch (p) {
      case 168: pitches[Y] = value; return;
      case 169: frequency[0][Y] = value; return;
      case 170: frequency[1][Y] = value; return;
      case 171: frequency[2][Y] = value; return;
      case 172: amplitude[0][Y] = value; return;
      case 173: amplitude[1][Y] = value; return;
      case 174: amplitude[2][Y] = value; return;
    }

    throw new Error ('Error writing to tables');
  };

  // linearly interpolate values
  const interpolate = (width, table, frame, mem53) => {
    let sign      = (mem53 < 0);
    let remainder = new UInt8(Math.abs(mem53) % width);
    let div       = new UInt8((mem53 / width) | 0);

    let error = new UInt8(0);
    let pos   = width;

    while (--pos > 0) {
      let val   = new UInt8(Read(table, frame) + div.get());
      error.inc(remainder.get());
      if (error.get() >= width) {
        // accumulated a whole integer error, so adjust output
        error.dec(width);
        if (sign) {
          val.dec();
        } else if (val.get()) {
          // if input is 0, we always leave it alone
          val.inc();
        }
      }
      Write(table, ++frame, val.get()); // Write updated value back to next frame.
      val.inc(div.get());
    }
  };

  const interpolate_pitch = (width, pos, mem49, phase3) => {
    // unlike the other values, the pitches[] interpolates from
    // the middle of the current phoneme to the middle of the
    // next phoneme

    // half the width of the current and next phoneme
    let cur_width  = phonemeLengthOutput[pos] >> 1;
    let next_width = phonemeLengthOutput[pos+1] >> 1;
    // sum the values
    width = cur_width + next_width;
    let pitch = pitches[next_width + mem49] - pitches[mem49 - cur_width];
    interpolate(width, 168, phase3, pitch);
  };

  let phase1;
  let phase2;
  let mem49 = new UInt8(0);
  let pos = new UInt8(0);
  while(1) {
    let phoneme      = phonemeIndexOutput[pos.get()];
    let next_phoneme = phonemeIndexOutput[pos.get()+1];

    if (next_phoneme === 255) {
      break; // 255 == end_token
    }

    // get the ranking of each phoneme
    let next_rank = blendRank[next_phoneme];
    let rank      = blendRank[phoneme];

    // compare the rank - lower rank value is stronger
    if (rank === next_rank) {
      // same rank, so use out blend lengths from each phoneme
      phase1 = outBlendLength[phoneme];
      phase2 = outBlendLength[next_phoneme];
    } else if (rank < next_rank) {
      // next phoneme is stronger, so us its blend lengths
      phase1 = inBlendLength[next_phoneme];
      phase2 = outBlendLength[next_phoneme];
    } else {
      // current phoneme is stronger, so use its blend lengths
      // note the out/in are swapped
      phase1 = outBlendLength[phoneme];
      phase2 = inBlendLength[phoneme];
    }

    mem49.inc(phonemeLengthOutput[pos.get()]);

    let speedcounter = new UInt8(mem49.get() + phase2);
    let phase3       = new UInt8(mem49.get() - phase1);
    let transition   = new UInt8(phase1 + phase2); // total transition?

    if (((transition.get() - 2) & 128) === 0) {
      interpolate_pitch(transition.get(), pos.get(), mem49.get(), phase3.get());
      let table = 169;
      while (table < 175) {
        // tables:
        // 168  pitches[]
        // 169  frequency1
        // 170  frequency[1]
        // 171  frequency3
        // 172  amplitude1
        // 173  amplitude2
        // 174  amplitude3

        let value = Read(table, speedcounter.get()) - Read(table, phase3.get());
        interpolate(transition.get(), table, phase3.get(), value);
        table++;
      }
    }
    pos.inc();
  }

  // add the length of this phoneme
  return (mem49.get() + phonemeLengthOutput[pos.get()]) & 0xFF;
}

/** ASSIGN PITCH CONTOUR
 *
 * This subtracts the F1 frequency from the pitch to create a
 * pitch contour. Without this, the output would be at a single
 * pitch level (monotone).
 *
 * @param {Uint8Array} pitches
 * @param {Uint8Array} frequency1
 *
 */
function AssignPitchContour (pitches, frequency1) {
  for(let i = 0; i < 256; i++) {
    // subtract half the frequency of the formant 1.
    // this adds variety to the voice
    pitches[i] -= (frequency1[i] >> 1);
  }
}

/**
 * RESCALE AMPLITUDE
 *
 * Rescale volume from a linear scale to decibels.
 */
function RescaleAmplitude (amplitude) {
  const amplitudeRescale = [
    0x00, 0x01, 0x02, 0x02, 0x02, 0x03, 0x03, 0x04,
    0x04, 0x05, 0x06, 0x08, 0x09, 0x0B, 0x0D, 0x0F,
    0x00  //17 elements?
  ];
  for(let i = 255; i >= 0; i--) {
    amplitude[0][i] = amplitudeRescale[amplitude[0][i]];
    amplitude[1][i] = amplitudeRescale[amplitude[1][i]];
    amplitude[2][i] = amplitudeRescale[amplitude[2][i]];
  }
}
/**
 * @param {Uint8Array} phonemeindex
 * @param {Uint8Array} phonemeLength
 * @param {Uint8Array} stress
 * @param {Number} [pitch]
 * @param {Number} [mouth]
 * @param {Number} [throat]
 * @param {Number} [speed]
 * @param {Boolean} [singmode]
 *
 * @return Uint8Array
 */
export default function Renderer(phonemeindex, phonemeLength, stress, pitch, mouth, throat, speed, singmode) {
  pitch = (pitch || 64) & 0xFF;
  mouth = (mouth || 128) & 0xFF;
  throat = (throat || 128) & 0xFF;
  speed = (speed || 72) & 0xFF;
  singmode = singmode || false;

  // Writer to buffer.
  function Output (index, A) {
    // timetable for more accurate c64 simulation
    const timetable = [
      [162, 167, 167, 127, 128],
      [226, 60, 60, 0, 0],
      [225, 60, 59, 0, 0],
      [200, 0, 0, 54, 55],
      [199, 0, 0, 54, 54]
    ];
    Output.bufferpos += timetable[Output.oldTimeTableIndex][index];
    if (Output.bufferpos / 50 > Output.buffer.length) {
      throw new Error('Buffer overflow!');
    }
    Output.oldTimeTableIndex = index;
    // write a little bit in advance
    for (let k = 0; k < 5; k++) {
      Output.buffer[(Output.bufferpos / 50 | 0) + k] = (A & 15) * 16;
    }
  }
  // TODO, check for free the memory, 10 seconds of output should be more than enough
  Output.buffer = new Uint8Array(22050 * 10);
  Output.bufferpos = 0;
  Output.oldTimeTableIndex = 0;

  const freqdata = SetMouthThroat(mouth, throat);

  const phonemeIndexOutput  = new Uint8Array(60);
  const stressOutput        = new Uint8Array(60);
  const phonemeLengthOutput = new Uint8Array(60);
  const pitches             = new Uint8Array(256);

  const frequency = [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)];
  const amplitude = [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)];
  const sampledConsonantFlag = new Uint8Array(256);

  // Main render loop.
  let srcpos  = 0; // Position in source
  let destpos = 0; // Position in output
  while(1) {
    let A = phonemeindex[srcpos];
    phonemeIndexOutput[destpos] = A;
    switch(A) {
      case END:
        Render(phonemeIndexOutput, phonemeLengthOutput, stressOutput);
        // Hack for PhantomJS which does not have slice() on UintArray8
        if (process.env.NODE_ENV === 'karma-test') {
          return Output.buffer.slice
            ? Output.buffer.slice(0, Math.floor(Output.bufferpos / 50))
            : new Uint8Array([].slice.call(Output.buffer).slice(0, Math.floor(Output.bufferpos / 50)));
        }
        return Output.buffer.slice(0, Math.floor(Output.bufferpos / 50));
      case BREAK:
        phonemeIndexOutput[destpos] = END;
        Render(phonemeIndexOutput, phonemeLengthOutput, stressOutput);
        destpos = 0;
        break;
      case 0:
        break;
      default:
        phonemeLengthOutput[destpos] = phonemeLength[srcpos];
        stressOutput[destpos]        = stress[srcpos];
        ++destpos;
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
   */
  function Render (phonemeIndexOutput, phonemeLengthOutput, stressOutput) {
    if (phonemeIndexOutput[0] === 255) {
      return; //exit if no data
    }
    if (process.env.NODE_ENV === 'karma-test') {
      // Ensure we have empty buffers in testing to be able to compare them.
      for (let i = 0; i < 256; i++) {
        pitches[i] = 0;
        amplitude[0][i] = 0;
        frequency[0][i] = 0;
        amplitude[1][i] = 0;
        frequency[1][i] = 0;
        amplitude[2][i] = 0;
        frequency[2][i] = 0;
        sampledConsonantFlag[i] = 0;
      }
    }

    CreateFrames(
      pitch,
      pitches,
      frequency,
      amplitude,
      phonemeIndexOutput,
      phonemeLengthOutput,
      stressOutput,
      sampledConsonantFlag,
      freqdata
    );
    let t = CreateTransitions(
      pitches,
      frequency,
      amplitude,
      phonemeIndexOutput,
      phonemeLengthOutput
    );

    if (!singmode) {
      AssignPitchContour(pitches, frequency[0]);
    }
    RescaleAmplitude(amplitude);

    if (process.env.NODE_ENV === 'development') {
      PrintOutput(pitches, frequency, amplitude, sampledConsonantFlag);
    }
    if (process.env.NODE_ENV === 'karma-test') {
      // Karma run, store data for karma retrieval.
      Renderer.karmaOutput = {
        sampledConsonantFlag: sampledConsonantFlag,
        amplitude1: amplitude[0],
        frequency1: frequency[0],
        amplitude2: amplitude[1],
        frequency2: frequency[1],
        amplitude3: amplitude[2],
        frequency3: frequency[2],
        pitches: pitches,
        freq1data: freqdata[0],
        freq2data: freqdata[1],
        freq3data: freqdata[2],
      };
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
  function ProcessFrames(mem48, speed, frequency, pitches, amplitude, sampledConsonantFlag) {
    const CombineGlottalAndFormants = (phase1, phase2, phase3, Y) => {
      let tmp; // unsigned int
      tmp   = multtable[sinus[phase1]     | amplitude[0][Y]];
      tmp  += multtable[sinus[phase2]     | amplitude[1][Y]];
      tmp  += tmp > 255 ? 1 : 0; // if addition above overflows, we for some reason add one;
      tmp  += multtable[rectangle[phase3] | amplitude[2][Y]];
      tmp  += 136;
      tmp >>= 4; // Scale down to 0..15 range of C64 audio.

      Output(0, tmp & 0xf);
    };

    const RenderSample = (mem66, consonantFlag, mem49) => {
      const RenderVoicedSample = (hi, off, phase1) => {
        hi = hi & 0xFFFF; // unsigned short
        off = off & 0xFF; // unsigned char
        phase1 = phase1 & 0xFF; // unsigned char
        do {
          let sample = sampleTable[hi+off];
          let bit = 8;
          do {
            if ((sample & 128) !== 0) {
              Output(3, 26);
            } else {
              Output(4, 6);
            }
            sample <<= 1;
          } while(--bit !== 0);
          off++;
        } while (((++phase1) & 0xFF) !== 0);

        return off;
      };

      const RenderUnvoicedSample = (hi, off, mem53) => {
        hi = hi & 0xFFFF; // unsigned short
        off = off & 0xFF; // unsigned char
        mem53 = mem53 & 0xFF; // unsigned char
        do {
          let bit = 8;
          let sample = sampleTable[hi+off];
          do {
            if ((sample & 128) !== 0) {
              Output(2, 5);
            }
            else {
              Output(1, mem53);
            }
            sample <<= 1;
          } while (--bit !== 0);
        } while (((++off) & 0xFF) !== 0);
      };

      // mem49 == current phoneme's index - unsigned char

      // mask low three bits and subtract 1 get value to
      // convert 0 bits on unvoiced samples.
      let hibyte = (consonantFlag & 7) - 1;

      // determine which offset to use from table { 0x18, 0x1A, 0x17, 0x17, 0x17 }
      // T, S, Z                0          0x18
      // CH, J, SH, ZH          1          0x1A
      // P, F*, V, TH, DH       2          0x17
      // /H                     3          0x17
      // /X                     4          0x17

      let hi = hibyte * 256; // unsigned short
      // voiced sample?
      let pitch = consonantFlag & 248; // unsigned char
      if(pitch === 0) {
        // voiced phoneme: Z*, ZH, V*, DH
        pitch = pitches[mem49 & 0xFF] >> 4;
        return RenderVoicedSample(hi, mem66, pitch ^ 255);
      }
      RenderUnvoicedSample(hi, pitch ^ 255, tab48426[hibyte]);
      return mem66;
    };

    let speedcounter = new UInt8(72);
    let phase1 = new UInt8();
    let phase2 = new UInt8();
    let phase3 = new UInt8();
    let mem66 = new UInt8();
    let Y = new UInt8();
    let glottal_pulse = new UInt8(pitches[0]);
    let mem38 = new UInt8(glottal_pulse.get() - (glottal_pulse.get() >> 2)); // mem44 * 0.75

    while(mem48) {
      let flags = sampledConsonantFlag[Y.get()];

      // unvoiced sampled phoneme?
      if ((flags & 248) !== 0) {
        mem66.set(RenderSample(mem66.get(), flags, Y.get()));
        // skip ahead two in the phoneme buffer
        Y.inc(2);
        mem48 -= 2;
        speedcounter.set(speed);
      } else {
        CombineGlottalAndFormants(phase1.get(), phase2.get(), phase3.get(), Y.get());

        speedcounter.dec();
        if (speedcounter.get() === 0) {
          Y.inc(); //go to next amplitude
          // decrement the frame count
          mem48--;
          if(mem48 === 0) {
            return;
          }
          speedcounter.set(speed);
        }

        glottal_pulse.dec();

        if(glottal_pulse.get() !== 0) {
          // not finished with a glottal pulse

          mem38.dec();
          // within the first 75% of the glottal pulse?
          // is the count non-zero and the sampled flag is zero?
          if((mem38.get() !== 0) || (flags === 0)) {
            // reset the phase of the formants to match the pulse
            phase1.inc(frequency[0][Y.get()]);
            phase2.inc(frequency[1][Y.get()]);
            phase3.inc(frequency[2][Y.get()]);
            continue;
          }

          // voiced sampled phonemes interleave the sample with the
          // glottal pulse. The sample flag is non-zero, so render
          // the sample for the phoneme.
          mem66.set(RenderSample(mem66.get(), flags, Y.get()));
        }
      }

      glottal_pulse.set(pitches[Y.get()]);
      mem38.set(glottal_pulse.get() - (glottal_pulse.get() >> 2)); // mem44 * 0.75

      // reset the formant wave generators to keep them in
      // sync with the glottal pulse
      phase1.set(0);
      phase2.set(0);
      phase3.set(0);
    }
  }
}

function PrintOutput(pitches, frequency, amplitude, sampledConsonantFlag) {
  function pad(num) {
    let s = '00000' + num;
    return s.substr(s.length - 5);
  }
  console.log('===========================================');
  console.log('Final data for speech output:');
  let i = 0;
  console.log(' flags ampl1 freq1 ampl2 freq2 ampl3 freq3 pitch');
  console.log('------------------------------------------------');
  while(i < 255)
  {
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
