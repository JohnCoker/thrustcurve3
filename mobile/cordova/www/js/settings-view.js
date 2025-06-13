(function(global) {
  'use strict';

  var updateSwitch = function(input, value) {
    var sw = input.data("kendoMobileSwitch");
    if (sw)
      sw.check(value);
    else
      input.prop('checked', value);
  };

  var readSwitch = function(input) {
    var sw = input.data("kendoMobileSwitch");
    if (sw)
      return sw.check();
    else
      input.prop('checked');
  };

  var updateDetails = function(section, values) {
    section.find('input[type=checkbox]').each(function() {
      var input = $(this),
          name = input.attr('name');
      updateSwitch(input, values && values.indexOf(name) >= 0);
    });
  };

  var readDetails = function(section) {
    var selected = [];
    section.find('input[type=checkbox]').each(function() {
      var input = $(this);
      if (readSwitch(input))
        selected.push(input.attr('name'));
    });
    return selected;
  };

  var updateForm = function() {
    var form = $('#settings-view-form'),
        input;

    updateDetails(form.find('ul.motorDetails'), Options.motorDetails);
    updateDetails(form.find('ul.simDetails'), Options.simDetails);

    input = form.find("input[name=rotate]");
    updateSwitch(input, Options.rotatePrompts);
  };

  var initSettingsView = function(e) {
    var form = $('#settings-view-form'),
        item = form.find('.reset');
    item.click(settingsViewReset);

    form.find('input[type=checkbox]').each(function() {
      var input = $(this),
          label = input.closest('label');
      label.unbind().click('touchend', function(e) {
        if (e.target == this) {
          e.preventDefault();
          var sw = input.data("kendoMobileSwitch");
          sw.toggle();
          settingsViewChange();
        }
      });
    });
  };

  var showSettingsView = function(e) {
    app.onShow(e);

    updateForm();

    $('#settings-view-form .reset .checkmark').hide();
  };

  var hideSettingsView = function(e) {
  };

  var settingsViewChange = function(e) {
    var form = $('#settings-view-form'),
        input;

    $('#settings-view-form .reset .checkmark').hide();

    Options.motorDetails = readDetails(form.find('ul.motorDetails'));
    Options.simDetails = readDetails(form.find('ul.simDetails'));

    input = form.find("input[name=rotate]");
    Options.rotatePrompts = readSwitch(input);
  };

  var settingsViewReset = function(e) {
    Options.reset();
    updateForm();
    $('#settings-view-form .reset .checkmark').show();
  };

  global.initSettingsView = initSettingsView;
  global.showSettingsView = showSettingsView;
  global.hideSettingsView = hideSettingsView;
  global.settingsViewChange = settingsViewChange;
  global.settingsViewReset = settingsViewReset;
})(this);
