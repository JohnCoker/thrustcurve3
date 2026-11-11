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
 * Turn a drop zone into an upload of one rocket design file.
 * The document listeners run first so the browser does not open the dropped file.
 * @param {string} zone CSS selector for the drop target
 * @param {string} form CSS selector for the multipart form that posts the file
 */
function setupDesignDrop(zone, form) {
  var box = $(zone),
      upload = $(form);

  if (box.length !== 1 || upload.length !== 1)
    return;

  document.addEventListener('dragover', function(e) { e.preventDefault(); }, true);
  document.addEventListener('drop', function(e) { e.preventDefault(); }, true);

  $(document).ready(function() {
    var input = upload.find('input[type=file]'),
        sending = false,
        id;

    // The edit form shows the input as its first field, associated with this
    // upload form by the form attribute.
    if (input.length !== 1) {
      id = upload.attr('id');
      if (id)
        input = $('input[type=file][form="' + id + '"]');
    }
    if (input.length !== 1)
      return;

    function inside(target) {
      return target === box[0] || $.contains(box[0], target);
    }

    function sendForm() {
      if (sending)
        return;
      sending = true;
      upload[0].submit();
    }

    function submitFile(file) {
      var transfer;
      if (file == null)
        return;
      try {
        transfer = new DataTransfer();
        sending = true;
        transfer.items.add(file);
        input[0].files = transfer.files;
        upload[0].submit();
      } catch (err) {
        sending = false;
        window.alert('Choose the design file with the link instead.');
      }
    }

    $(document).on('dragenter dragover', function(e) {
      var dt = e.originalEvent && e.originalEvent.dataTransfer;
      e.preventDefault();
      box.toggleClass('dragover', inside(e.target));
      if (dt)
        dt.dropEffect = inside(e.target) ? 'copy' : 'none';
    });
    $(document).on('drop', function(e) {
      var dt = e.originalEvent && e.originalEvent.dataTransfer,
          files = dt && dt.files;
      e.preventDefault();
      box.removeClass('dragover');
      if (!inside(e.target) || files == null || sending)
        return;
      if (files.length !== 1) {
        window.alert('Drop a single design file.');
        return;
      }
      submitFile(files[0]);
    });
    input.on('change', function() {
      if (this.files && this.files.length === 1)
        sendForm();
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
