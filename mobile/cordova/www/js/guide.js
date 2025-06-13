(function(global) {
  'use strict';

  var Guide = {},
      cache,
      recent,
      didReset = false;

  var load = function(id) {
    var entry;

    id = toId(id, 'clientId');
    if (id == null)
      return null;

    if (cache == null)
      cache = {};

    entry = cache[id];
    if (entry == null) {
      entry = loadStorage('guide:' + id);
      if (entry == null || typeof entry != 'object' || entry.results == null) {
        entry = { id: id, results: [] };
      }
      cache[id] = entry;
    }

    return entry;
  };

  var save = function(entry) {
    var now = (new Date()).getTime(),
        key = 'guide:' + entry.id;

    if (entry.results == null || entry.results.length < 1) {
      removeStorage(key);
    } else {
      if (entry.created == null)
        entry.created = now;
      entry.updated = now;
      saveStorage(key, entry);
    }
  };

  Guide.getSaved = function(id) {
    var entry = load(id);

    if (entry == null)
      return;
    else
      return entry.results;
  };

  Guide.countSaved = function(id) {
    var entry = load(id);

    if (entry == null)
      return 0;
    else
      return entry.results.length;
  };

  Guide.addSaved = function(id, result) {
    var entry = load(id),
        rocketId, i;

    // make sure result is valid
    if (result == null || typeof result.motorId != 'number' ||
        isNaN(result.motorId) || result.motorId <= 0)
      return false;

    // create entry if necessary
    if (entry == null) {
      rocketId = toId(id, 'clientId');
      if (rocketId == null)
        return false;
      entry = { id: rocketId, results: [] };
    }

    // remove old result
    for (i = 0; i < entry.results.length; i++) {
      if (entry.results[i].motorId === result.motorId) {
        entry.results.splice(i, 1);
        break;
      }
    }

    // add new result
    entry.results.push(result);
    save(entry);
    return true;
  };

  Guide.removeSaved = function(id, result) {
    var entry = load(id),
        i;

    if (entry == null)
      return false;

    if (result == null || !result.motorId)
      return false;

    for (i = 0; i < entry.results.length; i++) {
      if (entry.results[i].motorId === result.motorId) {
        entry.results.splice(i, 1);
        save(entry);
        return true;
      }
    }

    return false;
  };

  Guide.clearSaved = function(id) {
    id = toId(id, 'clientId');
    if (id != null) {
      removeStorage('guide:' + id);
      if (cache)
        delete cache[id];
    }
  };

  Guide.clearCache = function() {
    cache = undefined;
  };

  Guide.getRecent = function(id) {
    var entry;

    id = toId(id, 'clientId');
    if (id == null)
      return;

    if (recent)
      entry = recent[id];
    if (entry)
      return entry.results;
    else
      return [];
  };

  Guide.addRecent = function(id, results) {
    var entry, result, i, j, n;

    id = toId(id, 'clientId');
    if (id == null)
      return false;
    if (results == null || results.length < 1)
      return false;

    if (recent)
      entry = recent[id];
    if (entry == null)
      entry = { id: id, results: [] };

    n = 0;
    for (i = 0; i < results.length; i++) {
      result = results[i];
      if (result == null || typeof result.motorId != 'number' ||
          isNaN(result.motorId) || result.motorId <= 0)
        continue;

      // remove prior result
      for (j = 0; j < entry.results.length; j++) {
        if (entry.results[j].motorId === result.motorId) {
          entry.results.splice(j, 1);
          break;
        }
      }

      // insert new result in relative position
      entry.results.splice(n, 0, result);
      n++;
    }
    if (n < 1)
      return false;

    if (recent == null)
      recent = {};
    recent[id] = entry;

    return true;
  };

  Guide.clearRecent = function() {
    recent = undefined;
  };

  Guide.reset = function() {
    var props, i;
    props = Object.keys(window.localStorage);
    for (i = 0; i < props.length; i++) {
      if (/^guide:/.test(props[i]))
        removeStorage(props[i]);
    }
    cache = undefined;
    recent = undefined;
    didReset = true;
  };

  var parseGuideResults = function(text) {
    var xml,
        response = { results: [] },
        elt, attr;

    // remove processing instructions
    text = text.replace(/^<?[^>]*>\s*/g, '');

    // parse XML now
    xml = $.parseXML(text);

    // get the total number of matches
    elt = $(xml).find('criteria > matches');
    if (elt.length == 1)
      response.matches = parseInt(elt.text());

    // get the number of ok and failed motors
    elt = $(xml).find('results');
    attr = parseInt(elt.attr('ok-count'));
    if (attr > 0)
      response.okCount = attr;
    attr = parseInt(elt.attr('failed-count'));
    if (attr > 0)
      response.failedCount = attr;

    // search results
    $(xml).find('result').each(function() {
      var result = {},
          mfr;
      $(this).children().each(function(datum) {
        var name = $(this).prop('tagName'),
            dash, value;

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

        if (/^-?[0-9][0-9.]*$/.test(value))
          value = parseFloat(value);

        while ((dash = name.indexOf('-')) > 0)
          name = name.substring(0, dash) + name.substring(dash + 1, dash + 2).toUpperCase() + name.substring(dash + 2);
        result[name] = value;
      });
      if (mfr)
        result.manufacturer = mfr;
      response.results.push(result);
    });

    return response;
  };

  Guide.run = function(rocket, useInfo, params, callback) {
    var request, p, elt, v;

    if (rocket == null || typeof rocket != 'object') {
      console.error('guide: no rocket object');
      return false;
    }
    if (typeof callback != 'function') {
      console.error('guide: no callback function');
      return false;
    }

    if (useInfo == null)
      useInfo = {};
    if (!isPositive(useInfo.bodyDiam))
      useInfo.bodyDiam = rocket.bodyDiam;
    if (!isPositive(useInfo.mmtDiam))
      useInfo.mmtDiam = rocket.mmtDiam;
    if (!isPositive(useInfo.mmtLen))
      useInfo.mmtLen = rocket.mmtLen;
    if (!isPositive(useInfo.weight))
      useInfo.weight = rocket.weight;
    if (!isPositive(useInfo.cd))
      useInfo.cd = rocket.cd;
    if (!isPositive(useInfo.guideLen))
      useInfo.guideLen = rocket.guideLen;
    if (!isPositive(useInfo.bodyDiam) ||
        !isPositive(useInfo.mmtDiam) ||
        !isPositive(useInfo.mmtLen) ||
        !isPositive(useInfo.weight) ||
        !isPositive(useInfo.cd) ||
        !isPositive(useInfo.guideLen))
      return false;

    request = '<motorguide-request>';

    request += '\n  <rocket>';
    if (rocket.name)
      request += '\n    <name>' + escapeHtml(rocket.name) + '</name>';
    request += '\n    <body-diameter-m>' + useInfo.bodyDiam + '</body-diameter-m>';
    request += '\n    <mmt-diameter-mm>' + useInfo.mmtDiam * 1000 + '</mmt-diameter-mm>';
    request += '\n    <mmt-length-mm>' + useInfo.mmtLen * 1000 + '</mmt-length-mm>';
    request += '\n    <weight-kg>' + useInfo.weight + '</weight-kg>';
    request += '\n    <cd>' + useInfo.cd + '</cd>';
    request += '\n    <guide-length-m>' + useInfo.guideLen + '</guide-length-m>';
    request += '\n  </rocket>';

    request += '\n  <availability>available</availability>';
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

        elt = Motors.SearchParamMap[p];
        if (elt == null)
          elt = p;

        request += '\n  <' + elt + '>' + escapeHtml(v) + '</' + elt + '>';
      }
    }
    request += '\n</motorguide-request>';

    $.ajax({
      type: 'POST',
      data: request,
      url: "http://www.thrustcurve.org/servlets/motorguide",
      dataType: 'text',
      success: function(data) {
        console.debug(data);
        callback(parseGuideResults(data));
      },
      error: function(xhr, msg) {
        console.error('motor guide failed' + (xhr ? ' status ' + xhr.status : ''));
        var title = 'Guide Error',
            error = parseResponseErrors(xhr);
        if (error == null) {
          title = 'Network Error';
          error = "Unable to run motor guide on ThrustCurve.org.";
        }
        doAlert(title, error);
        if (window.analytics)
          window.analytics.trackException('motor guide failed: ' + error, false);
      }
    });

    return true;
  };

  Object.freeze(Guide);
  global.Guide = Guide;
})(this);
