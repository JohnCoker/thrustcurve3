const mongoose = require('mongoose'),
      schema = require('../../schema'),
      ranking = require('..');

/* jshint loopfunc:true */
describe("ranking", function() {
  var db;

  it('connect', function() {
    mongoose.Promise = global.Promise;
    mongoose.connect('mongodb://localhost/test', function(err) {
      if (err) {
        console.error(err);
        return;
      }
      db = {
        mongoose: mongoose,
        Manufacturer: schema.ManufacturerModel(mongoose),
        Motor: schema.MotorModel(mongoose),
        MotorView: schema.MotorViewModel(mongoose),
        MotorRanking: schema.MotorRankingModel(mongoose),
      };
      Object.freeze(db);
      mongoose.connection.db.dropDatabase();
    });
  });

  it("build", function() {
    var manufacturer, motors;

    waits(100);
    runs(function() {
      var inst = new db.Manufacturer({
        name: 'Rockets R Us',
        abbrev: 'RRU',
        aliases: ['RocketsRUs', 'RRUS'],
        website: 'http://rocketsrus.com/'
      });
      inst.save(function(err, saved) {
        if (err)
          console.error(err);
        expect(saved).toBeDefined();
        manufacturer = saved;
      });
    });

    waits(200);
    runs(function() {
      var inst, cls, desig, avg, i;

      expect(manufacturer).toBeDefined();

      motors = [];
      avg = 3;
      for (i = 0; i < 15; i++) {
        cls = String.fromCharCode('A'.charCodeAt(0) + i);
        desig = cls + avg.toFixed();

        inst = new db.Motor({
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
        });
        db.Motor.create(inst, function(err, created) {
          if (err)
            console.err(err);
          expect(created).toBeDefined();
          if (created)
            motors.push(created);
        });

        avg *= 1.667;
      }
    });

    waits(400);
    runs(function() {
      var inst, n, t, d, m, i;

      expect(motors.length).toBe(15);

      n = 1000;
      t = new Date().getTime() - n * 550;
      for (i = 0; i < 1000; i++) {
        d = new Date(t);
        if (i < 100)
          m = motors[i % motors.length];
        else
          m = motors[Math.floor(Math.random() * motors.length)];
        inst = new db.MotorView({
          createdAt: d,
          updateAt: d,
          _motor: m._id
        });
        db.MotorView.create(inst, function(err, created) {
          if (err)
            console.err(err);
          expect(created).toBeDefined();
        });

        t += Math.round(Math.random() * 500);
      }
    });

    waits(1000);
    runs(function() {
      ranking.build(db, function(err, result) {
        var p, i;

        if (err)
          console.err(err);
        expect(result).toBeDefined();

        p = result.overall;
        expect(p).toBeDefined();
        expect(p.motors).toBeDefined();
        expect(p.motors.length).toBe(15);

        expect(result.categories).toBeDefined();
        expect(result.categories.length).toBe(5);
        for (i = 0; i < result.categories.length; i++) {
          p = result.categories[i];
          expect(p).toBeDefined();
          expect(p.label).toBeDefined();
          expect(p.classes).toBeDefined();
          expect(p.motors).toBeDefined();
          expect(p.motors.length).toBe(p.classes.length);
        }
      });
    });
  });

  it("shutdown", function() {
    waits(2000);
    runs(function() {
      mongoose.disconnect();
    });
  });
});
