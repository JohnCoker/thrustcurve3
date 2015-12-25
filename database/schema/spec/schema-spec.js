var mongodb = require('mongodb'),
    mongoose = require('mongoose'),
    schema = require('..');

describe('schema', function() {
  describe('setup', function() {
    it('connect', function() {
      mongoose.connect('mongodb://localhost/test', function(err) {
        if (err)
          console.error(err);
        else 
          mongoose.connection.db.dropDatabase();
      });
      waits(100);
    });
  });

  describe('manufacturer', function() {
    var model = schema.ManufacturerModel(mongoose),
        startTime = new Date();

    it('save', function() {
      runs(function() {
        var inst = model({
          name: 'Rockets R Us',
          abbrev: 'RRU',
          aliases: ['RocketsRUs', 'RRUS'],
          website: 'http://rocketsrus.com/'
        });
        inst.save(function(err) {
          if (err)
            console.error(err);
        });
      });
      waits(100);
    });

    it('find abbrev', function() {
      var found;
      waits(100);
      runs(function() {
        model.findOne({ abbrev: 'RRU' }, function(err, results) {
          if (err)
            console.error(err);
          found = results;
        });
      });
      waits(100);
      runs(function() {
        var now = new Date();

        expect(found).toBeDefined();
        expect(found).not.toBe(null);
        if (found != null) {
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
        }
      });
    });
    it('find active', function() {
      var found;
      waits(100);
      runs(function() {
        model.find({ active: true }, function(err, results) {
          if (err)
            console.error(err);
          else
            found = results;
        });
      });
      waits(100);
      runs(function() {
        expect(found).toBeDefined();
        expect(found.length).toBeGreaterThan(0);
      });
    });

    it('update', function() {
      var queryTime, createTime, found, updated;

      waits(100);
      queryTime = new Date();
      runs(function() {
        model.findOne({ abbrev: 'RRU' }, function(err, results) {
          if (err)
            console.error(err);
          else
            found = results;
        });
      });
      waits(100);
      runs(function() {
        expect(found).toBeDefined();
        expect(found).not.toBe(null);
        if (found != null) {
          expect(found.createdAt).toBeGreaterThan(startTime);
          expect(found.createdAt).toBeLessThan(queryTime);
          expect(found.updatedAt).toBeGreaterThan(startTime);
          expect(found.updatedAt).toBeLessThan(queryTime);
          createTime = found.createdAt;
          found.aliases.push('RUS');
          found.save(function(err, results) {
            if (err)
              console.error(err);
          });
        }
      });
      waits(100);
      runs(function() {
        model.findOne({ abbrev: 'RRU' }, function(err, results) {
          if (err)
            console.error(err);
          else
            updated = results;
        });
      });
      waits(100);
      runs(function() {
        var now = new Date();

        expect(updated).toBeDefined();
        expect(updated).not.toBe(null);
        if (updated != null) {
          expect(updated._id.toString()).toBe(found._id.toString());
          expect(updated.createdAt.toISOString()).toBe(createTime.toISOString());
          expect(updated.updatedAt).toBeGreaterThan(queryTime);
          expect(updated.updatedAt).toBeLessThan(now);
          expect(updated.aliases.indexOf('RUS')).toBeGreaterThan(-1);
        }
      });
    });
  });

  describe('certorg', function() {
    var model = schema.CertOrgModel(mongoose);
    it('save', function() {
      runs(function() {
        var inst = model({
          name: 'Good Rocketry Association',
          abbrev: 'GRA',
          aliases: ['GoodRocketry', 'Good'],
          website: 'http://goodrocketry.org/'
        });
        inst.save(function(err) {
          if (err)
            console.error(err);
        });
      });
      waits(100);
    });

    it('find abbrev', function() {
      var found;
      waits(100);
      runs(function() {
        model.findOne({ abbrev: 'GRA' }, function(err, results) {
          if (err)
            console.error(err);
          else
            found = results;
        });
      });
      waits(100);
      runs(function() {
        expect(found).toBeDefined();
        expect(found).not.toBe(null);
        if (found != null) {
          expect(found._id).toBeDefined();
          expect(found.createdAt).toBeDefined();
          expect(found.updatedAt).toBeDefined();
          expect(found.name).toBe('Good Rocketry Association');
          expect(found.abbrev).toBe('GRA');
          expect(found.aliases.join()).toBe('GoodRocketry,Good');
          expect(found.website).toBe('http://goodrocketry.org/');
        }
      });
    });
    it('find active', function() {
      var found;
      waits(100);
      runs(function() {
        model.find({ active: true }, function(err, results) {
          if (err)
            console.error(err);
          else
            found = results;
        });
      });
      waits(100);
      runs(function() {
        expect(found).toBeDefined();
        expect(found.length).toBeGreaterThan(0);
      });
    });
  });

  describe('teardown', function() {
    it('disconnect', function() {
      waits(1000);
      mongoose.disconnect();
    });
  });
});
