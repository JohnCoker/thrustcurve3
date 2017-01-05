"use strict";

var mongoose = require('mongoose');
var schema = require('..');

mongoose.Promise = require('bluebird');
var mockgoose = require('mockgoose');

describe('schemas', function() {
  var startTime;

  beforeAll( function(done) {
    mockgoose(mongoose).then(function() {
      mongoose.connect('mongodb://localhost/test', function(err) {
        startTime = new Date();
        if (err){ console.error(err); }
        done(err);
      });
    });
  });

  afterAll( function( done) {
    mongoose.models = {};
    mongoose.disconnect();
    done();
  });

  afterEach( function(done){
    mockgoose.reset(function() {
      done();
    });
  });

  describe('manufacturer', function() {
    var ManufacturerModel = null;

    beforeAll( function(done){
      ManufacturerModel = schema.ManufacturerModel(mongoose);
      done();
    });

    beforeEach( function(done){
      new ManufacturerModel({
          name: 'Rockets R Us',
          abbrev: 'RRU',
          aliases: ['RocketsRUs', 'RRUS'],
          website: 'http://rocketsrus.com/'
      }).save(function(err) {
        expect(err).toBeNull();
        done();
      });
    });

    it('manufacturers may be saved to the database.', function( done) {
      ManufacturerModel.count().exec().then( function( cnt ){
          expect(cnt).toBeGreaterThan( 0);
          done();
      });
    });

    it('can find manufacturer by abbrev', function( done) {
      ManufacturerModel.findOne({ abbrev: 'RRU' }).exec()
      .then( function( found ){
        var now = new Date();

        expect(found).toBeDefined();
        expect(found).not.toBeNull();
        expect(found._id).toBeDefined();

        expect(found.createdAt).toBeDefined();
        expect(found.createdAt).toBeGreaterThan(startTime);
        expect(found.createdAt).toBeLessThan(now);

        expect(found.updatedAt).toBeDefined();
        expect(found.updatedAt).toBeGreaterThan(startTime);
        expect(found.updatedAt).toBeLessThan(now);

        expect(found.name).toBe('Rockets R Us');
        expect(found.abbrev).toBe('RRU');
        expect(found.aliases.join()).toBe('RocketsRUs,RRUS');
        expect(found.website).toBe('http://rocketsrus.com/');
        expect(found.active).toBe(true);

        done();
      });

    });

    it('can find active manufacturers', function( done) {
      ManufacturerModel.find({ active: true }).count().exec()
      .then( function(count) {
        expect( count).toBeDefined();
        expect( count).toBeGreaterThan(0);
        done();
      });
    });

    it('update', function( done) {
      var queryTime;

      queryTime = new Date();
      ManufacturerModel.findOne({ abbrev: 'RRU' }).exec()
      .then( function( priorFound) {
        expect(priorFound).toBeDefined();

        priorFound.aliases.push('RUS');
        priorFound.save( function(){

          ManufacturerModel.findOne({ abbrev: 'RRU' }).exec()
          .then( function( updated){
            var now = new Date();

            expect(updated).toBeDefined();
            expect(updated).not.toBeNull();
            expect(updated._id.toString()).toBe( priorFound._id.toString());
            expect(updated.createdAt.toISOString()).toBe( priorFound.createdAt.toISOString());
            expect(updated.updatedAt).toBeGreaterThan(queryTime);
            expect(updated.updatedAt).toBeLessThan(now);
            expect(updated.aliases.indexOf('RUS')).toBeGreaterThan(-1);

            done();
          });
        });
      });
    });
  });

  // certorg (aka Certification Orginization )
  describe('certorg', function() {
    var CertOrgModel = null;

    beforeAll( function(done){
      CertOrgModel = schema.CertOrgModel(mongoose);
      done();
    });

    beforeEach( function(done){
      new CertOrgModel({
        name: 'Good Rocketry Association',
        abbrev: 'GRA',
        aliases: ['GoodRocketry', 'Good'],
        website: 'http://goodrocketry.org/'
      }).save(function(err) {
        expect(err).toBeNull();
        done();
      });
    });

    it('certorgs may be saved to the database', function( done) {
      CertOrgModel.count().exec()
      .then( function( cnt ){
        expect(cnt).toBeGreaterThan( 0);
        done();
      });
    });

    it('find abbrev', function( done){
      CertOrgModel.findOne({ abbrev: 'GRA' }).exec()
      .then( function( found) {

        expect(found).toBeDefined();
        expect(found).not.toBeNull();

        expect(found._id).toBeDefined();
        expect(found.createdAt).toBeDefined();
        expect(found.updatedAt).toBeDefined();
        expect(found.name).toBe('Good Rocketry Association');
        expect(found.abbrev).toBe('GRA');
        expect(found.aliases.join()).toBe('GoodRocketry,Good');
        expect(found.website).toBe('http://goodrocketry.org/');
        done();
      });
    });

    it('find active', function( done) {
      CertOrgModel.findOne({ active: true }).count().exec()
      .then( function( orgCount ) {
        expect( orgCount).toBeDefined();
        expect( orgCount).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('contributor', function() {
    var ContributorModel = null;

    beforeAll( function(done){
      ContributorModel = schema.ContributorModel(mongoose);
      done();
    });

    beforeEach( function( done){
      new ContributorModel({
          email: 'joe@xample.com',
      	  name: 'Joe Anyone',
      	  organization: 'XYZ Rocket Club',
          password: 'very secret',
      	  showEmail: true,
      	  website: 'http://example.com/joes-rockets.html',
      }).save(function(err) {
        expect(err).toBeNull();
        done();
      });
    });

    it('certorgs may be saved to the database', function( done) {
      ContributorModel.count().exec()
      .then( function( cnt ){
        expect(cnt).toBeGreaterThan( 0);
        done();
      });
    });

    it('verify saved', function( done ) {
      ContributorModel.findOne({ email: 'joe@xample.com' }).exec()
      .then( function( found ){

        expect(found).toBeDefined();
        expect(found.email).toBe('joe@xample.com');
      	expect(found.password).toMatch(/^\$2a\$11\$[a-zA-Z0-9+\/.]+=*$/);
      	expect(found.name).toBe('Joe Anyone');
      	expect(found.organization).toBe('XYZ Rocket Club');
        expect(found.showEmail).toBe(true);
	      expect(found.website).toBe('http://example.com/joes-rockets.html');

        done();
      });
    });

    it('contributor password match', function( done ) {
      ContributorModel.findOne({ email: 'joe@xample.com' }).exec()
      .then( function( found) {

        expect(found).toBeDefined();
      	found.comparePassword('very secret', function(err, isMatch) {
      	  if (err){
      	    console.error(err);
            fail('passwords do not match');
      	  }else{
      	    expect(isMatch).toBe(true);
            done();
          }
        });
      });
    });

    it('comparePassword fail', function( done) {
      ContributorModel.findOne({ email: 'joe@xample.com' }).exec()
      .then( function( found) {
        expect(found).toBeDefined();

	      found.comparePassword('vary sacred', function(err, isMatch) {
      	  if (err){
      	    console.error(err);
      	  }else{
      	    expect(isMatch).toBe(false);
            done();
          }
        });
      });
    });

    it('hasPermission', function( done) {
      ContributorModel.findOne({ email: 'joe@xample.com' }).exec()
      .then( function( found) {
        expect( found.hasPermission('editMotors')).toBe(false);
        expect( found.hasPermission('noSuchPerm')).toBe(false);
        done();
      });
    });
  });

  describe('permissions', function() {
    describe("getPermissionKey", function() {
      it("missing", function() {
        expect(schema.getPermissionKey()).toBeUndefined();
        expect(schema.getPermissionKey(null)).toBeUndefined();
        expect(schema.getPermissionKey('')).toBeUndefined();
        expect(schema.getPermissionKey({a:1})).toBeUndefined();
      });
      it("invalid", function() {
        expect(schema.getPermissionKey('stuff')).toBeUndefined();
      });
      it("motors", function() {
        expect(schema.getPermissionKey('motors')).toBe('editMotors');
        expect(schema.getPermissionKey('Motors')).toBe('editMotors');
        expect(schema.getPermissionKey('editMotors')).toBe('editMotors');
      });
    });
  });

});
