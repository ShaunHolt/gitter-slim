'use strict';

var log = require('loglevel');
var events = require('../utils/custom-events');
var CLIENT = require('../utils/client-type');

// recursively assembles menus and sub-menus
function assembleMenu(items, parent) {
  var fold;

  parent = parent ? parent : new nw.Menu();

  items.forEach(function (item) {
    // means that we have a submenu
    if (item.content && item.content.length > 0) {
      var submenu = new nw.Menu();
      fold = assembleMenu(item.content, submenu);
    } else {
      fold = new nw.MenuItem(item);
    }

    if (fold.type === 'contextmenu') {
      item.submenu = fold;
      fold = new nw.MenuItem(item);
    }

    if (item.index && CLIENT === 'osx') {
      parent.insert(fold, item.index); // inserting at specified index
    } else {
      parent.append(fold); // just append
    }
  });

  return parent;
}

function CustomMenu(spec) {
  this.menu = new nw.Menu({ type: 'menubar' });
  this.generateMenuItems = spec.generateMenuItems || function() { return []; };
  this.filter = spec.filter;
  this.label = spec.label;

  events.on('user:signedIn', this.build.bind(this));
  events.on('user:signedOut', this.build.bind(this));
  events.on('preferences:saved', this.build.bind(this));

  this.build(); // initial render

  return this;
}

// FIXME: this function will probably not work for all platforms
CustomMenu.prototype.clear = function () {
  for (var i = this.menu.items.length - 1; i >= 0; i--) {
    this.menu.removeAt(i);
  }
};

CustomMenu.prototype.build = function () {
  log.trace('menu:build');
  this.clear(); // clear the menu on every "render"

  var filteredItems = this.generateMenuItems();
  if (this.filter && typeof this.filter === 'function') {
    filteredItems = filteredItems.filter(this.filter);
  }

  // note that we have different targets based on OS
  switch (CLIENT) {
    case 'osx':
      this.menu.createMacBuiltin(this.label);
      assembleMenu(filteredItems, this.menu.items[0].submenu);
      break;
    default:
      var sub = new nw.Menu();
      assembleMenu(filteredItems, sub);
      this.menu.append(new nw.MenuItem({
        label: this.label,
        submenu: sub
      }));
      log.trace('menu:build new menu', this.menu);
      break;
  }
  events.emit('menu:updated');
};

CustomMenu.prototype.get = function () {
  return this.menu;
};

module.exports = CustomMenu;
