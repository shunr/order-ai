'use strict';

const sipster = require('sipster');
const fs = require('fs');
const uuid = require('uuid/v4');

const nlp = require('./nlp');
const setup = require('./setup');
const sip = require('./sip');

let mod = module.exports = {};

mod.init = () => {
  setup.initEntities();
  sip.init(listen);
  console.log('Listening, press Ctrl+C to stop.');
}

function listen(info, call) {
  console.log('=== Incoming call from ' + info.remoteContact);
  let filename = '/tmp/' + uuid() + '.wav';
  call.on('media', (medias) => {
    console.log("Media");
    let player = sipster.createPlayer('./order/sound.wav', true);
    player.startTransmitTo(medias[0]);
    let recorder = sipster.createRecorder(filename);
    medias[0].startTransmitTo(recorder);
    nlp.analyzeSpeech(filename).then((parameters) => {
      medias[0].stopTransmitTo(recorder);
      recorder.close();
    }).catch((msg) => {
      console.log('rip');
    });
    call.once('dtmf', (digit) => {
      medias[0].stopTransmitTo(recorder);
      recorder.close();
      /*.then((outputFile) => {
        //console.log(outputFile);
        let p = sipster.createPlayer(outputFile, true);
        p.startTransmitTo(medias[0]);
      }).catch((err) => {
        console.log("Error: " + err);
      });*/
    });
  });
  call.on('state', (state) => {
    if (state == 'disconnected') {
      console.log('call finished');
      fs.unlinkSync(filename);
    }
  });
  call.answer();
}