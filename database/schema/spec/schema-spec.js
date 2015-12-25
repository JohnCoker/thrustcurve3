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
    var model = schema.ManufacturerModel(mongoose);
    it('save', function() {
      runs(function() {
        var inst = model({
          name: 'Rockets R Us',
          abbrev: 'RRU',
          aliases: ['RocketsRUs', 'RRUS'],
          website: 'http://rocketsrus.com/',
          active: true
        });
        inst.save(function(err) {
          if (err)
            console.error(err);
        });
      });
      waits(100);
    });

    it('findOne', function() {
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
        expect(found).toBeDefined();
        expect(found).not.toBe(null);
        if (found != null) {
          expect(found._id).toBeDefined();
          expect(found.name).toBe('Rockets R Us');
          expect(found.abbrev).toBe('RRU');
          expect(found.aliases.join()).toBe('RocketsRUs,RRUS');
          expect(found.website).toBe('http://rocketsrus.com/');
          expect(found.active).toBe(true);
        }
      });
    });
    it('find', function() {
      var found;
      waits(100);
      runs(function() {
        model.find({ active: true }, function(err, results) {
          if (err)
            console.error(err);
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
