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

function schemaOptions(schema) {
  // touch updatedAt timestamp
  schema.pre('save', function(next) {
    if (!this.isNew && this.isModified())
      this.updatedAt = new Date();
    next();
  });
}

function makeManufacturerModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    name: { type: String, required: true, unique: true },
    abbrev: { type: String, required: true, unique: true },
    aliases: [{ type: String, required: true }],
    website: { type: String, match: UrlRegex },
    active: { type: Boolean, required: true, default: true }
  });
  schemaOptions(schema);
  return mongoose.model('Manufacturer', schema);
}

function makeCertOrgModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    name: { type: String, required: true, unique: true },
    abbrev: { type: String, required: true, unique: true },
    aliases: [{ type: String, required: true }],
    website: { type: String, match: UrlRegex },
    active: { type: Boolean, required: true, default: true }
  });
  schemaOptions(schema);
  return mongoose.model('CertOrg', schema);
}

function makeMotorModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
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
    diameter: { type: Number, required: true, min: 0.006 },
    length: { type: Number, required: true, min: 0.010 },
    avgThrust: { type: Number, min: 0.01 },
    maxThrust: { type: Number, min: 0.1 },
    totalImpulse: { type: Number, min: 0.1 },
    burnTime: { type: Number, min: 0.01 },
    isp: { type: Number, min: 10 },
    totalWeight: { type: Number, min: 0.0005 },
    propellantWeight: { type: Number, min: 0.0001 },
    caseInfo: String,
    propellantInfo: String,
    dataSheet: { type: String, match: UrlRegex },
    availability: { type: String, required: true, enum: ['regular', 'occasional', 'OOP' ] }
  });
  schema.index({ _manufacturer: 1, designation: 1 }, { unique: true });
  schemaOptions(schema);
  return mongoose.model('Motor', schema);
}

function makeContributorModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
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
  schemaOptions(schema);
  return mongoose.model('Contributor', schema);
}

function makeMotorNoteModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor' },
    subject: { type: String, required: true },
    content: { type: String, required: true }
  });
  schemaOptions(schema);
  return mongoose.model('MotorNote', schema);
}

function makeSimFileModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor' },
    format: { type: String, required: true, enum: ['RASP', 'RockSim', 'ALT4', 'CompuRoc'] },
    dataSource: { type: String, required: true, enum: ['cert', 'mfr', 'user'] },
    license: { type: String, enum: [ 'PD', 'free', 'other' ] },
    data: { type: String, required: true }
  });
  schemaOptions(schema);
  return mongoose.model('SimFile', schema);
}

function makeSimFileNoteModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    migratedId: Number,
    _simFile: { type: mongoose.Schema.Types.ObjectId, ref: 'SimFile', required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor' },
    subject: { type: String, required: true },
    content: { type: String, required: true }
  });
  schemaOptions(schema);
  return mongoose.model('SimFileNote', schema);
}

function makeRocketModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
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
    mmtCount: { type: Number, min: 1, default: 1 },
    adapters: [{
      mmtDiameter: Number,
      mmtDiameterUnit: { type: String, enum: units.length.labels },
      mmtLength: Number,
      mmtLengthUnit: { type: String, enum: units.length.labels },
      weight: Number,
      weightUnit: { type: String, enum: units.mass.labels },
    }],
    cd: { type: Number, min: 0.1 },
    guideLength: Number,
    guideLengthUnit: { type: String, enum: units.length.labels },
    website: { type: String, match: UrlRegex },
    comments: String
  });
  schemaOptions(schema);
  return mongoose.model('Rocket', schema);
}

/**
 * <p>The <b>schema</b> module contains the Mongoose schema used by the site.
 * This is largely a copy of the previous MySQL schema, taking some advantage
 * of nested structure available in MongoDB documents.</p>
 *
 * <p>Aside from a few convenienct regular expressions for matching valid content,
 * this module contains functions and produce Mongoose models.  Note that these
 * are produced on a connected Mongoose instance, so all take the <b>mongoose</b>
 * module instance as an argument.</p>
 *
 * @module schema
 */
module.exports = {
  /**
   * A regex that matches valid HTTP URLs (web sites).
   * @member {regex}
   */
  UrlRegex: UrlRegex,

  /**
   * A regex that matches valid email addresses.
   * @member {regex}
   */
  EmailRegex: EmailRegex,

  /**
   * A regex that matches valid motor common names (C6, M1939, etc).
   * @member {regex}
   */
  MotorNameRegex: MotorNameRegex,

  /**
   * Produce a Mongoose model for the <em>manufacturers</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  ManufacturerModel: makeManufacturerModel,

  /**
   * Produce a Mongoose model for the <em>certorgs</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  CertOrgModel: makeCertOrgModel,

  /**
   * Produce a Mongoose model for the <em>motors</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  MotorModel: makeMotorModel,

  /**
   * Produce a Mongoose model for the <em>contributors</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  ContributorModel: makeContributorModel,

  /**
   * Produce a Mongoose model for the <em>motornotes</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  MotorNoteModel: makeMotorNoteModel,

  /**
   * Produce a Mongoose model for the <em>simfiles</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  SimFileModel: makeSimFileModel,

  /**
   * Produce a Mongoose model for the <em>simfilenotes</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  SimFileNoteModel: makeSimFileNoteModel,

  /**
   * Produce a Mongoose model for the <em>rockets</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  RocketModel: makeRocketModel,
};
