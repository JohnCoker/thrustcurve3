/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

// https://gist.github.com/dperini/729294
var UrlRegex = /^(?:(?:https?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;

// http://www.regular-expressions.info/email.html
var EmailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

var MotorNameRegex = /^1\/[248]A(0\.)[1-9]|[A-Z][1-9][0-9]*$/;

var units = require('../../lib/units');

function makeManufacturerModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    name: { type: String, required: true, unique: true },
    abbrev: { type: String, required: true, unique: true },
    aliases: [{ type: String, required: true }],
    website: { type: String, match: UrlRegex },
    active: { type: Boolean, required: true }
  });
  return mongoose.model('Manufacturer', schema);
};

function makeCertOrgModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    name: { type: String, required: true, unique: true },
    abbrev: { type: String, required: true, unique: true },
    aliases: [{ type: String, required: true }],
    website: { type: String, match: UrlRegex }
  });
  return mongoose.model('CertOrg', schema);
};

function makeMotorModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _manufacturer: { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer', required: true },
    _relatedMfr: { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer' },
    _certOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'CertOrg' },
    designation: { type: String, required: true },
    altDesignation: String,
    commonName: { type: String, required: true, match: MotorNameRegex },
    altName: String,
    impulseClass: { type: String, match: /^[A-O]$/ },
    type: { type: String, required: true, enum: ['SU', 'reload', 'hybrid'] },
    delays: String,
    certDate: Date,
    certDesignation: String,
    diameter: { type: Number, required: true, min: 6 },
    length: { type: Number, required: true, min: 10 },
    avgThrust: { type: Number, min: 0.01 },
    maxThrust: { type: Number, min: 0.1 },
    totalImpulse: { type: Number, min: 0.1 },
    burnTime: { type: Number, min: 0.01 },
    isp: { type: Number, min: 10 },
    totalWeight: { type: Number, min: 1 },
    propellantWeight: { type: Number, min: 0.1 },
    caseInfo: String,
    propellantInfo: String,
    dataSheet: { type: String, match: UrlRegex },
    availability: { type: String, required: true, enum: ['regular', 'occasional', 'OOP' ] }
  });
  schema.index({ _manufacturer: 1, designation: 1 }, { unique: true });
  return mongoose.model('Motor', schema);
};

function makeContributorModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    email: { type: String, required: true, match: EmailRegex, unique: true },
    password: { type: String },
    name: { type: String, required: true },
    organization: String,
    showEmail: Boolean,
    website: { type: String, match: UrlRegex },
    _representsMfr: { type: mongoose.Schema.Types.ObjectId, ref: 'Manufacturer' },
    lastLogin: Date,
    preferences: {
      defaultUnits: { type: String, enum: units.defaults.labels },
      lengthUnit: { type: String, enum: units.length.labels },
      massUnit: { type: String, enum: units.mass.labels },
      forceUnit: { type: String, enum: units.force.labels },
      velocityUnit: { type: String, enum: units.velocity.labels },
      accelerationUnit: { type: String, enum: units.acceleration.labels },
      altitudeUnit: { type: String, enum: units.altitude.labels }
    },
    permissions: {
      editMotors: Boolean,
      editSimFiles: Boolean,
      editNotes: Boolean,
      editContributors: Boolean,
      editRockets: Boolean
    }
  });
  return mongoose.model('Contributor', schema);
};

function makeMotorNoteModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor' },
    subject: { type: String, required: true },
    content: { type: String, required: true }
  });
  return mongoose.model('MotorNote', schema);
};

function makeSimFileModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor' },
    format: { type: String, required: true, enum: ['RASP', 'RockSim', 'ALT4', 'CompuRoc'] },
    dataSource: { type: String, required: true, enum: ['cert', 'mfr', 'user'] },
    license: { type: String, enum: [ 'PD', 'free', 'other' ] },
    data: { type: String, required: true }
  });
  return mongoose.model('SimFile', schema);
};

function makeSimFileNoteModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _simFile: { type: mongoose.Schema.Types.ObjectId, ref: 'SimFile', required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor' },
    subject: { type: String, required: true },
    content: { type: String, required: true }
  });
  return mongoose.model('SimFileNote', schema);
};

function makeRocketModel(mongoose) {
  var schema = new mongoose.Schema({
    created: { type: Date, default: Date.now, required: true },
    updated: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor', required: true },
    name: { type: String, required: true },
    public: Boolean,
    bodyDiameter: Number,
    bodyDiameterUnit: { type: String, enum: units.length.labels },
    weight: Number,
    weightUnit: { type: String, enum: units.mass.labels },
    mmtDiameter: Number,
    mmtDiameterUnit: { type: String, enum: units.length.labels },
    mmtLength: Number,
    mmtLengthUnit: { type: String, enum: units.length.labels },
    cd: { type: Number, min: 0.1 },
    guideLength: Number,
    guideLengthUnit: { type: String, enum: units.length.labels },
    website: { type: String, match: UrlRegex },
    comments: String
  });
  return mongoose.model('Rocket', schema);
};

module.exports = {
  UrlRegex: UrlRegex,
  EmailRegex: EmailRegex,
  MotorNameRegex: MotorNameRegex,

  ManufacturerModel: makeManufacturerModel,
  CertOrgModel: makeCertOrgModel,
  MotorModel: makeMotorModel,
  ContributorModel: makeContributorModel,
  MotorNoteModel: makeMotorNoteModel,
  SimFileModel: makeSimFileModel,
  SimFileNoteModel: makeSimFileNoteModel,
  RocketModel: makeRocketModel,
};
