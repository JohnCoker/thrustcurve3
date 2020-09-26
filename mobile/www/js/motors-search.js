(function(global) {
  'use strict';

  var initMotorsSearch = function(e) {
    var form = $('#motors-search-form');

    var updateSelects = function() {
      setupSelect(form.find('select[name=mfr]'), Metadata.manufacturers);
      setupSelect(form.find('select[name=type]'), Metadata.types);
      setupSelect(form.find('select[name=class]'), Metadata.classes);
      setupSelect(form.find('select[name=diameter]'), Metadata.diameters);
      setupSelect(form.find('select[name=cert]'), Metadata.certOrgs);
    };
    updateSelects();
    $(document).on("metadataLoaded", updateSelects);

    // handle form submit explicitly
    setupListForm(form, submitMotorsSearch);
  };
  
  var showMotorsSearch = function(e) {
    app.onShow(e);

    Metadata.load(false);
  };
  
  var hideMotorsSearch = function(e) {
  };

  var submitMotorsSearch = function(e) {
    var form = $('#motors-search-form'),
        criteria = {};

    e.preventDefault();

    form.find('input').blur();

    if (!hasNetwork()) {
      doAlert("No Network", "Find previously marked motors in Favorites.");
      return;
    }

    ['mfr', 'name', 'type', 'class', 'diameter', 'cert'].forEach(function(param) {
      var input = form.find(':input[name=' + param + ']'),
          value = $.trim(input.val());
      if (value !== '')
        criteria[param] = value;
    });

    KendoApp.showLoading();
    if (!Motors.search(criteria, function(response) {
      KendoApp.hideLoading();
      if (response == null || response.matches < 1) {
        doAlert("Search Criteria", "No results matched your search; try relaxing some criteria.");
        return;
      }
      Motors.setRecent(response.results);
      if (response.matches > response.results.length)
        doAlert("Search Criteria", response.matches + " results matched your search; first " + response.results.length + " shown.");
      window.location = '#motors-recents';
    })) {
      KendoApp.hideLoading();
      doAlert("Search Criteria", "Narrow down your search by entering some search criteria.");
    }

    return false;
  };

  global.initMotorsSearch = initMotorsSearch;
  global.showMotorsSearch = showMotorsSearch;
  global.hideMotorsSearch = hideMotorsSearch;
  global.submitMotorsSearch = submitMotorsSearch;
})(this);
