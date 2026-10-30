/*
 * Copyright 2026 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const async = require('async');

const DELETED_USER_EMAIL = 'deleted@thrustcurve.org';
const DELETED_USER_NAME = 'Deleted User';

function isDeletedEmail(email) {
  return String(email || '').trim().toLowerCase() === DELETED_USER_EMAIL;
}

function isDeletedUser(contributor) {
  return contributor != null && isDeletedEmail(contributor.email);
}

function changedCount(result) {
  if (result == null)
    return 0;
  if (typeof result.nModified === 'number')
    return result.nModified;
  if (typeof result.modifiedCount === 'number')
    return result.modifiedCount;
  if (typeof result.deletedCount === 'number')
    return result.deletedCount;
  if (typeof result.n === 'number')
    return result.n;
  return 0;
}

/*
 * Find or create the reserved contributor that inherits public data
 * when an account is deleted. The stored password is the literal "*",
 * which comparePassword never accepts, so this account cannot log in.
 */
function getDeletedUser(db, cb) {
  db.Contributor.findOne({ email: DELETED_USER_EMAIL }, function(err, existing) {
    if (err)
      return cb(err);
    if (existing) {
      if (!isDeletedUser(existing) || (existing.password && existing.password !== '*' && existing.name !== DELETED_USER_NAME))
        return cb(new Error('reserved Deleted User email is already registered'));
      if (existing.password === '*')
        return cb(null, existing);
      return db.Contributor.updateOne({ _id: existing._id }, { $set: { password: '*' } }, function(err) {
        if (err)
          return cb(err);
        existing.password = '*';
        cb(null, existing);
      });
    }

    const user = new db.Contributor({
      email: DELETED_USER_EMAIL,
      name: DELETED_USER_NAME,
      showEmail: false,
    });
    user.save(function(err, saved) {
      if (err) {
        if (err.code === 11000)
          return db.Contributor.findOne({ email: DELETED_USER_EMAIL }, cb);
        return cb(err);
      }
      db.Contributor.updateOne({ _id: saved._id }, { $set: { password: '*' } }, function(err) {
        if (err)
          return cb(err);
        saved.password = '*';
        cb(null, saved);
      });
    });
  });
}

function accountSummary(db, contributor, cb) {
  const id = contributor._id;
  async.parallel({
    rockets: function(done) {
      db.Rocket.countDocuments({ _contributor: id }, done);
    },
    simfiles: function(done) {
      db.SimFile.countDocuments({ _contributor: id }, done);
    },
    notes: function(done) {
      async.parallel([
        function(next) {
          db.MotorNote.countDocuments({ _contributor: id }, next);
        },
        function(next) {
          db.SimFileNote.countDocuments({ _contributor: id }, next);
        },
      ], function(err, counts) {
        if (err)
          return done(err);
        done(null, counts[0] + counts[1]);
      });
    },
  }, cb);
}

/*
 * Remove an account. Public motor data is reassigned to Deleted User.
 * Motor views stay, with the contributor cleared, so popularity stats
 * are unchanged. Rockets, favorites, and guide results are deleted.
 */
function deleteAccount(db, contributor, cb) {
  if (contributor == null)
    return cb(new Error('no contributor'));
  if (isDeletedUser(contributor))
    return cb(new Error('cannot delete the Deleted User account'));

  getDeletedUser(db, function(err, deleted) {
    if (err)
      return cb(err);

    const id = contributor._id;
    const reassign = { $set: { _contributor: deleted._id } };
    async.series([
      function(done) {
        db.SimFile.updateMany({ _contributor: id }, reassign, done);
      },
      function(done) {
        db.SimFileNote.updateMany({ _contributor: id }, reassign, done);
      },
      function(done) {
        db.MotorNote.updateMany({ _contributor: id }, reassign, done);
      },
      function(done) {
        db.MotorCert.updateMany({ _contributor: id }, reassign, done);
      },
      function(done) {
        db.MotorView.updateMany({ _contributor: id }, { $unset: { _contributor: 1 } }, done);
      },
      function(done) {
        db.Rocket.deleteMany({ _contributor: id }, done);
      },
      function(done) {
        db.FavoriteMotor.deleteMany({ _contributor: id }, done);
      },
      function(done) {
        db.GuideResult.deleteMany({ _contributor: id }, done);
      },
      function(done) {
        db.Contributor.deleteOne({ _id: id }, done);
      },
    ], function(err, results) {
      if (err)
        return cb(err);
      cb(null, {
        deletedUser: deleted,
        simfiles: changedCount(results[0]),
        simFileNotes: changedCount(results[1]),
        motorNotes: changedCount(results[2]),
        certs: changedCount(results[3]),
        views: changedCount(results[4]),
        rockets: changedCount(results[5]),
        favorites: changedCount(results[6]),
        guideResults: changedCount(results[7]),
      });
    });
  });
}

module.exports = {
  DELETED_USER_EMAIL: DELETED_USER_EMAIL,
  DELETED_USER_NAME: DELETED_USER_NAME,
  isDeletedEmail: isDeletedEmail,
  isDeletedUser: isDeletedUser,
  getDeletedUser: getDeletedUser,
  accountSummary: accountSummary,
  deleteAccount: deleteAccount,
};
