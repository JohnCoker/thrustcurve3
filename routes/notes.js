/*
 * Copyright 2016-2020 John Coker for ThrustCurve.org
 * Licensed under the ISC License, https://opensource.org/licenses/ISC
 */
'use strict';

const express = require('express'),
      router = express.Router(),
      metadata = require('../lib/metadata'),
      locals = require('./locals.js'),
      authenticated = require('./authenticated.js'),
      verified = require('./verified.js');

const defaults = {
  layout: 'admin',
};

// must be authenticated for all requests
router.use(authenticated);

function isInvalid(note) {
  return note.subject == null || note.subject === '' || note.content == null || note.content === '';
}

function isMyNote(req, note) {
  let contribId = note._contributor._id || note._contributor;
  return contribId.toString() == req.user._id.toString();
}

function canEdit(req, note) {
  return isMyNote(req, note) || req.user.hasPermission('editNotes');
}

/*
 * /notes/motor/:motorId/add.html
 * Add a new motor note.
 */
function getMotor(req, res, cb) {
  if (!req.db.isId(req.params.motorId)) {
    res.status(404).send('unknown motor');
    return;
  }
  req.db.Motor.findOne({ _id: req.params.motorId }, req.success(function(motor) {
   if (motor == null)
     res.status(404).send('unknown motor');
   else
     cb(motor);
  }));
}

function doEditMotorNote(req, res, note) {
  metadata.get(req, cache => {
    let deleteLink;
    if (!note.isNew)
      deleteLink = '/notes/motor/' + note._id + '/delete.html';
    res.render('notes/edit', locals(req, defaults, {
      title: (note.isNew ? 'Add' : 'Edit') + ' Motor Note',
      id: note.isNew ? note._id : null,
      manufacturer: cache.manufacturers.byId(note._motor._manufacturer),
      motor: note._motor,
      contributor: note._contributor,
      subject: note.subject,
      content: note.content,
      isErrors: req.method === 'POST' && isInvalid(note),
      isEditable: canEdit(req, note),
      isMine: isMyNote(req, note),
      submitLink: req.originalUrl,
      deleteLink,
    }));
  });
}

router.get('/notes/motor/:motorId/add.html', function(req, res, next) {
  getMotor(req, res, motor => {
    let note = new req.db.MotorNote({ _motor: motor, _contributor: req.user });
    doEditMotorNote(req, res, note);
  });
});

function redirectToMotor(req, res, motor) {
  metadata.get(req, cache => {
    let mfr = cache.manufacturers.byId(motor._manufacturer);
    res.redirect(303, '/motors/' + mfr.abbrev + '/' + motor.designation + '/#notes');
  });
}

router.post('/notes/motor/:motorId/add.html', verified, function(req, res, next) {
  getMotor(req, res, motor => {
    let subject = req.body.subject,
        content = req.body.content;
    if (subject != null)
      subject = subject.trim();
    if (content != null)
      content = content.trim();

    let note = new req.db.MotorNote({
      _motor: motor,
      _contributor: req.user,
      subject,
      content,
    });

    if (isInvalid(note) || req.body.preview) {
      doEditMotorNote(req, res, note);
      return;
    }

    note.save(req.success(function(updated) {
      redirectToMotor(req, res, updated._motor);
    }));
  });
});

/**
 * /notes/motor/:id/edit.html
 * Edit an existing motor note.
 */
function getMotorNote(req, res, submit, cb) {
  if (!req.db.isId(req.params.id)) {
    res.status(404).send('invalid motor note');
    return;
  }
  req.db.MotorNote.findOne({ _id: req.params.id })
                  .populate('_motor _contributor')
                  .exec(req.success(note => {
    if (note == null) {
      res.status(404).send('invalid motor note');
      return;
    }
    if (submit && !canEdit(req, note)) {
      res.status(401).send('cannot edit note');
      return;
    }

    cb(note);
  }));
}

router.get('/notes/motor/:id/edit.html', function(req, res, next) {
  getMotorNote(req, res, false, note => doEditMotorNote(req, res, note));
});

router.post('/notes/motor/:id/edit.html', verified, function(req, res, next) {
  getMotorNote(req, res, true, note => {
    let subject = req.body.subject,
        content = req.body.content;
    if (subject != null)
      subject = subject.trim();
    if (content != null)
      content = content.trim();
    note.subject = subject;
    note.content = content;

    if (isInvalid(note) || req.body.preview) {
      doEditMotorNote(req, res, note);
      return;
    }

    note.save(req.success(function(updated) {
      redirectToMotor(req, res, updated._motor);
    }));
  });
});

