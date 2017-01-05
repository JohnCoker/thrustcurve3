"use strict";

var crawlers = require("..");

describe("crawlers", function() {
  describe("match", function() {
    it("exists", function() {
      expect(typeof crawlers.match).toBe('function');
    });
    it("missing", function() {
      expect(crawlers.match(undefined)).toBe(true);
      expect(crawlers.match(null)).toBe(true);
      expect(crawlers.match('')).toBe(true);
      expect(crawlers.match('-')).toBe(true);
    });
    it("bots", function() {
      expect(crawlers.match('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
      expect(crawlers.match('Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)')).toBe(true);
    });
    it("desktop browsers", function() {
      expect(crawlers.match('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36')).toBe(false);
      expect(crawlers.match('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:43.0) Gecko/20100101 Firefox/43.0')).toBe(false);
    });
    it("mobile browsers", function() {
      expect(crawlers.match('Mozilla/5.0 (Linux; Android 4.4.4; D5503 Build/14.4.A.0.157) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36')).toBe(false);
      expect(crawlers.match('Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1')).toBe(false);
    });
  });
  describe("all", function() {
    it("exists", function() {
      expect(typeof crawlers.all).toBe('object');
      expect(Array.isArray(crawlers.all)).toBe(true);
    });
    it("has hits", function() {
      var total = 0,
          i;
      for (i = 0; i < crawlers.all.length; i++)
        total += crawlers.all[i].hits;
      expect(total).toBeGreaterThan(0);
    });
  });
});
