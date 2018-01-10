'use strict';

const speech = require('@google-cloud/speech');
const record = require('node-record-lpcm16');
const sipster = require('sipster');
const fs = require('fs');

const nlp = require('./nlp');
const setup = require('./setup');
const menu = require('./menu_parser');
const sip = require('./sip');

const client = new speech.SpeechClient();

const config = {
  encoding: 'MULAW',
  sampleRateHertz: 16000,
  languageCode: 'en-US',
  maxAlternatives: 1,
  speechContexts: [menu.generateSpeechContext()],
};

const recordConfig = {
  sampleRateHertz: 16000,
  threshold: 0.2,
  // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
  verbose: false,
  recordProgram: 'rec',
  silence: '5.0'
};

let callbacks = {
  state: (state) => {
    console.log('=== Call state is now: ' + state.toUpperCase());
  },
  dtmf: (digit) => {
    console.log('=== DTMF digit received: ' + digit);
  },
  media: (medias) => {
    console.log("Media");
    let player = sipster.createPlayer('./order/sound.wav', true);
    player.startTransmitTo(medias[0]);
    let recorder = sipster.createRecorder('./call.wav');
    medias[0].startTransmitTo(recorder);
    setTimeout(() => {
      medias[0].stopTransmitTo(recorder);
      recorder.close();
      createSpeechStream('./call.wav');
    }, 6000);
  }
};

let mod = module.exports = {};

let recordingTimeout;

function createSpeechStream(filename) {
  console.log("Processing");
  const audio = {
    content: fs.readFileSync(filename).toString('base64'),
  };
  const request = {
    config: config,
    audio: audio,
  };
  let stream = client.recognize(request)
    .then((data) => {
      console.log(data[0]);
      if (data[0].results[0] && data[0].results[0].alternatives[0]) {
        console.log(data[0].results[0].alternatives[0].transcript);
        nlp.processText(data[0].results[0].alternatives[0].transcript);
      } else {
        //record.stop();
      }
    });
}

mod.init = () => {
  setup.initEntities();
  //recordSegment();
  sip.init(callbacks);
  console.log('Listening, press Ctrl+C to stop.');
}

/*function recordSegment() {
  record.start(recordConfig)
    .on('error', console.error)
    .on('finish', function () {
      console.log('Done recording');
      clearTimeout(recordingTimeout);
    }).pipe(createSpeechStream());
  clearTimeout(recordingTimeout);
  recordingTimeout = setTimeout(function () {
    record.stop();
  }, 60 * 1000);
}*/