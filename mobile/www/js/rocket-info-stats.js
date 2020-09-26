(function(global) {
  'use strict';

  var refreshStatsForm = function() {
    var form = $('#rocket-info-stats-form'),
	current = Rockets.current,
        input, value;

    if (current == null)
      return;

    input = form.find('input[name=name]');
    input.val(current.name);

    input = form.find('input[name=body]');
    setInputDimension(input, current.bodyDiam, 'length');

    input = form.find('input[name=weight]');
    setInputDimension(input, current.weight, 'mass');

    input = form.find('select[name=mmtdiam]');
    value = convertMMTFromMKS(current.mmtDiam);
    input.val('' + value);

    input = form.find('input[name=mmtlen]');
    setInputDimension(input, current.mmtLen, 'length');

    input = form.find('input[name=cd]');
    setInputNumber(input, current.cd);

    input = form.find('input[name=guide]');
    value = current.guideLen;
    setInputDimension(input, value, 'length');
  };

  var isDifferent = function(a, b) {
    if ((a == null || isNaN(a)) && (b == null || isNaN(b)))
      return false;
    if ((a == null || isNaN(a)) || (b == null || isNaN(b)))
      return true;
    return Math.abs(a - b) >= 0.00001;
  };

  var applyStatsChanges = function(callback) {
    var form = $('#rocket-info-stats-form'),
	current = Rockets.current,
        changed = false,
        previous, input, value, updated;

    if (current == null)
      return false;
    previous = current;

    input = form.find('input[name=name]');
    value = $.trim(input.val());
    if (value !== '' && value != current.name) {
      current.name = value;
      changed = true;
    }

    input = form.find('input[name=body]');
    value = getInputDimension(input, 'length');
    if (value != null && isDifferent(value, current.bodyDiam)) {
      current.bodyDiam = value;
      changed = true;
    }

    input = form.find('input[name=weight]');
    value = getInputDimension(input, 'mass');
    if (value != null && isDifferent(value, current.weight)) {
      current.weight = value;
      changed = true;
    }

    input = form.find('select[name=mmtdiam]');
    value = getInputNumber(input);
    if (value != null) {
      value = value / 1000;
      if (isDifferent(value, current.mmtDiam)) {
        current.mmtDiam = value;
        changed = true;
      }
    }

    input = form.find('input[name=mmtlen]');
    value = getInputDimension(input, 'length');
    if (value != null && isDifferent(value, current.mmtLen)) {
      current.mmtLen = value;
      changed = true;
    }

    input = form.find('input[name=cd]');
    value = getInputNumber(input);
    if (value != null && isDifferent(value, current.cd)) {
      current.cd = value;
      changed = true;
    }

    input = form.find('input[name=guide]');
    value = getInputDimension(input, 'length');
    if (value != null && isDifferent(value, current.guideLen)) {
      current.guideLen = value;
      changed = true;
    }

    if (changed) {
      if (typeof current.clientId == 'number')
        updated = Rockets.update(current);
      else
        updated = Rockets.add(current);
      if (updated == null)
        doAlert("Save Error", "Unable to save changes to rocket.");
      else
        Rockets.current = current = updated;
      refreshStatsForm();
    }

    if (typeof callback == 'function') {
      callback({
        previous: previous,
        current: current,
        changed: changed
      });
    }

    return changed;
  };

  var initRocketInfoStats = function(e) {
    var form = $("#rocket-info-stats-form");
    var updateSelects = function() {
      setupSelect(form.find("select[name=mmtdiam]"), Metadata.diameters, true);
    };
    updateSelects();
    $(document).on("metadataLoaded", updateSelects);

    var updateUnits = function() {
      setupUnits(form.find("input[name=body]"), 'length');
      setupUnits(form.find("input[name=weight]"), 'mass');
      setupUnits(form.find("input[name=mmtlen]"), 'length');
      setupUnits(form.find("input[name=guide]"), 'length');
    };
    updateUnits();
    $(document).on("unitsChanged", updateUnits);

    // handle form submit explicitly
    setupListForm(form, submitRocketInfoStats);
  };

  var showRocketInfoBase = function(e) {
    app.onShow(e);

    var id = e.view.params.id,
        rocket;

    if (id) {
      // edit a specific rocket
      rocket = Rockets.get(id);
      Rockets.current = rocket;
    } else if (e.view.params.add) {
      // add a new rocket
      rocket = Rockets.defaults();
      Rockets.current = rocket;
    } else {
      // switch views for same rocket
      rocket = Rockets.current;
    }
    if (rocket == null) {
      Rockets.current = null;
      doAlert("Missing Entry", "This rocket no longer exists.");
    }
  };

  var showRocketInfoStats = function(e) {
    app.onShow(e);

    showRocketInfoBase(e);

    refreshStatsForm();
  };

  var hideRocketInfoStats = function(e) {
    applyStatsChanges();
  };

  var submitRocketInfoStats = function(e) {
    e.preventDefault();

    applyStatsChanges(function(state) {
      if (state.changed) {
        if (state.previous && state.previous.clientId)
          doAlert('Rocket Info', 'Changes saved.');
        else
          doAlert('Rocket Info', 'New rocket saved.');
      } else
        doAlert('Rocket Info', 'No changes to save.');
    });
    return false;
  };

  var rocketInfoDelete = function(e) {
    var current = Rockets.current;
    if (current && current.clientId) {
      doConfirm("Delete Rocket", "Are you sure you want to delete this rocket?",
                function() {
                  Rockets.current = null;
                  Rockets.remove(current);
                  window.location = '#rockets-home';
                });
    } else {
      Rockets.current = null;
      window.location = '#rockets-home';
    }
  };

  var recalcCD = function() {
    var form = $('#rocket-info-stats-cdcalc-form'),
        input, complexity, surface, cd;

    input = form.find('select[name=complexity]');
    complexity = parseFloat($.trim(input.val()));
    if (isNaN(complexity) || complexity <= 0)
      complexity = 1;

    input = form.find('select[name=surface]');
    surface = parseFloat($.trim(input.val()));
    if (isNaN(surface) || surface <= 0)
      surface = 1;

    cd = 0.3 * complexity * surface;
    if (cd < 0.1)
      cd = 0.1;
    input = form.find('input[name=cd]');
    input.val(cd.toFixed(2));
  };

  var initRocketInfoCDCalc = function(e) {
    var form = $('#rocket-info-stats-cdcalc-form');
    form.find('select').change(recalcCD);

    // handle form submit explicitly
    setupListForm(form, rocketInfoCDCalcOK);
  };

  var showRocketInfoCDCalc = function(e) {
    app.onShow(e);

    showRocketInfoBase(e);

    var form = $('#rocket-info-stats-cdcalc-form');

    form[0].reset();
    recalcCD();
  };

  var hideRocketInfoCDCalc = function(e) {
  };

  var rocketInfoCDCalcOK = function(e) {
    var input, cd;

    input = $('#rocket-info-stats-cdcalc-form input[name=cd]');
    cd = getInputNumber(input);
    if (cd != null && cd > 0) {
      input = $('#rocket-info-stats-form input[name=cd]');
      setInputNumber(input, cd);
    }

    $("#rocket-info-stats-cdcalc").data("kendoMobilePopOver").close();
  };

  global.initRocketInfoStats = initRocketInfoStats;
  global.showRocketInfoBase = showRocketInfoBase;
  global.showRocketInfoStats = showRocketInfoStats;
  global.hideRocketInfoStats = hideRocketInfoStats;
  global.rocketInfoDelete = rocketInfoDelete;

  global.initRocketInfoCDCalc = initRocketInfoCDCalc;
  global.showRocketInfoCDCalc = showRocketInfoCDCalc;
  global.hideRocketInfoCDCalc = hideRocketInfoCDCalc;
  global.rocketInfoCDCalcOK = rocketInfoCDCalcOK;
})(this);
