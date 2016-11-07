const xmlparser = require("xml-parser"),
      svg = require("..");

function oneLine(image) {
  var text = image.render(),
      lines = text.split(/\n */);
  expect(lines.length).toBe(3);
  return xmlparser(lines[1]).root;
}

describe("svg", function() {
  describe("module", function() {
    it("format", function() {
      expect(svg.format).toBe('image/svg+xml');
    });
    it("Image", function() {
      expect(typeof svg.Image).toBe('function');
    });
  });
  describe("stroke", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.strokeStyle = 'orange';
      image.lineWidth = 3;
      image.moveTo(10, 5);
      image.lineTo(90, 95);
      image.stroke();
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('polyline');
      expect(xml.attributes.points).toBe('10,5 90,95');
      expect(xml.attributes.stroke).toBe('orange');
      expect(xml.attributes['stroke-width']).toBe('3');
      expect(xml.attributes.fill).toBe('none');
      expect(xml.children.length).toBe(0);
    });
  });
  describe("fill", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.fillStyle = 'lime';
      image.moveTo(10, 5);
      image.lineTo(90, 95);
      image.lineTo(10, 95);
      image.closePath();
      image.fill();
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('polyline');
      expect(xml.attributes.points).toBe('10,5 90,95 10,95 10,5');
      expect(xml.attributes.fill).toBe('lime');
      expect(xml.attributes.stroke).toBe('none');
      expect(xml.children.length).toBe(0);
    });
  });
  describe("strokeRect", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.strokeStyle = 'pink';
      image.lineWidth = 2;
      image.strokeRect(10, 5, 80, 90);
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('rect');
      expect(xml.attributes.x).toBe('10');
      expect(xml.attributes.width).toBe('80');
      expect(xml.attributes.height).toBe('90');
      expect(xml.attributes.stroke).toBe('pink');
      expect(xml.attributes['stroke-width']).toBe('2');
      expect(xml.attributes.fill).toBe('none');
      expect(xml.children.length).toBe(0);
    });
  });
  describe("fillRect", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.fillStyle = 'blue';
      image.fillRect(10, 5, 80, 90);
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('rect');
      expect(xml.attributes.x).toBe('10');
      expect(xml.attributes.y).toBe('5');
      expect(xml.attributes.width).toBe('80');
      expect(xml.attributes.height).toBe('90');
      expect(xml.attributes.fill).toBe('blue');
      expect(xml.attributes.stroke).toBe('none');
      expect(xml.children.length).toBe(0);
    });
  });
  describe("strokeCircle", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.strokeStyle = 'green';
      image.lineWidth = 5;
      image.strokeCircle(50, 55, 40);
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('circle');
      expect(xml.attributes.cx).toBe('50');
      expect(xml.attributes.cy).toBe('55');
      expect(xml.attributes.r).toBe('40');
      expect(xml.attributes.stroke).toBe('green');
      expect(xml.attributes['stroke-width']).toBe('5');
      expect(xml.attributes.fill).toBe('none');
      expect(xml.children.length).toBe(0);
    });
  });
  describe("strokeCircle title", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.strokeStyle = 'green';
      image.lineWidth = 5;
      image.strokeCircle(50, 55, 40, 'hello, world');
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('circle');
      expect(xml.attributes.cx).toBe('50');
      expect(xml.attributes.cy).toBe('55');
      expect(xml.attributes.r).toBe('40');
      expect(xml.attributes.stroke).toBe('green');
      expect(xml.attributes['stroke-width']).toBe('5');
      expect(xml.attributes.fill).toBe('none');
      expect(xml.children.length).toBe(1);
      expect(xml.children[0].name).toBe('title');
      expect(xml.children[0].content).toBe('hello, world');
    });
  });
  describe("fillCircle", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.fillStyle = 'green';
      image.fillCircle(50, 55, 40);
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('circle');
      expect(xml.attributes.cx).toBe('50');
      expect(xml.attributes.cy).toBe('55');
      expect(xml.attributes.r).toBe('40');
      expect(xml.attributes.fill).toBe('green');
      expect(xml.attributes.stroke).toBe('none');
      expect(xml.children.length).toBe(0);
    });
  });
  describe("fillCircle title", function() {
    var image = new svg.Image(100, 100);
    it("draw", function() {
      image.fillStyle = 'green';
      image.fillCircle(50, 55, 40, 'hello, world');
    });
    it("validate", function() {
      var xml = oneLine(image);
      expect(xml.name).toBe('circle');
      expect(xml.attributes.cx).toBe('50');
      expect(xml.attributes.cy).toBe('55');
      expect(xml.attributes.r).toBe('40');
      expect(xml.attributes.fill).toBe('green');
      expect(xml.attributes.stroke).toBe('none');
      expect(xml.children.length).toBe(1);
      expect(xml.children[0].name).toBe('title');
      expect(xml.children[0].content).toBe('hello, world');
    });
  });
  describe("fillText", function() {
    describe("default", function() {
      var image = new svg.Image(100, 100);
      it("draw", function() {
	expect(image.font).toBe('10pt Helvetica');
	image.fillText('hello world', 10, 20);
      });
      it("validate", function() {
	var xml = oneLine(image);
	expect(xml.name).toBe('text');
	expect(xml.attributes.x).toBe('10');
	expect(xml.attributes.y).toBe('20');
	expect(xml.attributes.fill).toBe('black');
	expect(xml.attributes['font-style']).toBeUndefined();
	expect(xml.attributes['font-weight']).toBeUndefined();
	expect(xml.attributes['font-size']).toBe('10pt');
	expect(xml.attributes['font-family']).toBe('Helvetica');
	expect(xml.children.length).toBe(0);
	expect(xml.content).toBe('hello world');
      });
    });
    describe("gray italic right", function() {
      var image = new svg.Image(100, 100);
      it("draw", function() {
	image.font = 'italic 12px Arial';
	expect(image.font).toBe('italic 12px Arial');
	image.textAlign = 'right';
	image.fillStyle = 'gray';
	image.fillText('hello world', 10, 20);
      });
      it("validate", function() {
	var xml = oneLine(image);
	expect(xml.name).toBe('text');
	expect(xml.attributes.x).toBe('10');
	expect(xml.attributes.y).toBe('20');
	expect(xml.attributes.fill).toBe('gray');
	expect(xml.attributes['text-anchor']).toBe('end');
	expect(xml.attributes['font-style']).toBe('italic');
	expect(xml.attributes['font-weight']).toBeUndefined();
	expect(xml.attributes['font-size']).toBe('12px');
	expect(xml.attributes['font-family']).toBe('Arial');
	expect(xml.children.length).toBe(0);
	expect(xml.content).toBe('hello world');
      });
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
      var xml = xmlparser(text).root;
      expect(xml.name).toBe('svg');
      expect(xml.attributes.width).toBe('250');
      expect(xml.attributes.height).toBe('250');
      expect(xml.attributes.viewBox).toBe('0 0 250 250');
      expect(xml.children.length).toBe(5);
      expect(xml.children[0].name).toBe('rect');
      expect(xml.children[1].name).toBe('rect');
      expect(xml.children[2].name).toBe('circle');
      expect(xml.children[3].name).toBe('polyline');
      expect(xml.children[4].name).toBe('polyline');
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
      var xml = xmlparser(text).root;
      expect(xml.name).toBe('svg');
      expect(xml.attributes.width).toBe('300');
      expect(xml.attributes.height).toBe('200');
      expect(xml.attributes.viewBox).toBe('0 0 300 200');
      expect(xml.children.length).toBe(5);
      expect(xml.children[0].name).toBe('rect');
      for (var i = 1; i < xml.children.length; i++)
	expect(xml.children[i].name).toBe('text');
    });
  });
  describe("group simple", function() {
    var image;
    it("construct", function() {
      image = new svg.Image(300, 200);
      expect(image).toBeDefined();
      expect(image.width).toBe(300);
      expect(image.height).toBe(200);
    });
    it("beginG", function() {
      image.beginG('g1', 'group one');
    });
    it("rects", function() {
      image.strokeRect(25, 25, 275, 150);
      image.fillRect(100, 100, 200, 100);
    });
    it("endG", function() {
      image.endG();
    });
    it("render", function() {
      var text = image.render();
      expect(text).toBeDefined();
      var xml = xmlparser(text).root;
      expect(xml.name).toBe('svg');
      expect(xml.attributes.width).toBe('300');
      expect(xml.attributes.height).toBe('200');
      expect(xml.attributes.viewBox).toBe('0 0 300 200');
      expect(xml.children.length).toBe(1);
      var child = xml.children[0];
      expect(child.name).toBe('g');
      expect(child.attributes.id).toBe('g1');
      expect(child.attributes.title).toBe('group one');
      expect(child.children.length).toBe(2);
      expect(child.children[0].name).toBe('rect');
      expect(child.children[1].name).toBe('rect');
    });
  });
  describe("group complete", function() {
    var image;
    it("construct", function() {
      image = new svg.Image(300, 200);
      expect(image).toBeDefined();
      expect(image.width).toBe(300);
      expect(image.height).toBe(200);
    });
    it("beginG", function() {
      image.beginG({
	id: 'g2',
	title: 'group two',
	class: 'grpcls',
	style: 'color: blue'
      });
    });
    it("rects", function() {
      image.strokeRect(25, 25, 275, 150);
      image.fillRect(100, 100, 200, 100);
    });
    it("endG", function() {
      image.endG();
    });
    it("render", function() {
      var text = image.render();
      expect(text).toBeDefined();
      var xml = xmlparser(text).root;
      expect(xml.name).toBe('svg');
      expect(xml.attributes.width).toBe('300');
      expect(xml.attributes.height).toBe('200');
      expect(xml.attributes.viewBox).toBe('0 0 300 200');
      expect(xml.children.length).toBe(1);
      var child = xml.children[0];
      expect(child.name).toBe('g');
      expect(child.attributes.id).toBe('g2');
      expect(child.attributes.title).toBe('group two');
      expect(child.attributes.class).toBe('grpcls');
      expect(child.attributes.style).toBe('color: blue');
      expect(child.children.length).toBe(2);
      expect(child.children[0].name).toBe('rect');
      expect(child.children[1].name).toBe('rect');
    });
  });
});
