const bbcode = require('..');

describe("bbcode", function() {
  describe("none", function() {
    it("undefined", function() {
      expect(bbcode.render()).toBe('');
    });
    it("empty", function() {
      expect(bbcode.render('')).toBe('');
    });
    it("whitespace", function() {
      expect(bbcode.render(' \t \n ')).toBe('');
    });
  });
  describe("plain", function() {
    it("single line", function() {
      expect(bbcode.render('hello world.')).toBe('<p>hello world.</p>\n');
    });
    it("two paragraphs", function() {
      expect(bbcode.render('The world is but a stage.\n\n\nTo thine own self be true.\n')).toBe('<p>The world is but a stage.</p>\n<p>To thine own self be true.</p>\n');
    });
    it("escaping", function() {
      expect(bbcode.render('hello & <script>alert("gotcha!")</script>')).toBe('<p>hello &amp; &lt;script&gt;alert("gotcha!")&lt;/script&gt;</p>\n');
    });
  });
  describe("style", function() {
    it("simple", function() {
      expect(bbcode.render('[i]hello[/i] [B]world[/B].')).toBe('<p><i>hello</i> <b>world</b>.</p>\n');
    });
    it("nested", function() {
      expect(bbcode.render('[i]hello [B]world[/B][/i].')).toBe('<p><i>hello <b>world</b></i>.</p>\n');
    });
  });
  describe("links", function() {
    it("simple", function() {
      expect(bbcode.render('Visit [url]www.example.com[/url]!')).toBe('<p>Visit <a href="http://www.example.com">www.example.com</a>!</p>\n');
    });
    it("with domain", function() {
      expect(bbcode.render('Visit [url]http://www.example.com[/url]!')).toBe('<p>Visit <a href="http://www.example.com">http://www.example.com</a>!</p>\n');
    });
    it("simple anchor", function() {
      expect(bbcode.render('Visit [url=www.example.com]example.com[/url]!')).toBe('<p>Visit <a href="http://www.example.com">example.com</a>!</p>\n');
    });
    it("markup anchor", function() {
      expect(bbcode.render('Visit [url=www.example.com][b]example[/b].com[/url]!')).toBe('<p>Visit <a href="http://www.example.com"><b>example</b>.com</a>!</p>\n');
    });
    it("escaping", function() {
      expect(bbcode.render('Visit [url]savage">.com[/url]!')).toBe('<p>Visit <a href="http://savage&quot;&gt;.com">savage"&gt;.com</a>!</p>\n');
    });
  });
  describe("links", function() {
    it("single line", function() {
      expect(bbcode.render('[list][*]one[*]two[*]three[/list]')).toBe('<ul>\n  <li>one</li>\n  <li>two</li>\n  <li>three</li>\n</ul>\n');
    });
    it("multiple lines", function() {
      expect(bbcode.render('[list]\n[*] one\n[*] two\n[*] three\n[/list]')).toBe('<ul>\n  <li>one</li>\n  <li>two</li>\n  <li>three</li>\n</ul>\n');
    });
    it("stuff around", function() {
      expect(bbcode.render('important stuff\n[list]\n[*] one\n[*] two\n[*] three\n[/list]\nmore stuff')).toBe('<p>important stuff</p>\n<ul>\n  <li>one</li>\n  <li>two</li>\n  <li>three</li>\n</ul>\n<p>more stuff</p>\n');
    });
    it("ordered list", function() {
      expect(bbcode.render('[list=1]\n[*] one\n[*] two\n[*] three\n[/list]')).toBe('<ol>\n  <li>one</li>\n  <li>two</li>\n  <li>three</li>\n</ol>\n');
    });
  });
});
