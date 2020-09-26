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
        title: "Mfr",
        field: "manufacturer",
        template: function(item) {
          var info = Metadata.manufacturers.get(item.manufacturer);
          if (info != null)
            return info.abbrev;
          return item.manufacturer;
        }
      },
      {
        title: "Name",
        field: "commonName",
        template: function(item) {
          return formatCommonName(item.commonName);
        }
      },
      {
        title: "Diameter",
        field: "diameter",
        template: function(item) {
          return formatMMTFromMKS(item.diameter);
        }
      }
    ];

    if (app.isLandscape()) {
      details = Options.motorDetails;
      if (details.indexOf("length") >= 0) {
        columns.push({
          title: "Length",
          field: "length",
          template: function(item) {
            return formatFromMKS(item.length, 'length');
          }
        });
      }
      if (details.indexOf("type") >= 0) {
        columns.push({
          title: "Type",
          field: "type"
        });
      }
      if (details.indexOf("totImpulse") >= 0) {
        columns.push({
          title: "Impulse",
          field: "totImpulse",
          template: function(item) {
            return formatImpulseFromMKS(item.totImpulse);
          }
        });
      }
      if (details.indexOf("maxThrust") >= 0) {
        columns.push({
          title: "Max Thr",
          field: "maxThrust",
          template: function(item) {
            return formatFromMKS(item.maxThrust, 'force');
          }
        });
      }
      if (details.indexOf("burnTime") >= 0) {
        columns.push({
          title: "Burn",
          field: "burnTime",
          template: function(item) {
            return formatBurnTime(item.burnTime);
          }
        });
      }
      if (details.indexOf("propInfo") >= 0) {
        columns.push({
          title: "Propellan",
          field: "propInfo"
        });
      }
      if (details.indexOf("caseInfo") >= 0) {
        columns.push({
          title: "Case",
          field: "caseInfo"
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
    if (data && data.id > 0)
      window.location = '#motors-details?id=' + data.id;
  };

  var initMotorsFavorites = function(e) {
    $(document).on("orientationChange", function() {
      var grid = $('#motors-favorites-grid'),
          items = Motors.allSaved();

      if (grid.is(':visible'))
        updateList(grid, items);
    });
  };
  
  var showMotorsFavorites = function(e) {
    app.onShow(e);

    var placeholder = e.view.content.find('.placeholder'),
        grid = $('#motors-favorites-grid'),
        prompt = grid.parent().find('.rotate-me'),
        items = Motors.allSaved();

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

  var hideMotorsFavorites = function(e) {
  };

  var initMotorsRecent = function(e) {
    var grid = $('#motors-recents-grid');

    $(document).on("orientationChange", function() {
      var items = Motors.getRecent();

      if (grid.is(':visible'))
        updateList(grid, items);
    });
  };
  
  var showMotorsRecent = function(e) {
    app.onShow(e);

    var placeholder = e.view.content.find('.placeholder'),
        grid = $('#motors-recents-grid'),
        prompt = grid.parent().find('.rotate-me'),
        items = Motors.getRecent();

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

  var hideMotorsRecent = function(e) {
  };

  var motorsRecentClear = function(e) {
    var placeholder = e.view.content.find('.placeholder'),
        grid = $('#motors-recents-grid');

    Motors.clearRecent();

    placeholder.show();
    grid.hide();
  };

  global.initMotorsFavorites = initMotorsFavorites;
  global.showMotorsFavorites = showMotorsFavorites;
  global.hideMotorsFavorites = hideMotorsFavorites;

  global.initMotorsRecent = initMotorsRecent;
  global.showMotorsRecent = showMotorsRecent;
  global.hideMotorsRecent = hideMotorsRecent;
  global.motorsRecentClear = motorsRecentClear;
})(this);
