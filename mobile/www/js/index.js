/* exported app */
var app;
(function() {
  var lastOrientation, isReady = false;

  app = {
    getOrientation: function() {
      if (typeof window.orientation == 'number')
        return window.orientation;
      else if ($(window).height() < $(window).width())
        return 90;
      else
        return 0;
    },

    isLandscape: function() {
      var orientation = this.getOrientation();
      return orientation === 90 || orientation === -90;
    },

    isPortrait: function() {
      var orientation = this.getOrientation();
      return orientation === 0 || orientation === 180;
    },

    isReady: function() {
      return isReady;
    },

    initialize: function() {
      document.addEventListener('deviceready', this.onDeviceReady, false);

      window.onerror = this.onError;
      window.addEventListener("orientationchange", this.onOrientationChange);
      window.addEventListener("resize", this.onOrientationChange, true);
    },

    onDeviceReady: function() {
      isReady = true;

      if (navigator.splashscreen)
        navigator.splashscreen.hide();

      if (typeof screen.unlockOrientation == 'function')
        screen.unlockOrientation();

      lastOrientation = app.getOrientation();

      if (window.analytics)
        window.analytics.startTrackerWithId('UA-751016-3');

      // hack to avoid bug with missing decimal point in keyboard on Android 4.x
      if (window.device && window.device.platform == 'Android' && /^4\./.test(window.device.version)) {
        $('input[type=number]').each(function() {
          $(this).attr('type', 'text');
          $(this).addClass('number');
        });
      }

      app.receivedEvent('deviceready');
    },

    onOrientationChange: function() {
      var curOrientation = app.getOrientation();
      if (curOrientation != lastOrientation) {
        setTimeout(function() {
          $.event.trigger({
            type: 'orientationChange'
          });
        }, 400);
        lastOrientation = curOrientation;
      }
    },

    onShow: function(e) {
      if (window.analytics && isReady && e)
        window.analytics.trackView(e.view.title);
    },

    onError: function(error, url, line) {
      console.error(error);

      var msg = error;
      if (/\/[a-z_]*\.js/.test(url) && line > 0) {
        var file = url.replace(/^([^\/]*\/)+/g, '');
        file = file.replace(/#.*$/, '');
        msg += "\n" + file + ", line " + line;
      }

      if (window.analytics && isReady) {
        try {
          window.analytics.trackException(msg, false);
        } catch (e) {
        }
      }

      if (typeof doAlert == 'function')
        doAlert('JavaScript Error', msg);
    },

    receivedEvent: function(id) {
      var parentElement = document.getElementById(id);
      if (parentElement) {
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');
  
        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');
      }

      console.debug('Received Event: ' + id);
    }
  };
})();
