#!/usr/bin/env node
import './dist/bin.js';

/*
There's a bit of a chicken and egg problem in this repo. When the repo is
checked out, the first thing that must be done is to install dependencies. But,
the root package depends on the ./candr package, which has an executable script
output that has not been built yet. So, the install fails to create the root
node_modules/.bin/candr link to the ./candr/dist/bin.js file, which doesn't
exist yet. This script serves as an always existing proxy to the actual bin.js
file to avoid that problem.
*/
