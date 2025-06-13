(function(global) {
  'use strict';

  var parseMetadata = function(text) {
    var xml,
        data = {},
        list, lastValue;

    // remove processing instructions
    text = text.replace(/^<?[^>]*>\s*/g, '');

    // parse XML now
    xml = $.parseXML(text);

    // manufacturers
    list = [];
    $(xml).find('manufacturer').each(function(e) {
      var abbrev = $(this).attr('abbrev');
      list.push({
        value: abbrev,
        abbrev: abbrev,
        label: $.trim($(this).text())
      });
    });
    data.manufacturers = list;

    // certification organizations
    list = [];
    $(xml).find('cert-org').each(function(e) {
      var abbrev = $(this).attr('abbrev');
      list.push({
        value: abbrev,
        abbrev: abbrev,
        label: $.trim($(this).text())
      });
    });
    data.certOrgs = list;

    // motor types
    list = [];
    $(xml).find('type').each(function(e) {
      var value = $(this).text();
      list.push({
        value: value,
        abbrev: value,
        label: value == 'SU' ? 'single-use' : value
      });
    });
    data.types = list;

    // motor diameters (de-duping)
    list = [];
    lastValue = 0;
    $(xml).find('diameter').each(function(e) {
      var diam = $.trim($(this).text()),
          parsed = parseInt(diam);
      if (!isNaN(parsed)) {
        if (parsed === lastValue || parsed == lastValue + 1)
          return;
        lastValue = parsed;
      }

      list.push({
        value: diam,
        abbrev: diam,
        label: diam
      });
    });
    data.diameters = list;

    // impulse classes
    list = [];
    $(xml).find('impulse-class').each(function(e) {
      var cls = $(this).text();
      list.push({
        value: cls,
        abbrev: cls,
        label: cls
      });
    });
    data.classes = list;

    return data;
  };

  var load = function(noError) {
    var data = loadStorage("metadata"),
        reload = false;

    if (data != null) {
      // already have the data in local storage
      setup(data);
      console.debug('metadata cached');

      // see if this data is stale
      reload = (new Date()).getTime() - data.loadTime > 24 * 60 * 60 * 1000;
      noError = true;
    } else {
      // no data yet; reload it
      reload = true;
    }

    if (data == null || (reload && hasNetwork())) {
      $.ajax({
        type: 'POST',
        data: '<metadata-request><availability>available</availability></metadata-request>',
        url: "http://www.thrustcurve.org/servlets/metadata",
        dataType: 'text',
        success: function(data) {
          data = parseMetadata(data);
          data.loadTime = (new Date()).getTime();
          data.loadFrom = 'server';
          setup(data);
          console.debug('metadata loaded from server');
        },
        error: function(xhr, msg) {
          if (!noError) {
            console.error('metadata loading failed' + (xhr ? ' status ' + xhr.status : ''));
            var title = 'Metadata Error',
                error = parseResponseErrors(xhr);
            if (error == null) {
              title = 'Network Error';
              error = "Unable to load basic search criteria from ThrustCurve.org.";
            }
            doAlert(title, error);
            if (window.analytics)
              window.analytics.trackException('metadata loading failed: ' + error, false);
          }
        }
      });
    }
  };

  var setup = function(data) {
    saveStorage("metadata", data);
  
    Object.keys(data).forEach(function(prop) {
      var set = data[prop],
          i;
  
      if (!(set instanceof Array))
        return;
      if (set.length < 3)
        console.error('Metadata.' + prop + ' has only ' + set.length + ' entries');
  
      for (i = 0; i < set.length; i++)
        Object.freeze(set[i]);
  
      set.get = function(value) {
        var i, o;
  
        if (value == null || value === '')
          return;
  
        // first check for value match
        for (i = 0; i < set.length; i++) {
          o = set[i];
          if (o.value === value)
            return o;
        }
  
        // then check for label/abbreviation match
        for (i = 0; i < set.length; i++) {
          o = set[i];
          if (o.label === value || o.abbrev === value)
            return o;
        }
      };
      Object.freeze(set);
    });

    data.load = function() {};
    Object.freeze(data);

    global.Metadata = data;
    $.event.trigger({
      type: 'metadataLoaded'
    });
  };

  // stub version
  global.Metadata = {
    load: load,
    manufacturers: [],
    certOrgs: [],
    types: [],
    diameters: [],
    classes: []
  };
  Object.keys(global.Metadata).forEach(function(prop) {
    var set = global.Metadata[prop];

    if (!(set instanceof Array))
      return;
    global.Metadata.get = function(value) { };
  });
  Object.freeze(global.Metadata);
})(this);
