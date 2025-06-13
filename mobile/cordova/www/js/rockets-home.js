// Rockets #rockets-home
(function(global) {
  'use strict';

  var updateRocketsList = function() {
    var list = $('#rockets-list'),
        placeholder = list.closest('div[data-role=view]').find('.placeholder'),
        rockets = Rockets.list(),
        info, count, where, width, li, i;

    list.empty();
    if (rockets == null || rockets.length < 1) {
      placeholder.show();
      list.hide();
    } else {
      placeholder.hide();

      for (i = 0; i < rockets.length; i++) {
        info = rockets[i];
        count = Guide.countSaved(info);
        where = 'recent';
        if (!count || count < 1) {
          count = '&mdash;';
          where = 'guide';
        }
        li = $('<li data-id="' + info.clientId + '">' + escapeHtml(info.name) +
               '<a data-role="button" href="#rocket-info-' + where + '?id=' + info.clientId + '" class="good-motors">' + count + '</a>' +
               '</li>');
        list.append(li);
      }
  
      list.find('a.good-motors').kendoMobileButton();
      width = 0;
      list.find('a.good-motors').each(function() {
        var w = $(this).width();
        if (w > width)
          width = w;
      });
      if (width > 0)
        list.find('a.good-motors').css('width', (Math.ceil(width) + 20) + 'px');
  
      list.show();
    }
  };

  var initRocketsHome = function(e) {
  };
  
  var showRocketsHome = function(e) {
    app.onShow(e);

    var btn = e.view.footer.find('a.download');
    if (btn)
      btn.data("kendoMobileButton").enable(Account.isSetup());

    updateRocketsList();
  };

  var hideRocketsHome = function(e) {
  };
  
  var rocketsHomeSelect = function(e) {
    var id = e.item.data('id');
    if (id > 0)
      window.location = '#rocket-info-stats?id=' + id;
  };

  var rocketsHomeDownload = function(e) {
    Rockets.download(function(response) {
      var title = 'Download Rockets';
      if (response.loaded < 1) {
        doAlert(title, 'No rockets downloaded from ThrustCurve.org.');
      } else if (response.updated < 1) {
        doAlert(title, response.created + ' new rockets downloaded.');
      } else if (response.created < 1) {
        doAlert(title, response.updated + ' rockets re-downloaded.');
      } else {
        doAlert(title,
                response.created + ' new and ' +
                response.updated + ' rockets re-downloaded.');
      }
      updateRocketsList();
    });
  };
  
  var rocketsHomeSamples = function(e) {
    var samples = Rockets.samples(),
        i;

    for (i = 0; i < samples.length; i++)
      Rockets.add(samples[i]);

    $('#rockets-home').find('.placeholder').hide();
    updateRocketsList();
  };
  
  global.initRocketsHome = initRocketsHome;
  global.showRocketsHome = showRocketsHome;
  global.hideRocketsHome = hideRocketsHome;
  global.rocketsHomeSelect = rocketsHomeSelect;
  global.rocketsHomeDownload = rocketsHomeDownload;
  global.rocketsHomeSamples = rocketsHomeSamples;
})(this);
