const svg = require("..");

describe("svg", function() {
  describe("module", function() {
    it("format", function() {
      expect(svg.format).toBe('image/svg+xml');
    });
    it("Image", function() {
      expect(typeof svg.Image).toBe('function');
    });
  });
  describe("empty", function() {
    var image;
    it("construct", function() {
      image = new svg.Image(200, 100);
      expect(image).toBeDefined();
      expect(image.width).toBe(200);
      expect(image.height).toBe(100);
    });
    it("render", function() {
      var text = image.render();
      expect(text).toBeDefined();
      var lines = text.split(/\n\s*/);
      expect(lines.length).toBe(2);
      expect(lines[0]).toMatch(/^<svg/);
      expect(lines[1]).toMatch(/<\/svg>\s*$/);
    });
  });
  describe("example", function() {
    // https://en.wikipedia.org/wiki/Scalable_Vector_Graphics#Example
    var image;
    it("construct", function() {
      image = new svg.Image(250, 250);
      expect(image).toBeDefined();
      expect(image.width).toBe(250);
      expect(image.height).toBe(250);
    });
    it("fillRect", function() {
      image.fillStyle = 'lime';
      image.fillRect(25, 25, 200, 200);
    });
    it("strokeRect", function() {
      image.strokeStyle = 'pink';
      image.strokeWidth = 4;
      image.strokeRect(25, 25, 200, 200);
    });
    it("fillCircle", function() {
      image.fillStyle = 'orange';
      image.fillCircle(125, 125, 75);
    });
    it("polyline", function() {
      image.strokeStyle = 'red';
      image.strokeWidth = 6;
      image.moveTo(50, 150);
      image.lineTo(50, 200);
      image.lineTo(200, 200);
      image.lineTo(200, 100);
      image.stroke();
    });
    it("line", function() {
      image.strokeStyle = 'blue';
      image.strokeWidth = 2;
      image.beginPath();
      image.moveTo(50, 50);
      image.lineTo(200, 200);
      image.stroke();
    });
    it("render", function() {
      var text = image.render();
      expect(text).toBeDefined();
      var lines = text.split(/\n\s*/);
      expect(lines.length).toBe(7);
      expect(lines[0]).toMatch(/^<svg/);
      expect(lines[6]).toMatch(/<\/svg>\s*$/);
    });
  });
  describe("text", function() {
    var image;
    it("construct", function() {
      image = new svg.Image(300, 200);
      expect(image).toBeDefined();
      expect(image.width).toBe(300);
      expect(image.height).toBe(200);
    });
    it("rect", function() {
      image.strokeRect(25, 25, 275, 150);
    });
    it("fillText", function() {
      image.fillStyle = 'orange';
      image.textAlign = 'left';
      image.fillText('top/left', 0, 15);
      image.fillStyle = 'blue';
      image.textAlign = 'right';
      image.fillText('top/right', 300, 15, 'end');
      image.fillStyle = 'green';
      image.textAlign = 'center';
      image.fillText('bottom/center', 150, 190, 'middle');
    });
    it("fillTextVert", function() {
      image.fillColor = 'red';
      image.fillTextVert('left vert', 15, 100, 'middle');
    });
    it("render", function() {
      var text = image.render();
      expect(text).toBeDefined();
      var lines = text.split(/\n\s*/);
      expect(lines.length).toBe(7);
      expect(lines[0]).toMatch(/^<svg/);
      expect(lines[6]).toMatch(/<\/svg>\s*$/);
    });
  });
});
