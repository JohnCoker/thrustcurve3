(function(global) {
  'use strict';

  var initSettingsAbout = function(e) {
  };

  var showSettingsAbout = function(e) {
    app.onShow(e);

  };

  var hideSettingsAbout = function(e) {
  };

  var settingsAboutWebsite = function(e) {
    window.open("http://www.thrustcurve.org/mobile.shtml", "_system", "location=yes");
  };

  global.initSettingsAbout = initSettingsAbout;
  global.showSettingsAbout = showSettingsAbout;
  global.hideSettingsAbout = hideSettingsAbout;
  global.settingsAboutWebsite = settingsAboutWebsite;
})(this);
