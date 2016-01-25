#!/bin/sh

exec mongo localhost << _EOF_
use thrustcurve
db.manufacturers.drop()
db.certorgs.drop()
db.motors.drop()
db.contributors.drop()
db.motornotes.drop()
db.simfiles.drop()
db.simfilenotes.drop()
db.rockets.drop()
db.motorviews.drop()
db.motorrankings.drop()
_EOF_
