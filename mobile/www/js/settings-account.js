(function(global) {
  'use strict';

  var initSettingsAccount = function(e) {
  };

  var showSettingsAccount = function(e) {
    app.onShow(e);

    var form = $('#settings-account-form'),
        input;

    input = form.find("input[name=email]");
    input.val(Account.email);

    input = form.find("input[name=password]");
    input.val('');
  };

  var hideSettingsAccount = function(e) {
  };

  var settingsAccountSave = function(e) {
    var form = $('#settings-account-form'),
        input, email, password;

    input = form.find("input[name=email]");
    email = $.trim(input.val());

    input = form.find("input[name=password]");
    password = $.trim(input.val());

    Account.set(email, password, hasNetwork());
  };

  global.initSettingsAccount = initSettingsAccount;
  global.showSettingsAccount = showSettingsAccount;
  global.hideSettingsAccount = hideSettingsAccount;
  global.settingsAccountSave = settingsAccountSave;
})(this);
