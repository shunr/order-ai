'use strict';

const sipster = require('sipster');
const fs = require('fs');
const uuid = require('uuid/v4');

const nlp = require('./nlp');
const setup = require('./setup');
const dfintent = require('./dfintent');
const sip = require('./sip');
const server = require('./server');

const timeout = ms => new Promise(res => setTimeout(res, ms));

let mod = module.exports = {};

mod.init = () => {
  setup.initEntities();
  sip.init(listen);
}

function listen(info, call) {
  console.log('=== Incoming call from ' + info.remoteContact);
  console.log(info);
  let filename = '/tmp/' + uuid() + '.wav';
  
  call.on('media', async (medias) => {
    const stream = medias[0];
    let items = [];
    
    sendTTS('May I take your order?', stream);
    while (true) {
      let add = await getResponse(filename, stream, dfintent.intents.NEW);
      await sendTTS('You want to add ' + nlp.orderToString(add) + ', is that correct?', stream);
      let confirm = await getResponse(filename, stream, dfintent.intents.CONFIRM);
      if (!confirm) {
        await sendTTS('Okay! What would you like instead?', stream);
        continue;
      }
      items.push(...add);
      await sendTTS('Your order is now' + nlp.orderToString(items) + '. Is that all?', stream);
      let more = await getResponse(filename, stream, dfintent.intents.CONFIRM);
      if (more) {
        break;
      } else {
        await sendTTS('Sure! What else would you like?', stream);
      }
    }
    let order = {
      items: items,
      contact: info.remoteContact,
      total: 0
    }
    console.log(order);
    server.broadcast(order);
    await sendTTS('Great! Order will be ready in 10 minutes. Goodbye!', stream);
    await timeout(1000);
    call.hangup();
  });
  
  call.on('state', (state) => {
    if (state == 'disconnected') {
      console.log('Call finished');
      deleteFile(filename);
    }
  });
  call.answer();
}

function getResponse(callFile, stream, ...intents) {
  let p = new Promise(async (resolve) => {
    let response = null;
    while (response == null) {
      let recorder = sipster.createRecorder(callFile);
      let error = null;
      stream.startTransmitTo(recorder);
      try {
        let [intent, parameters] = await nlp.analyzeSpeech(callFile);
        console.log(intent);
        if (intents.includes(intent)) {
          response = (intents.includes(intent)) ? dfintent.parsers[intent](parameters) : null;
        } else {
          response = null;
        }
      } catch (err) {
        console.error(err);
        //TODO: prompt if response null but no nlp error
        error = err;
      }
      stream.stopTransmitTo(recorder);
      recorder.close();
      if (response == null) {
        if (error == nlp.error.NO_INTENT) {
          await endTTS('Sorry, could you repeat that?', stream);
        } else {
          await sendTTS('I didn\'t get your order. Please try again.', stream);
        }
      }
    }
    resolve(response);
  });
  return p;
}

function processIntent(intent, parameters, intents) {
  if (!intents.includes(intent)) return null;
  return dfintent.parsers[intent];
}

function sendTTS(text, stream) {
  let p = new Promise(async (resolve) => {
    let filename = await nlp.tts(text);
    if (filename) {
      sendAudio(filename, stream, resolve);
    }
  });
  return p;
}

async function deleteFile(filename) {
  fs.unlinkSync(filename);
}

function sendAudio(filename, stream, callback) {
  if (filename == null) return;
  let player = sipster.createPlayer(filename, true);
  player.startTransmitTo(stream);
  player.on('eof', () => {
    callback();
    deleteFile(filename);
  });
}