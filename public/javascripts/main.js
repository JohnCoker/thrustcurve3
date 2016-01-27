/**
 * Set up dataTables behavior on a rendered HTML table.
 * @function
 * @param {string} selector jQuery selector for table
 * @param {boolean} [expand] expand double number of displayed rows for tall browser
 * @param {object} [order] initial sort order columns and directions
 */
function setupTable(selector) {
  var expand = false,
      order = [],
      i;

  if (arguments.length > 1) {
    for (i = 1; i < arguments.length; i++) {
      if (typeof arguments[i] == 'boolean')
        expand = arguments[i];
      else if (Array.isArray(arguments[i]))
        order = arguments[i];
    }
  }

  $(document).ready(function() {
    var table = $(selector),
        opts;

    opts = {
      lengthMenu: [
        [ 10, 20, 50, -1 ],
        [ '10', '20', '50', 'all' ]
      ],
      pageLength: 10,
      order: order
    };
    if (expand && $(window).height() > 900)
      opts.pageLength = 20;
    if (table.find('tbody tr').length <= opts.pageLength) {
      opts.paging = false;
      opts.searching = false;
    }
    table.DataTable(opts);
  });
}
