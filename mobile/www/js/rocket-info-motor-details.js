(function(global) {
  'use strict';

  var guideRun;

  var updateDetailsList = function() {
    var list = $('#rocket-info-motor-details-list'),
        input, value;

    list.find('input').val('');
    if (guideRun == null)
      return;

    input = list.find('input[name=mfr]');
    value = Metadata.manufacturers.get(guideRun.manufacturer);
    if (value == null)
      value = guideRun.manufacturer;
    else
      value = value.label;
    input.val(value);

    input = list.find('input[name=desig]');
    input.val(guideRun.designation);

    input = list.find('input[name=name]');
    input.val(formatCommonName(guideRun.commonName));

    if (guideRun.thrustToWeight > 0) {
      input = list.find('input[name=thrustToWeight]');
      if (guideRun.thrustToWeight > 4)
        value = guideRun.thrustToWeight.toFixed(0);
      else
        value = guideRun.thrustToWeight.toFixed(1);
      input.val(value + ':1');
    }

    input = list.find('input[name=simulationsRun]');
    input.val(guideRun.simulationsRun);

    if (guideRun.liftoffMass > 0) {
      input = list.find('input[name=liftoffMass]');
      input.val(formatFromMKS(guideRun.liftoffMass, 'mass'));
    }

    if (guideRun.burnoutMass > 0) {
      input = list.find('input[name=burnoutMass]');
      input.val(formatFromMKS(guideRun.burnoutMass, 'mass'));
    }

    if (guideRun.liftoffTime > 0) {
      input = list.find('input[name=liftoffTime]');
      input.val(formatBurnTime(guideRun.liftoffTime));
    }

    if (guideRun.burnoutTime > 0) {
      input = list.find('input[name=burnoutTime]');
      input.val(formatBurnTime(guideRun.burnoutTime));
    }

    if (guideRun.apogeeTime > 0) {
      input = list.find('input[name=apogeeTime]');
      input.val(formatBurnTime(guideRun.apogeeTime));
    }

    if (guideRun.maxAcceleration > 0) {
      input = list.find('input[name=maxAcceleration]');
      input.val(formatFromMKS(guideRun.maxAcceleration, 'acceleration'));
    }

    if (guideRun.guideVelocity > 0) {
      input = list.find('input[name=guideVelocity]');
      input.val(formatFromMKS(guideRun.guideVelocity, 'velocity'));
    }

    if (guideRun.maxVelocity > 0) {
      input = list.find('input[name=maxVelocity]');
      input.val(formatFromMKS(guideRun.maxVelocity, 'velocity'));
    }

    if (guideRun.burnoutAltitude > 0) {
      input = list.find('input[name=burnoutAltitude]');
      input.val(formatFromMKS(guideRun.burnoutAltitude, 'altitude'));
    }

    if (guideRun.maxAltitude > 0) {
      input = list.find('input[name=maxAltitude]');
      input.val(formatFromMKS(guideRun.maxAltitude, 'altitude'));
    }

    if (guideRun.optimalDelay > 0) {
      input = list.find('input[name=optimalDelay]');
      input.val(guideRun.optimalDelay.toFixed(0) + 's');
    }

    list.show();
  };

  var initRocketInfoMotorDetails = function(e) {
    var list = $('#rocket-info-motor-details-list');

    list.find('input[type=text]').each(function() {
      $(this).attr('readonly', 'readonly');
    });
  };
  
  /* global showRocketInfoBase */
  var showRocketInfoMotorDetails = function(e) {
    showRocketInfoBase(e);

    var motorId = e.view.params.motorId,
	current = Rockets.current,
        items, i;

    if (current == null)
      items = null;
    else
      items = Guide.getSaved(current);
    if (items != null) {
      for (i = 0; i < items.length; i++) {
        if (items[i].motorId == motorId) {
          guideRun = items[i];
          break;
        }
      }
    }

    $('#rocket-info-motor-details-list').find('input[type=text]').val('');

    if (guideRun == null) {
      doAlert("Missing Motor", "Rocket/motor details are missing!");
    } else {
      updateDetailsList();
    }
  };

  var hideRocketInfoMotorDetails = function(e) {
    $('.k-chart-tooltip').hide();
  };

  global.initRocketInfoMotorDetails = initRocketInfoMotorDetails;
  global.showRocketInfoMotorDetails = showRocketInfoMotorDetails;
  global.hideRocketInfoMotorDetails = hideRocketInfoMotorDetails;
})(this);
