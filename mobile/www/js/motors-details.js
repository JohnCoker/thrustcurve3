(function(global) {
  'use strict';

  var wasRotated = false,
      motor;

  var updateDetailsList = function(e) {
    var list = $('#motors-details-list'),
        prompt = list.closest('.km-view').find('.rotate-me'),
        input, value;

    list.find('input').val('');
    if (motor == null)
      return;

    input = list.find('input[name=mfr]');
    value = Metadata.manufacturers.get(motor.manufacturer);
    if (value == null)
      value = motor.manufacturer;
    else
      value = value.label;
    input.val(value);

    input = list.find('input[name=desig]');
    input.val(motor.designation);

    input = list.find('input[name=name]');
    input.val(formatCommonName(motor.commonName));

    input = list.find('input[name=size]');
    value = formatMMTFromMKS(motor.diameter);
    if (motor.length > 0)
      value += ' × ' + formatFromMKS(motor.length, 'length');
    input.val(value);

    input = list.find('input[name=impulse]');
    value = formatImpulseFromMKS(motor.totImpulse) + ', ' + formatClassPercent(motor.totImpulse);
    input.val(value);

    input = list.find('input[name=avgthr]');
    input.val(formatFromMKS(motor.avgThrust, 'force'));

    input = list.find('input[name=maxthr]');
    input.val(formatFromMKS(motor.maxThrust, 'force'));

    input = list.find('input[name=burntime]');
    input.val(formatBurnTime(motor.burnTime));

    input = list.find('input[name=type]');
    value = Metadata.types.get(motor.type);
    if (value == null)
      value = motor.type;
    else
      value = value.label;
    input.val(value);

    input = list.find('input[name=propinfo]');
    input.val(motor.propInfo);

    input = list.find('input[name=caseinfo]');
    input.val(motor.caseInfo);

    input = list.find('input[name=favorite]');
    input.data("kendoMobileSwitch").check(Motors.isSaved(motor));
    input.closest('li label').unbind().bind('touchstart', function(e) {
      if (e.target == this) {
        e.preventDefault();
        var sw = $('#motors-details-list input[name=favorite]').data("kendoMobileSwitch");
        sw.toggle();
        motorDetailsFavorite({ checked: sw.check() });
      }
    });

    if (!wasRotated)
      showPrompt(prompt);

    list.show();
  };

  var updateDetailsChart = function(e) {
    var div = $('#motors-details-chart'),
        height, thrUnit, avgThr, maxTime, options, data, i;

    div.empty();
    div.parent().find('.rotate-me').hide();
    wasRotated = true;

    if (motor == null)
      return;

    e.view.header.find('.km-navbar').data('kendoMobileNavBar').title(
      motor.manufacturer + ' ' + formatCommonName(motor.commonName));

    height = div.parent().height() - 1;
    div.css('height', height + 'px');
    div.css('max-height', height + 'px');
    div.show();

    KendoApp.showLoading();
    Motors.getData(motor, function(updated) {
      KendoApp.hideLoading();
      motor = updated;

      // build the data array
      thrUnit = getUnit('force');
      maxTime = 0;
      data = [];
      for (i = 0; i < updated.simfile.samples.length; i++) {
        if (i === 0 && updated.simfile.samples[i].time > 0.01)
          data.push([0, 0]);
        if (updated.simfile.samples[i].time > maxTime)
          maxTime = updated.simfile.samples[i].time;

        data.push([
          updated.simfile.samples[i].time,
          convertFromMKS(updated.simfile.samples[i].thrust, thrUnit)
        ]);
      }
      avgThr = convertFromMKS(updated.avgThrust);
      if (maxTime < 0.9)
        maxTime = Math.ceil(maxTime * 10) / 10;
      else
        maxTime = Math.ceil(maxTime);

      // set up the chart
      options = {
        xAxis: {
          title: {
            text: 'Time (s)'
          },
          min: 0,
          max: maxTime
        },
        yAxis: {
          title: {
            text: 'Thrust (' + thrUnit.label + ')'
          }
        },
        tooltip: {
          visible: true,
          format: '{1:0.0}' + thrUnit.label + ' at {0:0.00}s'
        },
        legend: {
          visible: false
        },
        series: [{
          name: 'thrust curve',
          type: 'scatterLine',
          style: 'smooth',
          data: data
        }, {
          name: 'average',
          type: 'scatterLine',
          markers: {
            visible: false
          },
          highlight: {
            markers: {
              color: "transparent"
            }
          },
          data: [
            [ 0, avgThr ],
            [ maxTime, avgThr ]
          ]
        }]
      };
      styleChartOptions(options);
      div.kendoChart(options);
    });
  };

  var updateDetails = function(e) {
    $('.k-chart-tooltip').hide();
    e.view.header.find('.km-navbar').data('kendoMobileNavBar').title('Motor Details');

    if (app.isLandscape()) {
      $('#motors-details-list').hide();
      updateDetailsChart(e);
    } else {
      $('#motors-details-chart').hide();
      updateDetailsList(e);
    }
  };

  var initMotorsDetails = function(e) {
    var list = $('#motors-details-list');

    list.find('input[type=text]').each(function() {
      $(this).attr('readonly', 'readonly');
    });

    $(document).on("orientationChange", function() {
      if (KendoApp.view() == e.view)
        updateDetails(e);
    });
  };
  
  var showMotorsDetails = function(e) {
    app.onShow(e);

    var id = e.view.params.id;
    motor = Motors.get(id);

    $('#motors-details-list').find('input[type=text]').val('');

    if (motor == null) {
      doAlert("Missing Motor", "Motor details are missing!");
    } else {
      updateDetails(e);
    }
  };

  var hideMotorsDetails = function(e) {
    $('.k-chart-tooltip').hide();
    e.view.header.find('.km-navbar').data('kendoMobileNavBar').title('Motor Details');
  };

  var motorDetailsFavorite = function(e) {
    if (motor != null) {
      if (e.checked) {
        Motors.addSaved(motor);
        if (motor.simfile == null)
          Motors.getData(motor, function() {}, true);
      }
      else
        Motors.removeSaved(motor);
    }
  };

  global.initMotorsDetails = initMotorsDetails;
  global.showMotorsDetails = showMotorsDetails;
  global.hideMotorsDetails = hideMotorsDetails;
  global.motorDetailsFavorite = motorDetailsFavorite;
})(this);
