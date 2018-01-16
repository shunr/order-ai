'use strict';

const menu = require('../menu.json');

let mod = module.exports = {};

mod.generateEntities = () => {
    let entities = [];
    let parent = {
        name: 'menu_item',
        entries: [],
        isEnum: true,
    }
    for (let category in menu) {
        parent.entries.push(newEntry('@' + category, false));
        let entries = [];
        for (let i = 0; i < menu[category].length; i++) {
            let item = menu[category][i];
            entries.push(newEntry(item, true));
        }
        entities.push({
            name: category,
            entries: entries
        });
    }
    entities.push(parent);
    return entities;
}

mod.generateSpeechContext = () => {
    let context = {
        phrases: ['one', 'two', 'three', 'four', 'five', 'six']
    };
    for (let category in menu) {
        for (let i = 0; i < menu[category].length; i++) {
            let item = menu[category][i];
            context.phrases.push(item);
        }
    }
    return context;
}

function newEntry(value, useSynonyms) {
    let entry = {
      value: value
    }
    if (useSynonyms) {
      entry.synonyms = getSynonyms(value);
    }
    return entry;
}

function getSynonyms(name) {
    let synonyms = [name];
    if (name.charAt(name.length - 1) != 's') {
        synonyms.push(name + 's');
    }
    return synonyms;
}