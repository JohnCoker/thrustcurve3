# Analysis and Simulation

This directory contains code used for parsing simulator data files and running simulations.

## Analyze

The __analyze__ module produces meta-information from parsed motor data.
First the simulator files must be parsed using the __parsers__ module, then they
can be examined with functions in this module.

## Flight Simulation

The __flightsim__ module implements a quick-and-dirty rocket flight simulator based on
simple assumptions, notably sub-Mach flight near mean sea level.
The intention is not to replace full flight simulation products, but to perform
quick simulations to ensure that a motor can safely be used in a rocket.

## Parsers

The __parsers__ module contains code to parse simulator data files in various formats.
Not only do simulator data files such as RASP and RockSim contain thrust curve data
points, they also contain meta information.
