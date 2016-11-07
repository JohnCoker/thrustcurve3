/**
 * Set up dataTables behavior on a rendered HTML table.
 * @function
 * @param {string} selector CSS selector for table
 * @param {object} [options] optional config for DataTable plugin
 * @param {boolean} [options.expand] double number of displayed rows for tall browser
 */
function setupTable(selector, options) {
  $(document).ready(function() {
    if (!options) options = {};

    var table = $(selector),
        pageLength = (options.expand && $(window).height() > 900) ? 20 : 10,
        numRows = table.find('tbody tr').length,
        gadgets = numRows > pageLength;

    var opts = _.extend({
      columnDefs: [{targets: 'no-sort', orderable: false}],

      lengthMenu: [
        [ 10, 20, 50, -1 ],
        [ '10', '20', '50', 'all' ]
      ],
      pageLength: pageLength,

      searching: gadgets,
      info: gadgets,
      paging: gadgets,
    }, options);

    table.DataTable(opts);
  });
}

/**
 * Load the targeted img tags that point to SVG images and replace the image
 * tag with the contents inline if possible.
 * @param {string} selector CSS selector for table
 * @param {function} [loaded] called with the SVG root element after inlining
 * @see https://snippetlib.com/jquery/replace_all_svg_images_with_inline_svg
 */
function inlineSVG(selector, loaded) {
  $(document).ready(function() {
    $(selector).each(function() {
      var img = $(this),
	  imgID = img.attr('id'),
	  imgClass = img.attr('class'),
	  imgURL = img.attr('src');

      $.get(imgURL, function(data) {
	// get the SVG root element
	var svg = $(data).find('svg');
	if (svg.length > 0) {
	  if (typeof imgID == 'string')
	    svg = svg.attr('id', imgID);
	  if (typeof imgClass == 'string')
	    svg = svg.attr('class', imgClass + ' replaced-svg');

	  img.replaceWith(svg);

	  if (loaded)
	    loaded(svg);
	}
      });
    });
  });
}
