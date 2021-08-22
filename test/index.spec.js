import { assert } from 'chai'

import SamJs from '../src/index.es6';

describe('index.es6', () => {
  describe('SamJs', () => {
    it('should have method buf8', () => {
      const sam = new SamJs({});
      assert.isDefined(sam.buf8);
    })
    it('should have method buf32', () => {
      const sam = new SamJs({});
      assert.isDefined(sam.buf32);
    })
    it('should have method speak', () => {
      const sam = new SamJs({});
      assert.isDefined(sam.speak);
    })
    it('should speak', () => {
      let bufferLength, setBuffer
      const source = {
        buffer: {
          set (buffer) {
            assert.strictEqual(buffer, soundBuffer)
          }
        },
        connect (destination) {
          assert.strictEqual(destination, context.destination)
        },
        start (when) {
          assert.strictEqual(when, 0)
          assert.notEqual(setBuffer, undefined)
          assert.strictEqual(setBuffer.length, bufferLength)
          assert.notEqual(this.onended, undefined)
          this.onended()
        }
      };
      const context = {
        createBufferSource () {
          return source
        },
        createBuffer(numberOfChannels, length, sampleRate) {
          bufferLength = length
          assert.strictEqual(numberOfChannels, 1)
          assert.notEqual(length, 0)
          assert.strictEqual(sampleRate, 22050)
          return soundBuffer
        },
        destination: {}
      };
      const soundBuffer = {
        getChannelData (channel) {
          assert.strictEqual(channel, 0)
          return setBuffer = []
        }
      };
      global.AudioContext = function () {
        return context
      }

      const sam = new SamJs({});
      return sam.speak('/HEHLOW').then(
        () => {
          delete global.AudioContext
        },
        (e) => {
          delete global.AudioContext
          console.log(e)
          assert.fail('Failed to play.');
        });
    })
  });
  it('should have method download', () => {
    const sam = new SamJs({});
    assert.isDefined(sam.download);
  })
});