/**
 * /notes/motor/:id/delete.html
 * Delete a motor note.
 */
router.get('/notes/motor/:id/delete.html', function(req, res, next) {
  getMotorNote(req, res, true, note => {
    req.db.MotorNote.deleteOne({ _id: note._id }, req.success(() => {
      redirectToMotor(req, res, note._motor);
    }));
  });
});


/*
 * /notes/simfile/:fileId/add.html
 * Add a new simfile note.
 */
function getSimfile(req, res, cb) {
  if (!req.db.isId(req.params.fileId)) {
    res.status(404).send('unknown simulator file');
    return;
  }
  req.db.SimFile.findOne({ _id: req.params.fileId }, req.success(function(simfile) {
   if (simfile == null)
     res.status(404).send('unknown simulator file');
   else
     cb(simfile);
  }));
}

function doEditSimfileNote(req, res, note) {
  metadata.get(req, cache => {
    let deleteLink;
    if (!note.isNew)
      deleteLink = '/notes/simfile/' + note._id + '/delete.html';
    res.render('notes/edit', locals(req, defaults, {
      title: (note.isNew ? 'Add' : 'Edit') + ' File Note',
      id: note.isNew ? note._id : null,
      simfile: note._simFile,
      contributor: note._contributor,
      subject: note.subject,
      content: note.content,
      isErrors: req.method === 'POST' && isInvalid(note),
      isEditable: canEdit(req, note),
      isMine: isMyNote(req, note),
      submitLink: req.originalUrl,
      deleteLink,
    }));
  });
}

router.get('/notes/simfile/:fileId/add.html', function(req, res, next) {
  getSimfile(req, res, simfile => {
    let note = new req.db.SimFileNote({ _simFile: simfile, _contributor: req.user });
    doEditSimfileNote(req, res, note);
  });
});

function redirectToSimfile(req, res, simfile) {
  res.redirect(303, '/simfiles/' + simfile._id + '/#notes');
}

router.post('/notes/simfile/:fileId/add.html', verified, function(req, res, next) {
  getSimfile(req, res, simfile => {
    let subject = req.body.subject,
        content = req.body.content;
    if (subject != null)
      subject = subject.trim();
    if (content != null)
      content = content.trim();

    let note = new req.db.SimFileNote({
      _simFile: simfile,
      _contributor: req.user,
      subject,
      content,
    });

    if (isInvalid(note) || req.body.preview) {
      doEditSimfileNote(req, res, note);
      return;
    }

    note.save(req.success(function(updated) {
      redirectToSimfile(req, res, updated._simFile);
    }));
  });
});

/**
 * /notes/simfile/:id/edit.html
 * Edit an existing simfile note.
 */
function getSimfileNote(req, res, submit, cb) {
  if (!req.db.isId(req.params.id)) {
    res.status(404).send('invalid simfile note');
    return;
  }
  req.db.SimFileNote.findOne({ _id: req.params.id })
                  .populate('_simFile _contributor')
                  .exec(req.success(note => {
    if (note == null) {
      res.status(404).send('invalid simfile note');
      return;
    }
    if (submit && !canEdit(req, note)) {
      res.status(401).send('cannot edit note');
      return;
    }
    cb(note);
  }));
}

router.get('/notes/simfile/:id/edit.html', function(req, res, next) {
  getSimfileNote(req, res, false, note => doEditSimfileNote(req, res, note));
});

router.post('/notes/simfile/:id/edit.html', function(req, res, next) {
  getSimfileNote(req, res, true, note => {
    let subject = req.body.subject,
        content = req.body.content;
    if (subject != null)
      subject = subject.trim();
    if (content != null)
      content = content.trim();
    note.subject = subject;
    note.content = content;

    if (isInvalid(note) || req.body.preview) {
      doEditSimfileNote(req, res, note);
      return;
    }

    note.save(req.success(function(updated) {
      redirectToSimfile(req, res, updated._simFile);
    }));
  });
});

/**
 * /notes/simfile/:id/delete.html
 * Delete a simfile note.
 */
router.get('/notes/simfile/:id/delete.html', function(req, res, next) {
  getSimfileNote(req, res, true, note => {
    req.db.SimFileNote.deleteOne({ _id: note._id }, req.success(() => {
      redirectToSimfile(req, res, note._simFile);
    }));
  });
});


module.exports = router;
