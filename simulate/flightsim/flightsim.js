/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var errors = require('../../lib/errors'),
    units = require('../../lib/units'),
    analyze = require('../analyze');

var G = 9.80665;

function simulate(rocket, motor, data, error) {
  var inputs, stats, curve,
      tLiftoff, tBurnout, tApogee, velGuide, accMax, velMax, altBurnout, altMax, impulse,
      t, dt, mass, dm, acc, vel, alt, liftoff, fDrag, fThrust;

  inputs = {
    rocketMass: units.convertUnitToMKS(rocket.weight, 'mass', rocket.weightUnit),
    bodyDiameter: units.convertUnitToMKS(rocket.bodyDiameter, 'length', rocket.bodyDiameterUnit),
    cd: rocket.cd,
    guideLength: units.convertUnitToMKS(rocket.guideLength, 'length', rocket.guideLengthUnit),
    motorInitialMass: motorInitialMass(motor),
    motorBurnoutMass: motorBurnoutMass(motor),
  };

  // validate inputs
  if (typeof inputs.rocketMass != 'number' || isNaN(inputs.rocketMass) || inputs.rocketMass <= 0) {
    error(errors.BAD_ROCKET_INFO, 'missing dry weight for rocket');
    return;
  }
  if (typeof inputs.bodyDiameter != 'number' || isNaN(inputs.bodyDiameter) || inputs.bodyDiameter <= 0) {
    error(errors.BAD_ROCKET_INFO, 'missing body diameter for rocket');
    return;
  }
  if (typeof inputs.cd != 'number' || isNaN(inputs.cd) || inputs.cd <= 0) {
    error(errors.BAD_ROCKET_INFO, 'missing coefficient of drag for rocket');
    return;
  }
  if (typeof inputs.guideLength != 'number' || isNaN(inputs.guideLength) || inputs.guideLength <= 0) {
    error(errors.BAD_ROCKET_INFO, 'missing launch guide length');
    return;
  }
  if (typeof inputs.motorInitialMass != 'number' || isNaN(inputs.motorInitialMass) || inputs.motorInitialMass <= 0) {
    error(errors.BAD_MOTOR_INFO, 'missing motor initial weight');
    inputs.motorInitialMass = 0;
  }
  if (typeof inputs.motorBurnoutMass != 'number' || isNaN(inputs.motorBurnoutMass) || inputs.motorBurnoutMass <= 0) {
    error(errors.BAD_MOTOR_INFO, 'missing motor burnout weight');
    inputs.motorBurnoutMass = 0;
  }

  // get thrust curve function
  stats = analyze.stats(data, error);
  curve = analyze.fit(data, error);
  if (stats == null || curve == null) {
    error(errors.BAD_MOTOR_DATA, 'invalid thrust curve in simulator data file');
    return;
  }
  inputs.motorTotalImpulse = stats.totalImpulse;

  // sample at a higher frequency (at least 100Hz)
  tBurnout = stats.maxTime;
  dt = Math.min(0.01, tBurnout / 100.0);

  // start with the liftoff mass and delta
  mass = inputs.rocketMass + inputs.motorInitialMass;
  if (inputs.motorBurnoutMass < inputs.motorInitialMass) {
    // mass delta is propellant weight over the number of steps during motor burn
    dm = (inputs.motorBurnoutMass - inputs.motorInitialMass) / (tBurnout / dt);
  } else {
    // no mass delta
    dm = 0;
  }
  inputs.loadedInitialMass = mass;

  // calculate drag at STP
  inputs.standardDrag = standardDrag(inputs.bodyDiameter, inputs.cd);

  // simulate through motor burn
  acc = vel = alt = 0;
  liftoff = false;
  accMax = velGuide = velMax = altMax = 0;
  impulse = 0;
  for (t = dt; t <= tBurnout; t += dt) {
    // drag force is proportional to velocity squared
    fDrag = (vel * vel) * inputs.standardDrag;

    // get instantaneous thrust
    fThrust = curve(t);
    impulse += fThrust * dt;

    // calculate acceleration, velocity and altitude
    acc = ((fThrust - fDrag) / mass) - G;
    if (!liftoff) {
      // detect liftoff with first positive acceleration
      if (acc <= 0) {
        // acceleration can't be negative
        acc = 0;
      } else {
        // liftoff detected
        liftoff  = true;
        tLiftoff = t;
      }
    }
    vel += acc * dt;
    alt += vel * dt;

    // track velocity at end of launch guide
    if (vel > 0) {
      if (alt >= inputs.guideLength && velGuide <= 0)
        velGuide = vel;
    }

    // keep track of maximum values
    if (acc > accMax)
        accMax = acc;
    if (vel > velMax)
        velMax = vel;
    if (alt > altMax)
        altMax = alt;

    // reduce mass by delta
    mass -= dm;
  }
  altBurnout = alt;
  tApogee    = t;

  // continue until apogee (at 20Hz)
  dt = 0.05;
  while (vel > 0) {
    // continue with larger time delta
    t += dt;

    // drag force is proportional to velocity squared
    fDrag = (vel * vel) * inputs.standardDrag;

    // calculate acceleration, velocity and altitude
    acc = (-fDrag / mass) - G;
    vel += acc * dt;
    alt += vel * dt;

    // keep track of maximum altitude
    if (alt > altMax) {
      altMax = alt;
      tApogee = t;
    }
  }

  return {
    inputs: inputs,
    liftoffTime: tLiftoff,
    burnoutTime: tBurnout,
    apogeeTime: tApogee,
    guideVelocity: velGuide,
    maxAcceleration: accMax,
    maxVelocity: velMax,
    burnoutAltitude: altBurnout,
    maxAltitude: altMax,
    integratedImpulse: impulse,
  };
}

function motorInitialMass(motor) {
  if (motor.totalWeight > 0)
    return motor.totalWeight;
  if (motor.propellantWeight > 0)
    return 2 * motor.propellantWeight;
  return 0;
}

function motorBurnoutMass(motor) {
  if (motor.totalWeight > 0 && motor.propellantWeight > 0)
    return motor.totalWeight - motor.propellantWeight;
  if (motor.totalWeight > 0)
    return motor.totalWeight / 2;
  if (motor.propellantWeight > 0)
    return motor.propellantWeight;
  return 0;
}

function standardDrag(diameter, cd) {
  // drag multiplier:
  // 1/2 * air-density * area (sq. m) * Cd
  var radius = diameter / 2.0;
  return (0.5 * 
          1.2062 * 
          Math.PI * (radius * radius) *
          cd);
}

module.exports = {
  G: G,
  simulate: simulate,
};
