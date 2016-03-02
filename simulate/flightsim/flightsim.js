/*
 * Copyright 2016 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

var errors = require('../../lib/errors'),
    units = require('../../lib/units'),
    analyze = require('../analyze');

var STP = {
  G: 9.80665,
  rho: 1.225
};
Object.freeze(STP);

function simulateRocket(rocket, motor, data, params, error) {
  var inputs;

  if (arguments.length == 4 && typeof params == 'function') {
    error = params;
    params = undefined;
  }

  inputs = {
    rocketMass: units.convertUnitToMKS(rocket.weight, 'mass', rocket.weightUnit),
    bodyDiameter: units.convertUnitToMKS(rocket.bodyDiameter, 'length', rocket.bodyDiameterUnit),
    cd: rocket.cd,
    guideLength: units.convertUnitToMKS(rocket.guideLength, 'length', rocket.guideLengthUnit),
    motorInitialMass: motorInitialMass(motor),
    motorBurnoutMass: motorBurnoutMass(motor),
  };

  return simulate(inputs, data, params, error);
}

function simulate(inputs, data, params, error) {
  var stats, curve,
      tLiftoff, tBurnout, tApogee, velGuide, accMax, velMax, altBurnout, altMax, impulse,
      t, dt, mass, dm, acc, vel, alt, liftoff, fDrag, fThrust;

  if (arguments.length == 3 && typeof params == 'function') {
    error = params;
    params = undefined;
  }
  if (params == null)
    params = STP;
  if (error == null)
    error = function() {};

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
  inputs.standardDrag = standardDrag(inputs.bodyDiameter, inputs.cd, params);

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
    acc = ((fThrust - fDrag) / mass) - params.G;
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
    acc = (-fDrag / mass) - params.G;
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

function standardDrag(diameter, cd, params) {
  // drag multiplier:
  // 1/2 * air-density * area (sq. m) * Cd
  var radius = diameter / 2.0;
  return (0.5 *
          params.rho *
          Math.PI * (radius * radius) *
          cd);
}

/**
 * <p>The <b>flightsim</b> module implements a quick-and-dirty rocket flight simulator based on
 * simple assumptions, notably sub-Mach flight near mean sea level.
 * The intention is not to replace full flight simulation products, but to perform
 * quick simulations to ensure that a motor can safely be used in a rocket.</p>
 *
 * <p>The arguments to the <em>simulate</em> function are:</p>
 * <ul>
 * <li>key rocket measurements (loaded from <em>rockets</em>)</li>
 * <li>official motor information (loaded from <em>motors</em>)</li>
 * <li>parsed motor data (parsed from <em>simfiles</em>)</li>
 * <li>simulation parameters (optional)</li>
 * <li>error reporter (optional)</li>
 * </ul>
 *
 * <p>The simulation parameters reflect varying launch conditions:<p>
 * <ul>
 * <li>G: acceleration due to gravity (m/s²)</li>
 * <li>rho: air density (kg/m³)</li>
 * </ul>
 *
 * <p>All input and output measurements are in MKS units.</p>
 *
 * <p>The output from a simulation run is an object containing calculated input values and
 * statistics:</p>
 * <ul>
 * <li>inputs: calculated input values (see below)</li>
 * <li>liftoffTime: time to first movement</li>
 * <li>burnoutTime: time to complete motor burnout</li>
 * <li>apogeeTime: time to apogee</li>
 * <li>guideVelocity: velocity at end of launch guide</li>
 * <li>maxAcceleration: maximum accleration</li>
 * <li>maxVelocity: maximum velocity</li>
 * <li>burnoutAltitude: altitude at burnout</li>
 * <li>maxAltitude: altitude of apogee</li>
 * <li>integratedImpulse: total impulse as seen by simulation</li>
 * </ul>
 *
 * <p>The <i>inputs</i> object contains values calculated for the simulation:</p>
 * <ul>
 * <li>rocketMass: total lift-off weight (rocket and motor)</li>
 * <li>bodyDiameter: nominal rocket body diameter</li>
 * <li>cd: declared rocket coefficient of drag</li>
 * <li>guideLength: length of launch guide</li>
 * <li>motorInitialMass: loaded weight of motor</li>
 * <li>motorBurnoutMass: weight of motor at burnout</li>
 * </ul>
 *
 * <p>Simulation of a 6" HPR rocket on an AeroTech M1939 might produce:</p>
 * <pre>
 * {
 *   inputs: {
 *     rocketMass: 12.246984,
 *     bodyDiameter: 0.15748,
 *     cd: 0.5,
 *     guideLength: 3.6576000000000004,
 *     motorInitialMass: 8.988,
 *     motorBurnoutMass: 3.2689999999999992,
 *     motorTotalImpulse: 10339.815,
 *     loadedInitialMass: 21.234983999999997,
 *     standardDrag: 0.005965087120805519
 *   },
 *   liftoffTime: 0.02,
 *   burnoutTime: 7,
 *   apogeeTime: 26.96000000000016,
 *   guideVelocity: 23.313125598256043,
 *   maxAcceleration: 76.81186949540442,
 *   maxVelocity: 310.2119118361769,
 *   burnoutAltitude: 1472.999637516778,
 *   maxAltitude: 3798.4749725549436,
 *   integratedImpulse: 10339.808350000132
 * }
 * </pre>
 *
 * @module flightsim
 */
module.exports = {
  /**
   * <p>The simulation parameters for standard temperature and pressure.</p>
   * @member {object} STP
   */
  STP: STP,

  /**
   * Run a single flight simulation on a saved rocket and motor.
   * @function
   * @param {object} rocket entered rocket info with units
   * @param {object} motor information on the motor
   * @param {object} data parsed thrust curve
   * @param {object} [params] simulation parameters
   * @param {function} [error] error reporter
   * @return {object} simulation results
   */
  simulateRocket: simulateRocket,

  /**
   * Run a single flight simulation with loaded info.
   * @function
   * @param {object} input rocket information in MKS
   * @param {number} input.rocketMass dry weight (Kg)
   * @param {number} input.bodyDiameter nominal body diameter (m)
   * @param {number} input.cd coefficient of drag
   * @param {number} input.guideLength launch guide length (m)
   * @param {number} input.motorInitialMass launch weight of motor (Kg)
   * @param {number} input.motorBurnoutMass post-burn weight of motor (Kg)
   * @param {object} data parsed thrust curve
   * @param {object} [params] simulation parameters
   * @param {function} [error] error reporter
   * @return {object} simulation results
   */
  simulate: simulate,

  /**
   * Calculate the motor's initial (lift-off) mass.
   * @function
   * @param {object} motor model
   * @return {number} mass (Kg)
   */
  motorInitialMass: motorInitialMass,

  /**
   * Calculate the motor's final (burn-out) mass.
   * @function
   * @param {object} motor model
   * @return {number} mass (Kg)
   */
  motorBurnoutMass: motorBurnoutMass,
};
