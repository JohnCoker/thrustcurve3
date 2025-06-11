(function(global) {
  'use strict';

  var Rockets = {},
      cache,
      didReset = false,
      current;

  var load = function() {
    var i, r;

    if (cache == null)
      cache = loadStorage('rockets');
    if (cache == null || typeof cache != 'object' || cache.rockets == null) {
      // initialize empty
      cache = { rockets: [], nextId: 1 };
    }

    if (typeof cache.nextId != 'number' || isNaN(cache.nextId) || cache.nextId < 1)
      cache.nextId = 1;
    for (i = 0; i < cache.rockets.length; i++) {
      r = cache.rockets[i];
      if (r.clientId >= cache.nextId)
        cache.nextId = r.clientId + 1;
    }
  };

  var save = function() {
    if (cache != null)
      saveStorage('rockets', cache);
  };

  var TextProperties = [
    'name'
  ];
  var NumericProperties = [
    'bodyDiam',
    'weight',
    'mmtDiam',
    'mmtLen',
    'cd',
    'guideLen'
  ];
  var DataProperties = TextProperties.concat(NumericProperties);
  var IdProperties = [
    'clientId',
    'serverId'
  ];
  var AllProperties = DataProperties.concat(IdProperties);

  var clone = function(orig) {
    var copy = {},
        i, p, v;

    if (orig != null && typeof orig == 'object') {
      for (i = 0; i < AllProperties.length; i++) {
        p = AllProperties[i];
        if (orig.hasOwnProperty(p)) {
          v = orig[p];
          if (v != null)
            copy[p] = v;
        }
      }
    }

    return copy;
  };

  Rockets.defaults = function() {
    var units = Units.getDefaults(),
        init = {};

    switch (units.mass) {
    case 'kg':
    case 'lb':
      init.mmtDiam = 0.038;
      if (units.length == 'in') {
        init.bodyDiam = 0.1016; // 4in
        init.mmtLen = 0.3048;   // 12in
        init.guideLen = 1.8288; // 6ft
      } else {
        init.bodyDiam = 0.10;
        init.mmtLen = 0.300;
        init.guideLen = 2.0;
      }
      break;

    case 'g':
    case 'oz':
      /* falls through */
    default:
      init.mmtDiam = 0.018;
      if (units.length == 'in') {
        init.bodyDiam = 0.0254; // 1in
        init.mmtLen = 0.0762;   // 3in
        init.guideLen = 0.9144; // 3ft
      } else {
        init.bodyDiam = 0.025;
        init.mmtLen = 0.075;
        init.guideLen = 1.0;
      }
      break;
    }

    init.cd = 0.7;

    return init;
  };

  Rockets.get = function(id) {
    var i, r;

    load();

    id = toId(id, 'clientId');
    if (id == null)
      return;

    for (i = 0; i < cache.rockets.length; i++) {
      r = cache.rockets[i];
      if (r.clientId === id)
        return clone(r);
    }
  };

  Rockets.list = function() {
    var arr = [],
        i;

    load();

    for (i = 0; i < cache.rockets.length; i++)
      arr.push(clone(cache.rockets[i]));

    return arr;
  };

  Rockets.add = function(info) {
    var copy;

    load();

    copy = clone(info);
    copy.clientId = cache.nextId++;
    delete copy.serverId;

    if (copy.name == null || copy.name === '')
      copy.name = 'Unnamed';

    cache.rockets.push(copy);
    save();

    return clone(copy);
  };

  Rockets.update = function(info) {
    var saved,
        i, p, v, r;

    if (info == null || typeof info != 'object')
      return null;

    load();

    for (i = 0; i < cache.rockets.length; i++) {
      r = cache.rockets[i];
      if (r.clientId === info.clientId) {
        saved = r;
        break;
      }
    }
    if (saved == null)
      return null;

    if (info.name != null && info.name !== '')
      saved.name = info.name;

    for (i = 0; i < NumericProperties.length; i++) {
      p = NumericProperties[i];
      if (info.hasOwnProperty(p)) {
        v = info[p];
        if (typeof v == 'number' && !isNaN(v) && v > 0)
          saved[p] = v;
      }
    }

    save();

    return clone(saved);
  };

  Rockets.remove = function(id) {
    var i, r;

    load();

    id = toId(id, 'clientId');
    if (id == null)
      return false;

    for (i = 0; i < cache.rockets.length; i++) {
      r = cache.rockets[i];
      if (r.clientId === id) {
        cache.rockets.splice(i, 1);
        save();
        return true;
      }
    }
    if (current != null && current.clientId == id)
      current = null;

    Guide.clearSaved(id);

    return false;
  };

  Rockets.reset = function() {
    removeStorage('rockets');
    cache = undefined;
    didReset = true;
  };

  Rockets.samples = function() {
    return [
      {
        name: 'Estes Alpha III',
        bodyDiam: 0.025,
        weight: 0.034,
        mmtDiam: 0.018,
        mmtLen: 0.075,
        cd: 0.45,
        guideLen: 0.9144
      },
      {
        name: 'Aerotech Mustang',
        bodyDiam: 0.047,
        weight: 0.310,
        mmtDiam: 0.029,
        mmtLen: 0.203,
        cd: 0.55,
        guideLen: 1.8288
      },
      {
        name: 'Loc/Precision LOC-IV',
        bodyDiam: 0.102,
        weight: 0.822,
        mmtDiam: 0.038,
        mmtLen: 0.4065,
        cd: 0.55,
        guideLen: 1.8288
      },
    ];
  };

  function parseDownloadResults(text) {
    var xml,
        response = { results: [] },
        elt, n;

    // remove processing instructions
    text = text.replace(/^<?[^>]*>\s*/g, '');

    // parse XML now
    xml = $.parseXML(text);

    $(xml).find('rocket').each(function() {
      var result = {};

      elt = $(this).find('id');
      if (elt.length > 0)
        result.id = elt.first().text();

      elt = $(this).find('name');
      if (elt.length > 0)
        result.name = elt.first().text();

      elt = $(this).find('body-diameter-m');
      if (elt.length > 0 && (n = parseFloat(elt.first().text())) > 0)
        result.bodyDiam = n;

      elt = $(this).find('weight-kg');
      if (elt.length > 0 && (n = parseFloat(elt.first().text())) > 0)
        result.weight = n;

      elt = $(this).find('mmt-diameter-mm');
      if (elt.length > 0 && (n = parseFloat(elt.first().text())) > 0)
        result.mmtDiam = n / 1000;

      elt = $(this).find('mmt-length-mm');
      if (elt.length > 0 && (n = parseFloat(elt.first().text())) > 0)
        result.mmtLen = n / 1000;

      elt = $(this).find('cd');
      if (elt.length > 0 && (n = parseFloat(elt.first().text())) > 0)
        result.cd = n;

      elt = $(this).find('guide-length-m');
      if (elt.length > 0 && (n = parseFloat(elt.first().text())) > 0)
        result.guideLen = n;

      if (result.id == null || result.id === '')
        return;

      response.results.push(result);
    });

    return response;
  }

  function mergeDownloadResults(response) {
    load();

    response.loaded = 0;
    response.unchanged = 0;
    response.created = 0;
    response.updated = 0;
    for (let i = 0; i < response.results.length; i++) {
      const server = response.results[i];
      response.loaded++;

      let client = cache.rockets.find(r => r.serverId == server.id);
      if (client != null) {
        // update existing rocket
        let changed = false;
        for (let j = 0; j < DataProperties.length; j++) {
          const p = DataProperties[j];
          if (server.hasOwnProperty(p) && server[p] !== client[p]) {
            client[p] = server[p];
            changed = true;
          }
        }
        if (changed)
          response.updated++;
        else
          response.unchanged++;
      } else {
        // downloaded for first time
        client = clone(server);
        client.clientId = cache.nextId++;
        client.serverId = server.id;
        cache.rockets.push(client);
        response.created++;
      }
    }

    save();
  }

  function parseUploadResults(text) {
    const response = { results: [] };

    // remove processing instructions
    text = text.replace(/^<?[^>]*>\s*/g, '');

    // parse XML now
    const xml = $.parseXML(text);

    $(xml).find('result').each(function() {
      let result = {};

      let elt = $(this).find('id');
      if (elt.length > 0)
        result.id = elt.first().text();

      elt = $(this).find('client-id');
      if (elt.length > 0)
        result.clientId = parseInt(elt.first().text());

      elt = $(this).find('name');
      if (elt.length > 0)
        result.name = elt.first().text();

      elt = $(this).find('status');
      if (elt.length > 0)
        result.status = elt.first().text();

      if (result.id == null || result.id === '')
        return;

      response.results.push(result);
    });

    return response;
  }

  function mergeUploadResults(response) {
    load();

    response.created = 0;
    response.updated = 0;
    response.unchanged = 0;
    response.invalid = 0;
    response.results.forEach(server => {
      let client = cache.rockets.find(r => r.serverId == server.id);
      if (client == null) {
        client = cache.rockets.find(r => r.clientId === server.clientId);
        if (client != null)
          client.serverId = server.id;
      }
      switch (server.status) {
      case 'created':
        response.created++;
        break;
      case 'updated':
        response.updated++;
        break;
      case 'unchanged':
        response.unchanged++;
        break;
      default:
        response.invalid++;
        break;
      }
    });

    save();
  }

  const BASE_URL = 'https://www.thrustcurve.org/api/v1/';

  Rockets.download = function(callback) {
    if (!checkSetup())
      return;

    var request = '<getrockets-request>\n' +
                  '  <username>' + escapeHtml(Account.email) + '</username>\n' +
                  '  <password>' + escapeHtml(Account.password) + '</password>\n' +
                  '</getrockets-request>';
    $.ajax({
      type: 'POST',
      data: request,
      url: BASE_URL + 'getrockets.xml',
      dataType: 'text',
      success: function(data) {
        console.debug(data);
        var response = parseDownloadResults(data);
        mergeDownloadResults(response);
        if (callback)
          callback(response);
      },
      error: function(xhr, msg) {
        console.error('rocket download failed' + (xhr ? ' status ' + xhr.status : ''));
        var title = 'Download Error',
            error = parseResponseErrors(xhr);
        if (error == null)
          error = "Unable to download rockets from ThrustCurve.org.";
        doAlert(title, error);
        if (window.analytics)
          window.analytics.trackException('rocket download failed: ' + error, false);
      }
    });
  };

  Rockets.synchronize = function(callback) {
    if (!checkSetup())
      return;

    let saved = 0;
    function download() {
      Rockets.download(function(response) {
        response.uploaded = saved;
        response.downloaded = response.created + response.updated;
        if (callback)
          callback(response);
      });
    }

    const client = Rockets.list();
    if (client.length > 0) {
      // save any changes we made locally
      var request = '<saverockets-request>\n' +
                    '  <username>' + escapeHtml(Account.email) + '</username>\n' +
                    '  <password>' + escapeHtml(Account.password) + '</password>\n' +
                    '  <rockets>\n';
      client.forEach(r => {
        request += '    <rocket>\n';
        if (r.serverId)
          request += '      <id>' + escapeHtml(r.serverId) + '</id>\n';
        if (r.clientId > 0)
          request += '      <client-id>' + r.clientId + '</client-id>\n';
        if (r.name)
          request += '      <name>' + escapeHtml(r.name) + '</name>\n';
        if (r.bodyDiam > 0)
          request += '      <body-diameter-m>' + r.bodyDiam + '</body-diameter-m>\n';
        if (r.weight > 0)
          request += '      <weight-kg>' + r.weight + '</weight-kg>\n';
        if (r.mmtDiam > 0)
          request += '      <mmt-diameter-mm>' + (r.mmtDiam * 1000) + '</mmt-diameter-mm>\n';
        if (r.mmtLen > 0)
          request += '      <mmt-length-mm>' + (r.mmtLen * 1000) + '</mmt-length-mm>\n';
        if (r.cd > 0)
          request += '      <cd>' + r.cd + '</cd>\n';
        if (r.guideLen > 0)
          request += '      <guide-length-m>' + r.guideLen + '</guide-length-m>\n';
        request += '    </rocket>\n';
      });
      request += '  </rockets>\n' +
                 '</saverockets-request>';
      $.ajax({
        type: 'POST',
        data: request,
        url: BASE_URL + 'saverockets.xml',
        dataType: 'text',
        success: function(data) {
          console.debug(data);
          var response = parseUploadResults(data);
          mergeUploadResults(response);
          response.results.forEach(r => {
            if (r.status == 'created' || r.status == 'updated')
              saved++;
          });
          // now re-download to merge changes
          download();
        },
        error: function(xhr, msg) {
          console.error('rocket upload failed' + (xhr ? ' status ' + xhr.status : ''));
          var title = 'Upload Error',
              error = parseResponseErrors(xhr);
          if (error == null)
            error = "Unable to upload rockets to ThrustCurve.org.";
          doAlert(title, error);
          if (window.analytics)
            window.analytics.trackException('rocket upload failed: ' + error, false);
        }
      });
    } else {
      // just download
      download();
    }
  }

  function checkSetup() {
    if (!Account.isSetup()) {
      doAlert('Synchronize Rockets', 'Please enter your ThrustCurve.org account in Settings.');
      return false;
    }
    return true;
  }

  Object.defineProperty(Rockets, 'current', {
    get: function() { return current; },
    set: function(v) { current = v; }
  });

  Object.freeze(Rockets);

  global.Rockets = Rockets;
})(this);
