(function(global) {
  'use strict';

  var current;

  var load = function() {
    if (current == null)
      current = loadStorage('tcologin');
    if (current == null)
      current = { email: '' };
  };

  var save = function() {
    if (current == null || !current.email)
      removeStorage('tcologin');
    else
      saveStorage('tcologin', current);
  };

  var Account = Object.create(null, {
    email: {
      get: function() {
        load();
        return current.email || '';
      }
    },

    password: {
      get: function() {
        load();
        return current.password || '';
      }
    },

    isSetup: {
      value: function() {
        load();
        return (current != null &&
                current.email != null && current.email !== '' &&
                current.password != null && current.password !== '');
      }
    },

    set: {
      value: function(email, password, test) {
        if (email == null || email === '' || password == null || password === '') {
          if (test) {
            doAlert("Save Login", "Please enter your ThrustCurve.org email and password.");
          } else {
            current = null;
            save();
          }
        } else {
          if (test) {
            var request = '<getrockets-request>\n' +
                          '  <username>' + escapeHtml(email) + '</username>\n' +
                          '  <password>' + escapeHtml(password) + '</password>\n' +
                          '</getrockets-request>';
            $.ajax({
              type: 'POST',
              data: request,
              url: "http://www.thrustcurve.org/servlets/getrockets",
              dataType: 'text',
              success: function(data) {
                current = { email: email, password: password };
                save();
                doAlert('Save Login', 'Email and password verified.');
              },
              error: function(xhr, msg) {
                var error = parseResponseErrors(xhr);
                if (error == null)
                  error = "Unable to reach ThrustCurve.org.";
                doAlert('Save Login', error);
              }
            });
          } else {
            current = { email: email, password: password };
            save();
          }
        }
      }
    },

    reset: {
      value: function() {
        current = null;
        save();
      }
    }
  });
  Object.freeze(Account);

  global.Account = Account;
})(this);
