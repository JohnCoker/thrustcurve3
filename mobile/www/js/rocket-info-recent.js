(function(global) {
  'use strict';

  var wasRotated = false;

  var updateList = function(grid, items) {
    var prompt = grid.parent().find('.rotate-me'),
        columns, details;

    grid.empty();

    // always show the manufacturer and name
    columns = [
      {
        title: "Motor",
        field: "manufacturer",
        template: function(item) {
          var info = Metadata.manufacturers.get(item.manufacturer),
              name;
          if (info != null)
            name = info.abbrev;
          else
            name = item.manufacturer;
          name += ' ' + formatCommonName(item.commonName);
          return name;
        }
      },
      {
        title: "Altitude",
        field: "maxAltitude",
        template: function(item) {
          return formatFromMKS(item.maxAltitude, 'altitude');
        }
      }
    ];

    if (app.isLandscape()) {
      details = Options.simDetails;
      if (details.indexOf("maxVelocity") >= 0) {
        columns.push({
          title: "Velocity",
          field: "maxVelocity",
          template: function(item) {
            return formatFromMKS(item.maxVelocity, 'velocity');
          }
        });
      }
      if (details.indexOf("guideVelocity") >= 0) {
        columns.push({
          title: "Guide Vel",
          field: "guideVelocity",
          template: function(item) {
            return formatFromMKS(item.guideVelocity, 'velocity');
          }
        });
      }
      if (details.indexOf("maxAcceleration") >= 0) {
        columns.push({
          title: "Accleration",
          field: "maxAcceleration",
          template: function(item) {
            return formatFromMKS(item.maxAcceleration, 'acceleration');
          }
        });
      }
      if (details.indexOf("apogeeTime") >= 0) {
        columns.push({
          title: "T Apogee",
          field: "apogeeTime",
          template: function(item) {
            if (item.apogeeTime > 0)
              return item.apogeeTime.toFixed(1) + 's';
            else
              return '';
          }
        });
      }
      if (details.indexOf("optimalDelay") >= 0) {
        columns.push({
          title: "Delay",
          field: "optimalDelay",
          template: function(item) {
            if (item.optimalDelay > 0)
              return item.optimalDelay.toFixed() + 's';
            else
              return '';
          }
        });
      }

      wasRotated = true;
      prompt.hide();
    } else {
      if (!wasRotated)
        showPrompt(prompt);
    }

    grid.kendoGrid({
      selectable: "row",
      change: selectRow,
      columns: columns,
      dataSource: { data: items }
    });

    grid.show();
  };

  var selectRow = function(e) {
    var data = this.dataSource.view()[this.select().index()];
    if (data && data.motorId > 0)
      window.location = '#rocket-info-motor-details?motorId=' + data.motorId;
  };

  var initRocketInfoRecent = function(e) {
    var grid = $('#rocket-info-recent-grid');

    $(document).on("orientationChange", function() {
      var current = Rockets.current,
          items;

      if (current == null)
        items = null;
      else
        items = Guide.getSaved(current);

      if (grid.is(':visible') && items)
        updateList(grid, items);
    });
  };

  /* global showRocketInfoBase */
  var showRocketInfoRecent = function(e) {
    showRocketInfoBase(e);

    var placeholder = e.view.content.find('.placeholder'),
        grid = $('#rocket-info-recent-grid'),
        prompt = grid.parent().find('.rotate-me'),
	current = Rockets.current,
        items;

    grid.empty();
    if (current == null)
      items = null;
    else {
      items = Guide.getSaved(current);
    }

    if (items == null || items.length < 1) {
      placeholder.show();
      grid.hide();
      prompt.hide();
    } else {
      placeholder.hide();
      updateList(grid, items);
      grid.show();
    }
  };

  var hideRocketInfoRecent = function(e) {
  };

  global.initRocketInfoRecent = initRocketInfoRecent;
  global.showRocketInfoRecent = showRocketInfoRecent;
  global.hideRocketInfoRecent = hideRocketInfoRecent;
})(this);
