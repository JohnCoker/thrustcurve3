/* global UnitDefaults */
(function(global) {
  'use strict';

  var updating = false;

  var initSettingsUnits = function(e) {
    var form = $('#settings-units-form'),
        preset = form.find("select[name=preset]");
  
    // initialize presets select
    setupSelect(preset, null, true);
    preset.append('<option value="">custom</option>');
    UnitDefaults.forEach(function(set) {
      preset.append('<option value="' + escapeAttr(set.label) + '">' + escapeHtml(set.description) + '</option>');
    });
    preset.change(function(e) {
      var set = UnitDefaults.get(preset.val());
      if (set != null)
        Units.setDefaults(set);
    });
  
    // initialize individual unit type selects
    Units.types.forEach(function(type) {
      var choices = Units[type],
          select = form.find('select[name=' + type + ']');
      setupSelect(select, null, true);
      choices.forEach(function(choice) {
        select.append('<option value="' + choice.label + '">' + escapeHtml(choice.description) + ' (' + choice.label + ')</option>');
      });
      select.change(function(e) {
        var set = Units.getDefaults();
        if (typeof set.copy == 'function')
          set = set.copy();
  
        set.label = 'custom';
        set.defaults = false;
        delete set.description;
        set[type] = select.val();
        Units.setDefaults(set);
  
        if (preset.val() != 'custom')
          preset.val('custom');
      });
    });
  
    // handle change to default units
    var updateUnits = function() {
      var set = Units.getDefaults();
  
      if (set.label != null && UnitDefaults.get(set.label) != null)
        preset.val(set.label);
      else
        preset.val('');
  
      updating = true;
  
      Units.types.forEach(function(type) {
        var select = form.find('select[name=' + type + ']');
        select.val(set[type]);
      });
  
      updating = false;
    };
    updateUnits();
    $(document).on("unitsChanged", updateUnits);
  };

  var showSettingsUnits = function(e) {
    app.onShow(e);

    var form = $('#settings-units-form'),
        set = Units.getDefaults();

    updating = true;

    Units.types.forEach(function(type) {
      var select = form.find('select[name=' + type + ']');
      select.val(set[type]);
    });
  
    updating = false;
  };

  var hideSettingsUnits = function(e) {
  };

  global.initSettingsUnits = initSettingsUnits;
  global.showSettingsUnits = showSettingsUnits;
  global.hideSettingsUnits = hideSettingsUnits;
})(this);
