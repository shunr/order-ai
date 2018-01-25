'use strict'

const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080, path: '/orders' });

let mod = module.exports = {};

mod.broadcast = (data) => {
  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};
