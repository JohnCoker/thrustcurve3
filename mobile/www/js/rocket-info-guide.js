(function(global) {
  'use strict';

  var refreshGuideForm = function() {
    var form = $('#rocket-info-guide-form'),
	current = Rockets.current,
        input, value;

    if (current == null) {
      form.find('input[name=name]').val('');
      form.find('input[name=mmt]').val('');
      form.find('input[name=weight]').val('');
    } else {
      input = form.find('input[name=name]');
      input.val(current.name);

      input = form.find('input[name=mmt]');
      value = formatMMTFromMKS(current.mmtDiam) + ' × ' + formatFromMKS(current.mmtLen, 'length');
      input.val(value);

      input = form.find('input[name=weight]');
      input.val(formatFromMKS(current.weight, 'mass'));

      input = form.find('input[name=guide]');
      value = current.guideLen;
      setInputDimension(input, value, 'length');
    }
  };

  var initRocketInfoGuide = function(e) {
    var form = $('#rocket-info-guide-form');

    var updateSelects = function() {
      setupSelect(form.find('select[name=mfr]'), Metadata.manufacturers);
      setupSelect(form.find('select[name=type]'), Metadata.types);
      setupSelect(form.find('select[name=class]'), Metadata.classes);
    };
    updateSelects();
    $(document).on("metadataLoaded", updateSelects);
  
    var updateUnits = function() {
      setupUnits(form.find('input[name=guide]'), 'length');
    };
    updateUnits();
    $(document).on("unitsChanged", updateUnits);

    // handle form submit explicitly
    setupListForm(form, submitRocketInfoGuide);
  };

  /* global showRocketInfoBase */
  var showRocketInfoGuide = function(e) {
    app.onShow(e);

    showRocketInfoBase(e);

    refreshGuideForm();
  };

  var hideRocketInfoGuide = function(e) {
  };

  var submitRocketInfoGuide = function(e) {
    var form = $('#rocket-info-guide-form'),
        current = Rockets.current,
        criteria, guideLen;

    e.preventDefault();

    if (!hasNetwork()) {
      doAlert("No Network", "Previous guide runs are in Good Motors.");
      return false;
    }

    // apply guide length change
    guideLen = getInputDimension(form.find('input[name=guide]'), 'length');
    if (guideLen > 0 && guideLen != current.guideLen) {
      current.guideLen = guideLen;
      Rockets.update(current);
    }

    // collect motor criteria
    criteria = {
      "max-results": "100"
    };
    ['mfr', 'type', 'class'].forEach(function(param) {
      var input = form.find(':input[name=' + param + ']'),
          value = $.trim(input.val());
      if (value !== '')
        criteria[param] = value;
    });

    KendoApp.showLoading();
    if (!Guide.run(current, undefined, criteria, function(response) {
      var i, added;

      KendoApp.hideLoading();
      if (response == null || response.matches < 1 || response.results == null) {
        doAlert("Motor Guide", "No motors that fit your rocket matched the criteria.");
        return;
      }
      added = 0;
      if (response.okCount > 0) {
        Guide.clearSaved(current);
        for (i = 0; i < response.results.length; i++) {
          if (response.results[i].status == 'ok') {
            Guide.addSaved(current, response.results[i]);
            added++;
          }
        }
      }
      if (added < 1) {
        doAlert("Motor Guide", "No motors work (out of " + response.matches + " matches).");
      } else if (added < response.okCount) {
        doAlert("Motor Guide", response.okCount + " motors work (out of " + response.matches + " matches); first " + added + " shown.");
      } else {
        doAlert("Motor Guide", response.okCount + " motors work (out of " + response.matches + " matches).");
      }
      window.location = '#rocket-info-recent';

    })) {
      KendoApp.hideLoading();
      doAlert("Motor Guide", "Complete the specification of your rocket.");
    }

    return false;
  };

  global.initRocketInfoGuide = initRocketInfoGuide;
  global.showRocketInfoGuide = showRocketInfoGuide;
  global.hideRocketInfoGuide = hideRocketInfoGuide;
  global.submitRocketInfoGuide = submitRocketInfoGuide;
})(this);
