#!/bin/sh

db=thrustcurve
if [ $# -eq 1 ]; then
  db="$1"
fi
echo "Dropping all collections in $db..."

exec mongo localhost << _EOF_
use $db
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
db.favoritemotors.drop()
db.guideresults.drop()
_EOF_
