"use strict";

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const schema = require('../../schema/schema');
const ranking = require('../ranking');

describe("ranking", function() {
  let db;
  let mongoServer;
  let manufacturer = null;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    });

    db = {
      mongoose: mongoose,
      Manufacturer: schema.ManufacturerModel(mongoose),
      Motor: schema.MotorModel(mongoose),
      MotorView: schema.MotorViewModel(mongoose),
      MotorRanking: schema.MotorRankingModel(mongoose),
    };
    Object.freeze(db);

    var mfr = new db.Manufacturer({
      name: 'Rockets R Us',
      abbrev: 'RRU',
      aliases: ['RocketsRUs', 'RRUS'],
      website: 'http://rocketsrus.com/'
    });
    mfr.save()
    .then( function( saved) {
      expect( saved).toBeTruthy();
      manufacturer = saved;
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  it("build", function( done) {
    expect(manufacturer).toBeDefined();

    var motorIds = [];
    var promises = [];
    const impulseClassCount = 15;
    var avg = 0.5;
    // Impulse numbers here match NAR motor code impulse limits:
    //   http://www.nar.org/standards-and-testing-committee/standard-motor-codes/
    for (var i = 0; i < impulseClassCount; i++) {
      var cls = String.fromCharCode('A'.charCodeAt(0) + i).toUpperCase();
      var desig = cls + avg.toFixed();

      promises.push( db.Motor.create({
        _manufacturer: manufacturer,
        designation: desig,
        commonName: desig,
        type: 'SU',
        impulseClass: cls,
        diameter: 18,
        length: 100,
        avgThrust: avg,
        totalImpulse: avg * 3,
        availability: 'regular'
      })
      .then( function( saved){
        motorIds.push( saved._id);
      }));
      avg *= 2.0;
    }

    Promise.all(promises)
    .then( function(){
      expect(motorIds.length).toBe( impulseClassCount);
      promises = [];
    })
    .then( function(){
      // this needs to be >= 101, or else the ranker will reject.
      let sampleSize = 200;
      let sequentialViews = 50;

      let loopStartTime = new Date().getTime(); // magic numbers #2,3
      for (var index = 0; index < sampleSize; index++) {
        let viewTime = new Date(loopStartTime + Math.random() * 500);

        let currentMotor = null;
        if (index < sequentialViews){
          currentMotor = motorIds[Math.floor(impulseClassCount / 2)];
        }else{
          currentMotor = motorIds[Math.floor(Math.random() * motorIds.length)];
        }
        expect(currentMotor).not.toBeNull();

        promises.push(
          db.MotorView.create({
            _motor: currentMotor,
            createdAt: viewTime,
            updateAt: viewTime,
          }, function( err, currentView){
            expect(err).toBeNull();
          })
        );
      }
      return Promise.all( promises);
    })
    .then( function(){
      ranking.build(db, function(err, result) {
        let index;

        expect( err).toBeFalsy();
        if( err){
          console.log(err);
          done();
        }
        expect( result).toBeTruthy();

        expect( result.overall ).toBeTruthy();
        expect( result.overall.motors).toBeTruthy();
        expect( result.overall.motors.length).toBe(15);

        expect( result.categories).toBeTruthy();
        expect( result.categories.length).toBe(5);
        for (index = 0; index < result.categories.length; index++) {
          let category = result.categories[index];

          expect( category).toBeTruthy();
          expect( category.label).toBeDefined();
          expect( category.classes).toBeDefined();
          expect( category.motors).toBeDefined();
          expect( category.motors.length).toBe( category.classes.length);
        }

        done();
      });

    })
    .catch( function(err){
      console.error("catch-all error block!");
      fail(err);
      done();
    });
  });
});
