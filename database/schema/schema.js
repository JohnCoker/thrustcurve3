/*
 * Copyright 2015 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const bcrypt = require('bcrypt-nodejs'),
      SALT_WORK_FACTOR = 11,
      units = require('../../lib/units');

// date-only data type
var DateOnly;

// Mongo object IDs
const IdRegex = /^[0-9a-f]{24}$/i;

// https://gist.github.com/dperini/729294
const UrlRegex = /^(?:(?:https?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;

// http://www.regular-expressions.info/email.html
const EmailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const MotorNameRegex = /^1\/[248]A(0\.)?[1-9]|[A-Z][1-9][0-9]*$/;
const MotorDesignationRegex = /^[A-Z0-9_./-]+$/;

const MotorTypeEnum = ['SU', 'reload', 'hybrid'];
const MotorAvailabilityEnum = ['regular', 'occasional', 'OOP'];
const MotorAvailableEnum = MotorAvailabilityEnum.slice();
MotorAvailableEnum.splice(2, 1);
Object.freeze(MotorTypeEnum);
Object.freeze(MotorAvailabilityEnum);
Object.freeze(MotorAvailableEnum);

const SimFileFormatEnum = ['RASP', 'RockSim', 'ALT4', 'CompuRoc'];
const SimFileDataSourceEnum = ['cert', 'mfr', 'user'];
const SimFileLicenseEnum = ['PD', 'free', 'other'];
Object.freeze(SimFileFormatEnum);
Object.freeze(SimFileDataSourceEnum);
Object.freeze(SimFileLicenseEnum);

const MotorViewSourceEnum = ['manufacturer', 'search', 'guide', 'browser', 'popular', 'favorite', 'updates'];
Object.freeze(MotorViewSourceEnum);

function dateOnly(mongoose) {
  if (DateOnly == null)
    DateOnly = require('mongoose-dateonly')(mongoose);
  return DateOnly;
}

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
    designation: { type: String, required: true, uppercase: true, match: MotorDesignationRegex },
    altDesignation: { type: String, uppercase: true, match: MotorDesignationRegex },
    commonName: { type: String, required: true, uppercase: true, match: MotorNameRegex },
    altName: { type: String, uppercase: true, match: MotorNameRegex },
    impulseClass: { type: String, required: true, uppercase: true, match: /^[A-O]$/ },
    type: { type: String, required: true, enum: MotorTypeEnum },
    delays: String,
    certDate: dateOnly(mongoose),
    certDesignation: String,
    diameter: { type: Number, required: true, min: 0.006 },
    length: { type: Number, required: true, min: 0.010 },
    avgThrust: { type: Number, required: true, min: 0.01 },
    maxThrust: { type: Number, min: 0.1 },
    totalImpulse: { type: Number, required: true, min: 0.1 },
    burnTime: { type: Number, min: 0.01 },
    isp: { type: Number, min: 10 },
    totalWeight: { type: Number, min: 0.0005 },
    propellantWeight: { type: Number, min: 0.0001 },
    caseInfo: String,
    propellantInfo: String,
    dataSheet: { type: String, match: UrlRegex },
    availability: { type: String, required: true, enum: MotorAvailabilityEnum }
  }, {
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true
    }
  });
  schema.index({ _manufacturer: 1, designation: 1 }, { unique: true });

  schema.virtual('isAvailable').get(function() {
    return this.availability != null && MotorAvailableEnum.indexOf(this.availability) >= 0;
  });

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
    },
    resetToken: String,
    resetExpires: Date
  });
  schemaOptions(schema);

  // http://devsmash.com/blog/password-authentication-with-mongoose-and-bcrypt
  schema.pre('save', function(next) {
    var contributor = this;

    // only hash the password if it has been modified (or is new)
    if (!contributor.isModified('password'))
      return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err)
	return next(err);

      // hash the password using our new salt
      bcrypt.hash(contributor.password, salt, undefined, function(err, hash) {
	if (err)
	  return next(err);

	// override the cleartext password with the hashed one
	contributor.password = hash;
	next();
      });
    });
  });

  schema.methods.comparePassword = function(entered, cb) {
    // missing or explicitly invalid passwords never match
    if (entered == null || entered === '' ||
	!this.password || this.password == '*') {
      cb(null, false);
      return;
    }

    // encrypt and compare with stored hash
    bcrypt.compare(entered, this.password, function(err, isMatch) {
      if (err)
	return cb(err);
      else
	cb(null, isMatch);
    });
  };

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
    format: { type: String, required: true, enum: SimFileFormatEnum },
    dataSource: { type: String, required: true, enum: SimFileDataSourceEnum },
    license: { type: String, enum: SimFileLicenseEnum },
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

function makeMotorViewModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true, index: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor', index: true },
    source: { type: String, enum: MotorViewSourceEnum }
  });
  schemaOptions(schema);
  return mongoose.model('MotorView', schema);
}

function makeMotorRankingModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    asOf: { type: dateOnly(mongoose), required: true, unique: true },
    overall: {
      trendAvg: { type: Number, required: true },
      trendSD: { type: Number, required: true },
      motors: [ {
        _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true, index: true },
        views: { type: Number, required: true, min: 1 },
        trendRatio: { type: Number, required: true },
        trendSigma: { type: Number, required: true }
      } ]
    },
    categories: [ {
      label: { type: String, required: true },
      classes: { type: String, required: true, match: /^[A-O]+$/ },
      trendAvg: { type: Number, required: true },
      trendSD: { type: Number, required: true },
      motors: [ {
        _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true, index: true },
        views: { type: Number, required: true, min: 1 },
        trendRatio: { type: Number, required: true },
        trendSigma: { type: Number, required: true }
      } ],
    } ]
  });
  schemaOptions(schema);
  return mongoose.model('MotorRanking', schema);
}

function makeFavoriteMotorModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor', required: true, index: true },
    _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor', required: true, index: true },
  });
  schema.index({ _contributor: 1, _motor: 1 }, { unique: true });

  schemaOptions(schema);
  return mongoose.model('FavoriteMotor', schema);
}

function makeGuideResultModel(mongoose) {
  var schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true },
    _contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contributor' },
    _rocket: { type: mongoose.Schema.Types.ObjectId, ref: 'Rocket' },
    public: { type: Boolean, required: true },
    inputs: {
      rocketMass: { type: Number, required: true },
      bodyDiameter: { type: Number, required: true },
      cd: { type: Number, required: true },
      guideLength: { type: Number, required: true },
      cluster: { type: Number, min: 2 }
    },
    mmts: [ {
      name: { type: String, required: true },
      adapter: { type: Boolean, required: true },
      diameter: { type: Number, required: true },
      length: { type: Number, required: true },
      weight: { type: Number },
      fit: { type: Number, required: true },
      sim: { type: Number, required: true },
      pass: { type: Number, required: true },
      fail: { type: Number, required: true }
    } ],
    warnings: [ { type: String, required: true } ],
    filters: { type: Number, required: true },
    filtered: { type: Number, required: true },
    fit: { type: Number, required: true },
    sim: { type: Number, required: true },
    pass: { type: Number, required: true },
    fail: { type: Number, required: true },
    results: [ {
      _motor: { type: mongoose.Schema.Types.ObjectId, ref: 'Motor' },
      mmt: { type: String, required: true },
      thrustWeight: { type: Number, required: true },
      simulation: { type: mongoose.Schema.Types.Mixed },
      optimalDelay: { type: Number },
      pass: { type: Boolean, required: true },
      reason: { type: String },
    } ]
  });
  schemaOptions(schema);
  return mongoose.model('GuideResult', schema);
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
   * A regex that matches valid database primary keys.
   * @member {regex}
   */
  IdRegex: IdRegex,

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
   * A regex that matches valid motor common names (G100, M1939, etc).
   * @member {regex}
   */
  MotorNameRegex: MotorNameRegex,

  /**
   * A regex that matches valid motor designations (HP114G100-14A, M1939W, etc).
   * @member {regex}
   */
  MotorDesignationRegex: MotorDesignationRegex,

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

  /**
   * Produce a Mongoose model for the <em>motorViews</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  MotorViewModel: makeMotorViewModel,

  /**
   * Produce a Mongoose model for the <em>motorRankings</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  MotorRankingModel: makeMotorRankingModel,

  /**
   * Produce a Mongoose model for the <em>favoriteMotors</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  FavoriteMotorModel: makeFavoriteMotorModel,

  /**
   * Produce a Mongoose model for the <em>guideResults</em> collection.
   * @function
   * @param {object} mongoose connected Mongoose module
   * @return {object} Mongoose model
   */
  GuideResultModel: makeGuideResultModel,

  /**
   * The legal values for Motor.type.
   * @member {string[]}
   */
  MotorTypeEnum: MotorTypeEnum,

  /**
   * The legal values for Motor.availability.
   * @member {string[]}
   */
  MotorAvailabilityEnum: MotorAvailabilityEnum,

  /**
   * The values for Motor.availability that indicate available.
   * @member {string[]}
   */
  MotorAvailableEnum: MotorAvailableEnum,

  /**
   * The legal values for SimFile.format.
   * @member {string[]}
   */
  SimFileFormatEnum: SimFileFormatEnum,

  /**
   * The legal values for SimFile.dataSource
   * @member {string[]}
   */
  SimFileDataSourceEnum: SimFileDataSourceEnum,

  /**
   * The legal values for SimFile.license.
   * @member {string[]}
   */
  SimFileLicenseEnum: SimFileLicenseEnum,

  /**
   * The legal values for MotorView.source.
   * @member {string[]}
   */
  MotorViewSourceEnum: MotorViewSourceEnum,
};
