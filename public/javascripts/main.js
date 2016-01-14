function setupTable(selector) {
  $(document).ready(function() {
    $(selector).DataTable({
      lengthMenu: [
        [ 10, 20, 50, -1 ],
        [ '10', '20', '50', 'all' ]
      ],
      pageLength: $(window).height() > 900 ? 20 : 10
    });
  });
}
