'use strict';

const mongoose = require('mongoose'),
      { MongoMemoryServer } = require('mongodb-memory-server'),
      schema = require('../../../database/schema'),
      contributors = require('../contributors');

describe('contributors', function() {
  let db;
  let mongoServer;
  let motorId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    });

    function model(name, factory) {
      return mongoose.models[name] || factory(mongoose);
    }
    db = {
      Contributor: model('Contributor', schema.ContributorModel),
      Manufacturer: model('Manufacturer', schema.ManufacturerModel),
      Motor: model('Motor', schema.MotorModel),
      MotorNote: model('MotorNote', schema.MotorNoteModel),
      MotorCert: model('MotorCert', schema.MotorCertModel),
      SimFile: model('SimFile', schema.SimFileModel),
      SimFileNote: model('SimFileNote', schema.SimFileNoteModel),
      Rocket: model('Rocket', schema.RocketModel),
      MotorView: model('MotorView', schema.MotorViewModel),
      FavoriteMotor: model('FavoriteMotor', schema.FavoriteMotorModel),
      GuideResult: model('GuideResult', schema.GuideResultModel),
    };
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    const mfr = await db.Manufacturer.create({
      name: 'Rockets R Us',
      abbrev: 'RRU',
    });
    const motor = await db.Motor.create({
      _manufacturer: mfr._id,
      designation: 'C6',
      commonName: 'C6',
      impulseClass: 'C',
      type: 'SU',
      delays: '3',
      diameter: 0.018,
      length: 0.07,
      avgThrust: 6,
      totalImpulse: 10,
      availability: 'regular',
    });
    motorId = motor._id;
  });

  function contributor(email, name) {
    return db.Contributor.create({
      email: email,
      name: name,
      password: 'secret',
      showEmail: true,
    });
  }

  it('reassigns public data, clears views, and deletes the account', function(done) {
    contributor('michael@example.com', 'Michael Puckett').then(function(user) {
      return Promise.all([
        db.Rocket.create({ _contributor: user._id, name: 'Alpha' }),
        db.FavoriteMotor.create({ _contributor: user._id, _motor: motorId }),
        db.MotorView.create({ _contributor: user._id, _motor: motorId, source: 'search' }),
        db.SimFile.create({
          _contributor: user._id,
          _motor: motorId,
          format: 'RASP',
          dataSource: 'user',
          data: '; C6\n',
        }),
        db.MotorNote.create({
          _contributor: user._id,
          _motor: motorId,
          subject: 'note',
          content: 'hello',
        }),
      ]).then(function() {
        return user;
      });
    }).then(function(user) {
      contributors.deleteAccount(db, user, function(err, result) {
        expect(err).toBeNull();
        expect(result.deletedUser.email).toBe(contributors.DELETED_USER_EMAIL);
        expect(result.deletedUser.password).toBe('*');
        expect(result.simfiles).toBe(1);
        expect(result.motorNotes).toBe(1);
        expect(result.views).toBe(1);
        expect(result.rockets).toBe(1);
        expect(result.favorites).toBe(1);

        const deletedId = result.deletedUser._id;
        db.Contributor.findOne({ email: 'michael@example.com' }, function(err, gone) {
          expect(err).toBeNull();
          expect(gone).toBeNull();
          db.SimFile.findOne({ _motor: motorId }, function(err, file) {
            expect(err).toBeNull();
            expect(file._contributor.toString()).toBe(deletedId.toString());
            db.MotorNote.findOne({ _motor: motorId }, function(err, note) {
              expect(err).toBeNull();
              expect(note._contributor.toString()).toBe(deletedId.toString());
              db.MotorView.findOne({ _motor: motorId }, function(err, view) {
                expect(err).toBeNull();
                expect(view).not.toBeNull();
                expect(view._contributor).toBeUndefined();
                db.Rocket.countDocuments({ name: 'Alpha' }, function(err, rockets) {
                  expect(err).toBeNull();
                  expect(rockets).toBe(0);
                  db.FavoriteMotor.countDocuments({ _motor: motorId }, function(err, favs) {
                    expect(err).toBeNull();
                    expect(favs).toBe(0);
                    result.deletedUser.comparePassword('*', function(err, match) {
                      expect(err).toBeNull();
                      expect(match).toBe(false);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    }).catch(done.fail);
  });

  it('reuses the same Deleted User', function(done) {
    contributor('one@example.com', 'One').then(function(first) {
      return db.SimFile.create({
        _contributor: first._id,
        _motor: motorId,
        format: 'RASP',
        dataSource: 'user',
        data: 'one',
      }).then(function() {
        return new Promise(function(resolve, reject) {
          contributors.deleteAccount(db, first, function(err, result) {
            if (err)
              reject(err);
            else
              resolve(result.deletedUser._id.toString());
          });
        });
      });
    }).then(function(deletedId) {
      return contributor('two@example.com', 'Two').then(function(second) {
        return db.SimFile.create({
          _contributor: second._id,
          _motor: motorId,
          format: 'RockSim',
          dataSource: 'user',
          data: 'two',
        }).then(function() {
          return new Promise(function(resolve, reject) {
            contributors.deleteAccount(db, second, function(err, result) {
              if (err)
                reject(err);
              else
                resolve({ deletedId: deletedId, again: result.deletedUser._id.toString() });
            });
          });
        });
      });
    }).then(function(ids) {
      expect(ids.again).toBe(ids.deletedId);
      db.Contributor.countDocuments({ email: contributors.DELETED_USER_EMAIL }, function(err, n) {
        expect(err).toBeNull();
        expect(n).toBe(1);
        db.SimFile.find({ _contributor: ids.deletedId }, function(err, files) {
          expect(err).toBeNull();
          expect(files.length).toBe(2);
          done();
        });
      });
    }).catch(done.fail);
  });

  it('refuses to delete the Deleted User account', function(done) {
    contributors.getDeletedUser(db, function(err, deleted) {
      expect(err).toBeNull();
      contributors.deleteAccount(db, deleted, function(err) {
        expect(err).toBeTruthy();
        expect(err.message).toMatch(/cannot delete/);
        db.Contributor.findOne({ email: contributors.DELETED_USER_EMAIL }, function(err, still) {
          expect(err).toBeNull();
          expect(still).not.toBeNull();
          done();
        });
      });
    });
  });
});
