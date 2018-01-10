'use strict';

const sipster = require('sipster');

let mod = module.exports = {};

mod.init = (callbacks) => {
  sipster.init({logConfig: {consoleLevel: 10}});
  let transport = new sipster.Transport({ port: 5060 });
  let acct = new sipster.Account({
    idUri: 'sip:oai@sip2sip.info',
    regConfig: {
      registrarUri: 'sip:sip2sip.info',
      timeoutSec: 300,
      proxyUse: 2
    },
    sipConfig: {
      authCreds: [{
        scheme: 'digest',
        realm: '*',
        username: 'oai',
        dataType: 0, // plain text password
        data: 'negro420'
      }],
      proxies: ['sip:proxy.sipthor.net'],
      transport: transport
    }
  });
  listen(acct, callbacks);
  sipster.start();
}


function listen(acct, callbacks) {
  acct.on('call', function(info, call) {
    console.log('=== Incoming call from ' + info.remoteContact);
    for (let event in callbacks) {
      call.on(event, callbacks[event]);
    }
    call.answer();
  });
}

