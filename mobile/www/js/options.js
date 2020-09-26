(function(global) {
  'use strict';

  var current;

  var defaults = {
    motorDetails: [
      "type",
      "totImpulse",
      "burnTime"
    ],
    simDetails: [
      "maxVelocity",
      "optimalDelay"
    ],
    rotatePrompts: true,
    promptDuration: 5
  };
  Object.freeze(defaults);
  Object.freeze(defaults.motorDetails);
  Object.freeze(defaults.simDetails);
  
  var load = function() {
    if (current == null)
      current = loadStorage('options');
    if (current == null || Object.keys(current).length < 1)
      reset();
  };

  var save = function() {
    if (current == null || Object.keys(current).length < 1)
      removeStorage('options');
    else
      saveStorage('options', current);
  };

  var reset = function() {
    current = {};
    for (var p in defaults) {
      if (defaults.hasOwnProperty(p))
        current[p] = defaults[p];
    }
  };

  var Options = Object.create(null, {
    motorDetails: {
      get: function() {
        load();
        return current.motorDetails || defaults.motorDetails;
      },
      set: function(value) {
        if (value == null || !(value instanceof Array))
          value = [];
        current.motorDetails = value;
        save();
      },
      enumerable: true
    },

    simDetails: {
      get: function() {
        load();
        return current.simDetails || defaults.simDetails;
      },
      set: function(value) {
        if (value == null || !(value instanceof Array))
          value = [];
        current.simDetails = value;
        save();
      },
      enumerable: true
    },

    rotatePrompts: {
      get: function() {
        load();
        return current.rotatePrompts;
      },
      set: function(value) {
        if (typeof value != 'boolean')
          value = !!value;
        current.rotatePrompts = value;
        save();
      },
      enumerable: true
    },

    promptDuration: {
      get: function() {
        load();
        return current.promptDuration;
      },
      set: function(value) {
        if (typeof value != 'number' || value < 1)
          value = defaults.promptDuration;
        current.promptDuration = value;
        save();
      },
      enumerable: true
    },

    reset: {
      value: function() {
        current = null;
        save();
        reset();
      }
    }
  });
  Object.freeze(Options);

  global.Options = Options;
})(this);
