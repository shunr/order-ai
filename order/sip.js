'use strict';

const sipster = require('sipster');

let mod = module.exports = {};

mod.init = (callback) => {
  sipster.init({logConfig: {consoleLevel: 0}});
  let transport = new sipster.Transport({ port: 10908 });
  let acct = new sipster.Account({
    idUri: 'sip:localhost',
  });
  acct.on('call', function(info, call) {
    callback(info, call);
  });
  sipster.start();
}



