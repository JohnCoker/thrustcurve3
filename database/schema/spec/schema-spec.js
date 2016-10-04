var mongoose = require('mongoose'),
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
      waits(150);
      runs(function() {
        model.findOne({ abbrev: 'RRU' }, function(err, results) {
          if (err)
            console.error(err);
          found = results;
        });
      });
      waits(150);
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

  describe('contributor', function() {
    var model = schema.ContributorModel(mongoose);

    it('save', function() {
      runs(function() {
        var inst = model({
          email: 'joe@xample.com',
	  name: 'Joe Anyone',
	  organization: 'XYZ Rocket Club',
          password: 'very secret',
	  showEmail: true,
	  website: 'http://example.com/joes-rockets.html',
        });
        inst.save(function(err) {
          if (err)
            console.error(err);
        });
      });
      waits(100);
    });

    it('verify saved', function() {
      var found;
      waits(100);
      runs(function() {
        model.findOne({ email: 'joe@xample.com' }, function(err, results) {
          if (err)
            console.error(err);
          found = results;
        });
      });
      waits(100);
      runs(function() {
        expect(found).toBeDefined();
        expect(found.email).toBe('joe@xample.com');
	expect(found.password).toMatch(/^\$2a\$11\$[a-zA-Z0-9+\/.]+=*$/);
	expect(found.name).toBe('Joe Anyone');
	expect(found.organization).toBe('XYZ Rocket Club');
        expect(found.showEmail).toBe(true);
	expect(found.website).toBe('http://example.com/joes-rockets.html');
      });
    });
    it('comparePassword good', function() {
      var found, wasMatch;
      waits(100);
      runs(function() {
        model.findOne({ email: 'joe@xample.com' }, function(err, results) {
          if (err)
            console.error(err);
          found = results;
        });
      });
      waits(100);
      runs(function() {
	expect(found).toBeDefined();
	found.comparePassword('very secret', function(err, isMatch) {
	  if (err)
	    console.error(err);
	  else
	    wasMatch = isMatch;
	});
      });
      waits(300);
      runs(function() {
	expect(wasMatch).toBe(true);
      });
    });
    it('comparePassword good', function() {
      var found, wasMatch;
      waits(100);
      runs(function() {
        model.findOne({ email: 'joe@xample.com' }, function(err, results) {
          if (err)
            console.error(err);
          found = results;
        });
      });
      waits(100);
      runs(function() {
	expect(found).toBeDefined();
	found.comparePassword('vary sacred', function(err, isMatch) {
	  if (err)
	    console.error(err);
	  else
	    wasMatch = isMatch;
	});
      });
      waits(300);
      runs(function() {
	expect(wasMatch).toBe(false);
      });
    });
    it('hasPermission', function() {
      var found;
      waits(100);
      runs(function() {
        model.findOne({ email: 'joe@xample.com' }, function(err, results) {
          if (err)
            console.error(err);
          found = results;
        });
      });
      waits(300);
      runs(function() {
        expect(found.hasPermission('editMotors')).toBe(false);
        expect(found.hasPermission('noSuchPerm')).toBe(false);
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

  describe('teardown', function() {
    it('disconnect', function() {
      waits(1000);
      mongoose.disconnect();
    });
  });
});
