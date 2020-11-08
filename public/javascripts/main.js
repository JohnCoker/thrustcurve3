/**
 * Return user preferences stored in the global state.
 */
function prefs() {
  return window.$tcprefs || {};
}

/**
 * Set up dataTables behavior on a rendered HTML table.
 * @function
 * @param {string} selector CSS selector for table
 * @param {object} [options] optional config for DataTable plugin
 * @param {boolean} [options.expand] double number of displayed rows for tall browser
 * @param {function} [next] function called after table is set up
 */
function setupTable(selector, options, next) {
  $(document).ready(function() {
    if (!options) options = {};
    var table = $(selector),
        pageLength = (options.expand && $(window).height() > 900) ? 20 : 10,
        numRows = table.find('tbody tr').length,
        gadgets = options.bPaginate === false ? false : numRows > pageLength,
        dt;

    if (typeof prefs().tablePageLen === 'number')
      pageLength = prefs().tablePageLen;

    var opts = _.extend({
      columnDefs: [{targets: 'no-sort', orderable: false}],

      bPaginate: true,
      lengthMenu: [
        [ 10, 20, 50, -1 ],
        [ '10', '20', '50', 'all' ]
      ],
      pageLength: pageLength,

      searching: gadgets,
      info: gadgets,
      paging: gadgets,
    }, options);

    dt = table.DataTable(opts);

    if (next)
      next(dt);

    if (options.bPaginate == null || options.bPaginate === true) {
      let priorLen = pageLength;
      window.onbeforeprint = e => {
        if (dt.page.len() > 0)
          priorLen = dt.page.len();
        dt.page.len(-1).draw('page');
      };
      window.onafterprint = e => {
        dt.page.len(priorLen).draw('page');
      };
    }
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

/**
 * Set up gadgets related to viewing a thrust curve SVG image in a page.
 * Mostly this includes a way to change the units, but also some cosmetics.
 */
function thrustCurve(div) {
  $(document).ready(function() {
    const img = div.find('img');
    const origUrl = img.attr('src');
    let toolbar = $('<div class="btn-toolbar pull-right" role="toolbar" aria-label="force units">' +
                    '<div class="btn-group btn-group-sm" role="group">' +
                    '<button type="button" class="btn btn-default" title="Newtons">N</button>' +
                    '<button type="button" class="btn btn-default" title="pounds force">lbf</button>' +
                    '</div></div>');
    toolbar.css({ 'margin-top': '-1em' });
    toolbar.find('button').on('click', function(e) {
      e.preventDefault();
      img.attr('src', origUrl + '?unit=' + this.innerText);
    });
    div.append(toolbar);
  });
}
