"use strict";

const color = require('..');

describe('color', function() {
  describe('rgb2hsl', function() {
    it('string', function() {
      expect(color.rgb2hsl('#000000')).toEqual([0, 0, 0]);
      expect(color.rgb2hsl('ffffff')).toEqual([0, 0, 1]);
      expect(color.rgb2hsl('00ff00')).toEqual([120, 1, 0.5]);
      expect(color.rgb2hsl('#00007faa')).toEqual([240, 1, 0.25]);
      expect(color.rgb2hsl('#9e1a20')).toEqual([357, 0.72, 0.36]);
    });
    it('components', function() {
      expect(color.rgb2hsl(0, 0, 0)).toEqual([0, 0, 0]);
      expect(color.rgb2hsl(255, 255, 255)).toEqual([0, 0, 1]);
      expect(color.rgb2hsl(0, 255, 0)).toEqual([120, 1, 0.5]);
      expect(color.rgb2hsl(0, 0, 127)).toEqual([240, 1, 0.25]);
      expect(color.rgb2hsl(158, 26, 32)).toEqual([357, 0.72, 0.36]);
    });
    it('invalid', function() {
      expect(color.rgb2hsl()).toBeUndefined();
      expect(color.rgb2hsl('xyz')).toBeUndefined();
      expect(color.rgb2hsl(128, 5)).toBeUndefined();
      expect(color.rgb2hsl(128, 255, 192, 15)).toBeUndefined();
    });
  });
  describe('rgb2css', function() {
    it('components', function() {
      expect(color.rgb2css(0, 0, 0)).toBe('black');
      expect(color.rgb2css(255, 255, 255)).toBe('white');
      expect(color.rgb2css(0, 255, 0)).toBe('#00ff00');
      expect(color.rgb2css(0, 0, 127)).toBe('#00007f');
      expect(color.rgb2css(158, 26, 32)).toBe('#9e1a20');
    });
    it('invalid', function() {
      expect(color.rgb2css()).toBeUndefined();
      expect(color.rgb2css(1, 2)).toBeUndefined();
      expect(color.rgb2css(0, 'foo', undefined)).toBe('black');
    });
  });
  describe('hsl2rgb', function() {
    it('components', function() {
      expect(color.hsl2rgb(357, 0.72, 0.36)).toEqual([158, 26, 32]);
      expect(color.hsl2rgb(0, 0, 0)).toEqual([0, 0, 0]);
      expect(color.hsl2rgb(180, 0, 0)).toEqual([0, 0, 0]);
      expect(color.hsl2rgb(90, 1, 1)).toEqual([255, 255, 255]);
    });
    it('invalid', function() {
      expect(color.hsl2rgb()).toBeUndefined();
      expect(color.hsl2rgb(1, 2)).toBeUndefined();
      expect(color.hsl2rgb(0, 'foo', undefined)).toEqual([0, 0, 0]);
    });
  });
  describe('hsl2css', function() {
    it('components', function() {
      expect(color.hsl2css(357, 0.72, 0.36)).toBe('hsl(357, 72%, 36%)');
      expect(color.hsl2css(0, 0, 0)).toEqual('black');
      expect(color.hsl2css(180, 0.5, 0.5)).toEqual('hsl(180, 50%, 50%)');
      expect(color.hsl2css(90, 1, 1)).toEqual('white');
    });
    it('invalid', function() {
      expect(color.hsl2css()).toBeUndefined();
      expect(color.hsl2css(1, 2)).toBeUndefined();
      expect(color.hsl2css(1, 2, 3)).toBe('white');
    });
  });
  describe('hueCircle', function() {
    it('1', function() {
      expect(color.hueCircle('#ff0000', 1)).toEqual(['#ff0000']);
    });
    it('2', function() {
      expect(color.hueCircle('#ff0000', 2)).toEqual(['#ff0000', '#00ffff']);
    });
    it('5', function() {
      expect(color.hueCircle('#9e1a20', 5)).toEqual(['#9e1a20', '#8a9e1a', '#1a9e48', '#1a559e', '#7d1a9e']);
    });
    it('invalid', function() {
      expect(color.hueCircle('mumble')).toBeUndefined();
      expect(color.hueCircle('#7f7f7f')).toEqual(['#7f7f7f']);
    });
  });
});
