(function(global) {
  'use strict';

  var Motors = {},
      MaxRecent = 100,
      savedCache = {},
      recentList = [],
      didReset = false;

  var getSaved = function(id) {
    var entry;

    id = toId(id);
    if (id == null)
      return null;

    entry = savedCache[id];
    if (entry == null) {
      entry = loadStorage('motor:' + id);
      if (entry != null)
        savedCache[id] = entry;
    }

    return entry;
  };

  Motors.isSaved = function(id) {
    return getSaved(id) != null;
  };

  Motors.getSaved = getSaved;

  var motorComparator = function(a, b) {
    if (a.totImpulse !== b.totImpulse)
      return a.totImpulse - b.totImpulse;
    return a.commonName.localeCompare(b.commonName);
  };

  Motors.allSaved = function() {
    var props, arr, i, entry;

    savedCache = {};
    props = Object.keys(window.localStorage);
    arr = [];
    for (i = 0; i < props.length; i++) {
      if (/^motor:/.test(props[i])) {
        entry = loadStorage(props[i]);
        if (typeof entry == 'object' && toId(entry.id) != null) {
          savedCache[entry.id] = entry;
          arr.push(entry);
        }
      }
    }
    if (arr.length > 1)
      arr.sort(motorComparator);

    return arr;
  };

  var updateSaved = function(entry) {
    var now = (new Date()).getTime(),
        key = 'motor:' + entry.id;

    entry.saved = now;
    savedCache[entry.id] = entry;
    saveStorage(key, entry);
  };

  Motors.addSaved = function(entry) {
    if (typeof entry != 'object' || toId(entry.id) == null)
      return false;

    updateSaved(entry);
    return true;
  };

  Motors.removeSaved = function(entry) {
    var id = toId(entry);
    if (id != null) {
      removeStorage('motor:' + id);
      delete savedCache[id];
    }
  };

  Motors.countRecent = function() {
    if (recentList == null)
      return 0;
    else
      return recentList.length;
  };

  Motors.getRecent = function(id) {
    if (recentList == null)
      recentList = [];

    if (id === undefined)
      return recentList;

    id = toId(id);
    for (var i = 0; i < recentList.length; i++) {
      if (recentList[i].id === id)
        return recentList[i];
    }
  };

  Motors.addRecent = function(list) {
    var i, id, j, n;

    if (recentList == null)
      recentList = [];

    if (list instanceof Array) {
      // already good
    } else if (typeof list == 'object' && typeof list.id == 'number') {
      list = [ list ];
    } else {
      return 0;
    }

    n = 0;
    for (i = 0; i < list.length && n < MaxRecent; i++) {
      if (typeof list[i] != 'object' || (id = toId(list[i].id)) == null)
        continue;

      for (j = 0; j < recentList.length; j++) {
        if (recentList[j].id === id) {
          recentList.splice(j, 1);
          break;
        }
      }

      recentList.splice(n, 0, list[i]);
      n++;
    }

    if (recentList.length > MaxRecent)
      recentList.splice(MaxRecent, recentList.length - MaxRecent);

    if (recentList.length > 1)
      recentList.sort(motorComparator);

    return n;
  };

  Motors.setRecent = function(list) {
    this.clearRecent();
    return this.addRecent(list);
  };

  Motors.clearRecent = function() {
    recentList = [];
  };

  Motors.get = function(id) {
    var entry;

    id = toId(id);
    if (id == null)
      return;

    entry = Motors.getRecent(id);
    if (entry != null)
      return entry;

    entry = Motors.getSaved(id);
    if (entry != null)
      return entry;
  };

  Motors.reset = function() {
    var props, i;
    props = Object.keys(window.localStorage);
    for (i = 0; i < props.length; i++) {
      if (/^motor:/.test(props[i]))
        removeStorage(props[i]);
    }
    savedCache = {};
    didReset = true;
    recentList = [];
  };

  var SearchParamMap = {
    mfr: 'manufacturer',
    desig: 'designation',
    commonName: 'common-name',
    name: 'common-name',
    impulseClass: 'impulse-class',
    "class": 'impulse-class',
    diam: 'diameter',
    certOrg: 'cert-org',
    cert: 'cert-org',
    maxResults: 'max-results',
    max: 'max-results'
  };
  Motors.SearchParamMap = SearchParamMap;
  Object.freeze(SearchParamMap);

  var parseSearchResults = function(text) {
    var xml,
        response = { results: [] },
        elt;

    // remove processing instructions
    text = text.replace(/^<?[^>]*>\s*/g, '');

    // parse XML now
    xml = $.parseXML(text);

    // get the total number of matches
    elt = $(xml).find('criteria > matches');
    if (elt.length == 1)
      response.matches = parseInt(elt.text());

    // search results
    $(xml).find('result').each(function() {
      var result = {},
          mfr;
      $(this).children().each(function(datum) {
        var name = $(this).prop('tagName'),
            dash, value;

        if (name == 'brand-name' || name == 'info-url' || name == 'cert-org')
          return;

        value = $(this).text();

        if (name == 'manufacturer-abbrev') {
          mfr = value;
          return;
        }
        if (name == 'manufacturer') {
          if (mfr == null)
            mfr = value;
          return;
        }

        if (name == 'motor-id') {
          name = 'id';
          value = parseInt(value);
        } else {
          if (/-g$/.test(name)) {
            // convert grams to MKS
            name = name.replace(/-g$/i, '');
            value = parseInt(value) / 1000;
          } else if (name == 'diameter' || name == 'length') {
            // convert millimeters to MKS
            value = parseFloat(value) / 1000;
          } else if (/-(N|Ns|s)$/i.test(name)) {
            // other units are MKS
            name = name.replace(/-[a-z]+$/i, '');
            value = parseFloat(value);
          } else if (name == 'data-files') {
            // parse integer values
            value = parseInt(value);
          }
          if ((dash = name.indexOf('-')) > 0)
            name = name.substring(0, dash) + name.substring(dash + 1, dash + 2).toUpperCase() + name.substring(dash + 2);
        }
        result[name] = value;
      });
      if (mfr)
        result.manufacturer = mfr;
      response.results.push(result);
    });

    return response;
  };

  Motors.search = function(params, callback) {
    var request, p, elt, v, n;

    if (params == null || typeof params != 'object') {
      console.error('search: no parameters object');
      return false;
    }
    if (typeof callback != 'function') {
      console.error('search: no callback function');
      return false;
    }

    request = '<search-request>' +
              '  <availability>available</availability>';
    n = 0;
    if (params != null && typeof params == 'object') {
      for (p in params) {
        if (!params.hasOwnProperty(p))
          continue;

        v = params[p];
        if (v == null)
          continue;
        v = $.trim(v);
        if (v === '')
          continue;

        elt = SearchParamMap[p];
        if (elt == null)
          elt = p;

        request += '\n  <' + elt + '>' + escapeHtml(v) + '</' + elt + '>';
        n++;
      }
    }
    if (n < 1) {
      console.error('search: no search parameters');
      return false;
    }
    request += '\n<data-fields>all</data-fields>';
    request += '\n<max-results>' + (n * 40) + '</max-results>';
    request += '\n</search-request>';

    $.ajax({
      type: 'POST',
      data: request,
      url: "http://www.thrustcurve.org/servlets/search",
      dataType: 'text',
      success: function(data) {
        console.debug(data);
        callback(parseSearchResults(data));
      },
      error: function(xhr, msg) {
        console.error('motor search failed' + (xhr ? ' status ' + xhr.status : ''));
        var title = 'Search Error',
            error = parseResponseErrors(xhr);
        if (error == null) {
          title = 'Network Error';
          error = "Unable to search motors on ThrustCurve.org.";
        }
        doAlert(title, error);
        if (window.analytics)
          window.analytics.trackException('motor search failed: ' + error, false);
      }
    });

    return true;
  };

  var parseDownloadResults = function(text) {
    var xml,
        response = { results: [] },
        elt;

    // remove processing instructions
    text = text.replace(/^<?[^>]*>\s*/g, '');

    // parse XML now
    xml = $.parseXML(text);

    // get the total number of files
    elt = $(xml).find('criteria > matches');
    if (elt.length == 1)
      response.matches = parseInt(elt.text());

    // search results
    $(xml).find('result').each(function() {
      var result = {},
          samples, value;

      value = $(this).find('simfile-id').text();
      if (value != null && value !== '')
        result.fileId = parseInt(value);

      value = $(this).find('format').text();
      if (value != null && value !== '')
        result.format = value;

      samples = [];
      $(this).find('samples sample').each(function() {
        samples.push({
          time: parseFloat($(this).children('time').text()),
          thrust: parseFloat($(this).children('thrust').text())
        });
      });
      result.samples = samples;

      response.results.push(result);
    });

    return response;
  };

  Motors.getData = function(id, callback, noError) {
    var entry, request;

    // make sure this is a valid entry
    if (id != null && typeof id == 'object') {
      entry = id;
    } else {
      entry = Motors.get(id);
      if (entry == null)
        return false;
    }

    // see if we already have the data
    if (entry.simfile != null && entry.simfile.samples.length > 0) {
      callback(entry);
      return true;
    }

    // load the data now
    delete entry.simfile;
    request = ('<download-request>' +
               '<motor-id>' + entry.id + '</motor-id>' +
               '<data>samples</data>' +
               '<max-results>1</max-results>' +
               '</download-request>');
    $.ajax({
      type: 'POST',
      data: request,
      url: "http://www.thrustcurve.org/servlets/download",
      dataType: 'text',
      success: function(data) {
        console.debug(data);
        var response = parseDownloadResults(data),
            result = response.results[0];
        if (result != null && result.samples.length > 0) {
          var saved = getSaved(entry.id);
          if (saved != null) {
            saved.simfile = result;
            updateSaved(saved);
          }

          entry.simfile = result;
          callback(entry);
        }
      },
      error: function(xhr, msg) {
        if (!noError) {
          console.error('data download failed' + (xhr ? ' status ' + xhr.status : ''));
          var title = 'Download Error',
              error = parseResponseErrors(xhr);
          if (error == null) {
            title = 'Network Error';
            error = "Unable to fetch motor data from ThrustCurve.org.";
          }
          doAlert(title, error);
          if (window.analytics)
            window.analytics.trackException('data download failed: ' + error, false);
        }
      }
    });

    return true;
  };

  Motors.MaxRecent = MaxRecent;

  Object.freeze(Motors);
  global.Motors = Motors;
})(this);
