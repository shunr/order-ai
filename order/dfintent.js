'use strict';

const sipster = require('sipster');
const fs = require('fs');

let mod = module.exports = {};

const intents = {
  NEW: "order.new",
  REMOVE: "order.remove",
  CONFIRM: "order.confirm"
};

let parsers = {
  [intents.NEW]: parseOrder,
  [intents.REMOVE]: parseOrder,
  [intents.CONFIRM]: parseConfirmation
};

function parseOrder(parameters) {
  let order = [];
  try {
    let values = parameters.fields.orderItem.listValue.values;
    for (let i = 0; i < values.length; i++) {
      let fields = values[i].structValue.fields;
      if (!fields.menu_item) continue;
      let item = {
        name: fields.menu_item.stringValue,
        amount: (fields.amount != null) ? fields.amount.numberValue : 1
      };
      order.push(item);
    }
  } catch (error) {
    console.error('Could not parse order');
  }
  console.log(order);
  return (order.length > 0) ? order : null;
}

function parseConfirmation(parameters) {
  let confirmed = false;
  try {
    confirmed = parameters.fields.confirmation.stringValue == 'yes';
  } catch (error) {
    console.error('Could not parse confirmation');
    confirmed = null;
  }
  return confirmed;
}

mod.intents = intents;
mod.parsers = parsers;