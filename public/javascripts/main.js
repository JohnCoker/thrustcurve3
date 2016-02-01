/**
 * Set up dataTables behavior on a rendered HTML table.
 * @function
 * @param {string} selector CSS selector for table
 * @param {object} [options] optional config for DataTable plugin
 * @param {boolean} [option.expand] expand double number of displayed rows for tall browser
 */
function setupTable(selector, options) {
  $(document).ready(function() {
    if (!options) options = {};

    var table = $(selector),
        pageLength = (options.expand && $(window).height() > 900) ? 20 : 10,
        numRows = table.find('tbody tr').length;

    var opts = _.extend({
      lengthMenu: [
        [ 10, 20, 50, -1 ],
        [ '10', '20', '50', 'all' ]
      ],
      pageLength: pageLength,
      paging: numRows > pageLength,
      searching: numRows > pageLength
    }, options);

    table.DataTable(opts);
  });
}
