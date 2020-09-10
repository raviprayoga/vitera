(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
/* jshint node: true */
'use strict';

var normalice = require('normalice');

/**
  # freeice

  The `freeice` module is a simple way of getting random STUN or TURN server
  for your WebRTC application.  The list of servers (just STUN at this stage)
  were sourced from this [gist](https://gist.github.com/zziuni/3741933).

  ## Example Use

  The following demonstrates how you can use `freeice` with
  [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect):

  <<< examples/quickconnect.js

  As the `freeice` module generates ice servers in a list compliant with the
  WebRTC spec you will be able to use it with raw `RTCPeerConnection`
  constructors and other WebRTC libraries.

  ## Hey, don't use my STUN/TURN server!

  If for some reason your free STUN or TURN server ends up in the
  list of servers ([stun](https://github.com/DamonOehlman/freeice/blob/master/stun.json) or
  [turn](https://github.com/DamonOehlman/freeice/blob/master/turn.json))
  that is used in this module, you can feel
  free to open an issue on this repository and those servers will be removed
  within 24 hours (or sooner).  This is the quickest and probably the most
  polite way to have something removed (and provides us some visibility
  if someone opens a pull request requesting that a server is added).

  ## Please add my server!

  If you have a server that you wish to add to the list, that's awesome! I'm
  sure I speak on behalf of a whole pile of WebRTC developers who say thanks.
  To get it into the list, feel free to either open a pull request or if you
  find that process a bit daunting then just create an issue requesting
  the addition of the server (make sure you provide all the details, and if
  you have a Terms of Service then including that in the PR/issue would be
  awesome).

  ## I know of a free server, can I add it?

  Sure, if you do your homework and make sure it is ok to use (I'm currently
  in the process of reviewing the terms of those STUN servers included from
  the original list).  If it's ok to go, then please see the previous entry
  for how to add it.

  ## Current List of Servers

  * current as at the time of last `README.md` file generation

  ### STUN

  <<< stun.json

  ### TURN

  <<< turn.json

**/

var freeice = function(opts) {
  // if a list of servers has been provided, then use it instead of defaults
  var servers = {
    stun: (opts || {}).stun || require('./stun.json'),
    turn: (opts || {}).turn || require('./turn.json')
  };

  var stunCount = (opts || {}).stunCount || 2;
  var turnCount = (opts || {}).turnCount || 0;
  var selected;

  function getServers(type, count) {
    var out = [];
    var input = [].concat(servers[type]);
    var idx;

    while (input.length && out.length < count) {
      idx = (Math.random() * input.length) | 0;
      out = out.concat(input.splice(idx, 1));
    }

    return out.map(function(url) {
        //If it's a not a string, don't try to "normalice" it otherwise using type:url will screw it up
        if ((typeof url !== 'string') && (! (url instanceof String))) {
            return url;
        } else {
            return normalice(type + ':' + url);
        }
    });
  }

  // add stun servers
  selected = [].concat(getServers('stun', stunCount));

  if (turnCount) {
    selected = selected.concat(getServers('turn', turnCount));
  }

  return selected;
};

module.exports = freeice;
},{"./stun.json":3,"./turn.json":4,"normalice":7}],3:[function(require,module,exports){
module.exports=[
  "stun.l.google.com:19302",
  "stun1.l.google.com:19302",
  "stun2.l.google.com:19302",
  "stun3.l.google.com:19302",
  "stun4.l.google.com:19302",
  "stun.ekiga.net",
  "stun.ideasip.com",
  "stun.schlund.de",
  "stun.stunprotocol.org:3478",
  "stun.voiparound.com",
  "stun.voipbuster.com",
  "stun.voipstunt.com",
  "stun.voxgratia.org"
]

},{}],4:[function(require,module,exports){
module.exports=[]

},{}],5:[function(require,module,exports){
var WildEmitter = require('wildemitter');

function getMaxVolume (analyser, fftBins) {
  var maxVolume = -Infinity;
  analyser.getFloatFrequencyData(fftBins);

  for(var i=4, ii=fftBins.length; i < ii; i++) {
    if (fftBins[i] > maxVolume && fftBins[i] < 0) {
      maxVolume = fftBins[i];
    }
  };

  return maxVolume;
}


var audioContextType;
if (typeof window !== 'undefined') {
  audioContextType = window.AudioContext || window.webkitAudioContext;
}
// use a single audio context due to hardware limits
var audioContext = null;
module.exports = function(stream, options) {
  var harker = new WildEmitter();

  // make it not break in non-supported browsers
  if (!audioContextType) return harker;

  //Config
  var options = options || {},
      smoothing = (options.smoothing || 0.1),
      interval = (options.interval || 50),
      threshold = options.threshold,
      play = options.play,
      history = options.history || 10,
      running = true;

  // Ensure that just a single AudioContext is internally created
  audioContext = options.audioContext || audioContext || new audioContextType();

  var sourceNode, fftBins, analyser;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = smoothing;
  fftBins = new Float32Array(analyser.frequencyBinCount);

  if (stream.jquery) stream = stream[0];
  if (stream instanceof HTMLAudioElement || stream instanceof HTMLVideoElement) {
    //Audio Tag
    sourceNode = audioContext.createMediaElementSource(stream);
    if (typeof play === 'undefined') play = true;
    threshold = threshold || -50;
  } else {
    //WebRTC Stream
    sourceNode = audioContext.createMediaStreamSource(stream);
    threshold = threshold || -50;
  }

  sourceNode.connect(analyser);
  if (play) analyser.connect(audioContext.destination);

  harker.speaking = false;

  harker.suspend = function() {
    return audioContext.suspend();
  }
  harker.resume = function() {
    return audioContext.resume();
  }
  Object.defineProperty(harker, 'state', { get: function() {
    return audioContext.state;
  }});
  audioContext.onstatechange = function() {
    harker.emit('state_change', audioContext.state);
  }

  harker.setThreshold = function(t) {
    threshold = t;
  };

  harker.setInterval = function(i) {
    interval = i;
  };

  harker.stop = function() {
    running = false;
    harker.emit('volume_change', -100, threshold);
    if (harker.speaking) {
      harker.speaking = false;
      harker.emit('stopped_speaking');
    }
    analyser.disconnect();
    sourceNode.disconnect();
  };
  harker.speakingHistory = [];
  for (var i = 0; i < history; i++) {
      harker.speakingHistory.push(0);
  }

  // Poll the analyser node to determine if speaking
  // and emit events if changed
  var looper = function() {
    setTimeout(function() {

      //check if stop has been called
      if(!running) {
        return;
      }

      var currentVolume = getMaxVolume(analyser, fftBins);

      harker.emit('volume_change', currentVolume, threshold);

      var history = 0;
      if (currentVolume > threshold && !harker.speaking) {
        // trigger quickly, short history
        for (var i = harker.speakingHistory.length - 3; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history >= 2) {
          harker.speaking = true;
          harker.emit('speaking');
        }
      } else if (currentVolume < threshold && harker.speaking) {
        for (var i = 0; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history == 0) {
          harker.speaking = false;
          harker.emit('stopped_speaking');
        }
      }
      harker.speakingHistory.shift();
      harker.speakingHistory.push(0 + (currentVolume > threshold));

      looper();
    }, interval);
  };
  looper();

  return harker;
}

},{"wildemitter":19}],6:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],7:[function(require,module,exports){
/**
  # normalice

  Normalize an ice server configuration object (or plain old string) into a format
  that is usable in all browsers supporting WebRTC.  Primarily this module is designed
  to help with the transition of the `url` attribute of the configuration object to
  the `urls` attribute.

  ## Example Usage

  <<< examples/simple.js

**/

var protocols = [
  'stun:',
  'turn:'
];

module.exports = function(input) {
  var url = (input || {}).url || input;
  var protocol;
  var parts;
  var output = {};

  // if we don't have a string url, then allow the input to passthrough
  if (typeof url != 'string' && (! (url instanceof String))) {
    return input;
  }

  // trim the url string, and convert to an array
  url = url.trim();

  // if the protocol is not known, then passthrough
  protocol = protocols[protocols.indexOf(url.slice(0, 5))];
  if (! protocol) {
    return input;
  }

  // now let's attack the remaining url parts
  url = url.slice(5);
  parts = url.split('@');

  output.username = input.username;
  output.credential = input.credential;
  // if we have an authentication part, then set the credentials
  if (parts.length > 1) {
    url = parts[1];
    parts = parts[0].split(':');

    // add the output credential and username
    output.username = parts[0];
    output.credential = (input || {}).credential || parts[1] || '';
  }

  output.url = protocol + url;
  output.urls = [ output.url ];

  return output;
};

},{}],8:[function(require,module,exports){
(function (global){
/*!
 * Platform.js <https://mths.be/platform>
 * Copyright 2014-2018 Benjamin Tan <https://bnjmnt4n.now.sh/>
 * Copyright 2011-2013 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <https://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object. */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object. */
  var oldRoot = root;

  /** Detect free variable `exports`. */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module`. */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root`. */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /**
   * Used as the maximum length of an array-like object.
   * See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
   * for more details.
   */
  var maxSafeInteger = Math.pow(2, 53) - 1;

  /** Regular expression to detect Opera. */
  var reOpera = /\bOpera/;

  /** Possible global object. */
  var thisBinding = this;

  /** Used for native method references. */
  var objectProto = Object.prototype;

  /** Used to check for own properties of an object. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to resolve the internal `[[Class]]` of values. */
  var toString = objectProto.toString;

  /*--------------------------------------------------------------------------*/

  /**
   * Capitalizes a string value.
   *
   * @private
   * @param {string} string The string to capitalize.
   * @returns {string} The capitalized string.
   */
  function capitalize(string) {
    string = String(string);
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * A utility function to clean up the OS name.
   *
   * @private
   * @param {string} os The OS name to clean up.
   * @param {string} [pattern] A `RegExp` pattern matching the OS name.
   * @param {string} [label] A label for the OS.
   */
  function cleanupOS(os, pattern, label) {
    // Platform tokens are defined at:
    // http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    // http://web.archive.org/web/20081122053950/http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    var data = {
      '10.0': '10',
      '6.4':  '10 Technical Preview',
      '6.3':  '8.1',
      '6.2':  '8',
      '6.1':  'Server 2008 R2 / 7',
      '6.0':  'Server 2008 / Vista',
      '5.2':  'Server 2003 / XP 64-bit',
      '5.1':  'XP',
      '5.01': '2000 SP1',
      '5.0':  '2000',
      '4.0':  'NT',
      '4.90': 'ME'
    };
    // Detect Windows version from platform tokens.
    if (pattern && label && /^Win/i.test(os) && !/^Windows Phone /i.test(os) &&
        (data = data[/[\d.]+$/.exec(os)])) {
      os = 'Windows ' + data;
    }
    // Correct character case and cleanup string.
    os = String(os);

    if (pattern && label) {
      os = os.replace(RegExp(pattern, 'i'), label);
    }

    os = format(
      os.replace(/ ce$/i, ' CE')
        .replace(/\bhpw/i, 'web')
        .replace(/\bMacintosh\b/, 'Mac OS')
        .replace(/_PowerPC\b/i, ' OS')
        .replace(/\b(OS X) [^ \d]+/i, '$1')
        .replace(/\bMac (OS X)\b/, '$1')
        .replace(/\/(\d)/, ' $1')
        .replace(/_/g, '.')
        .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
        .replace(/\bx86\.64\b/gi, 'x86_64')
        .replace(/\b(Windows Phone) OS\b/, '$1')
        .replace(/\b(Chrome OS \w+) [\d.]+\b/, '$1')
        .split(' on ')[0]
    );

    return os;
  }

  /**
   * An iteration utility for arrays and objects.
   *
   * @private
   * @param {Array|Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   */
  function each(object, callback) {
    var index = -1,
        length = object ? object.length : 0;

    if (typeof length == 'number' && length > -1 && length <= maxSafeInteger) {
      while (++index < length) {
        callback(object[index], index, object);
      }
    } else {
      forOwn(object, callback);
    }
  }

  /**
   * Trim and conditionally capitalize string values.
   *
   * @private
   * @param {string} string The string to format.
   * @returns {string} The formatted string.
   */
  function format(string) {
    string = trim(string);
    return /^(?:webOS|i(?:OS|P))/.test(string)
      ? string
      : capitalize(string);
  }

  /**
   * Iterates over an object's own properties, executing the `callback` for each.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function executed per own property.
   */
  function forOwn(object, callback) {
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }

  /**
   * Gets the internal `[[Class]]` of a value.
   *
   * @private
   * @param {*} value The value.
   * @returns {string} The `[[Class]]`.
   */
  function getClassOf(value) {
    return value == null
      ? capitalize(value)
      : toString.call(value).slice(8, -1);
  }

  /**
   * Host objects can return type values that are different from their actual
   * data type. The objects we are concerned with usually return non-primitive
   * types of "object", "function", or "unknown".
   *
   * @private
   * @param {*} object The owner of the property.
   * @param {string} property The property to check.
   * @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
   */
  function isHostType(object, property) {
    var type = object != null ? typeof object[property] : 'number';
    return !/^(?:boolean|number|string|undefined)$/.test(type) &&
      (type == 'object' ? !!object[property] : true);
  }

  /**
   * Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
   *
   * @private
   * @param {string} string The string to qualify.
   * @returns {string} The qualified string.
   */
  function qualify(string) {
    return String(string).replace(/([ -])(?!$)/g, '$1?');
  }

  /**
   * A bare-bones `Array#reduce` like utility function.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {*} The accumulated result.
   */
  function reduce(array, callback) {
    var accumulator = null;
    each(array, function(value, index) {
      accumulator = callback(accumulator, value, index, array);
    });
    return accumulator;
  }

  /**
   * Removes leading and trailing whitespace from a string.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} The trimmed string.
   */
  function trim(string) {
    return String(string).replace(/^ +| +$/g, '');
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new platform object.
   *
   * @memberOf platform
   * @param {Object|string} [ua=navigator.userAgent] The user agent string or
   *  context object.
   * @returns {Object} A platform object.
   */
  function parse(ua) {

    /** The environment context object. */
    var context = root;

    /** Used to flag when a custom context is provided. */
    var isCustomContext = ua && typeof ua == 'object' && getClassOf(ua) != 'String';

    // Juggle arguments.
    if (isCustomContext) {
      context = ua;
      ua = null;
    }

    /** Browser navigator object. */
    var nav = context.navigator || {};

    /** Browser user agent string. */
    var userAgent = nav.userAgent || '';

    ua || (ua = userAgent);

    /** Used to flag when `thisBinding` is the [ModuleScope]. */
    var isModuleScope = isCustomContext || thisBinding == oldRoot;

    /** Used to detect if browser is like Chrome. */
    var likeChrome = isCustomContext
      ? !!nav.likeChrome
      : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());

    /** Internal `[[Class]]` value shortcuts. */
    var objectClass = 'Object',
        airRuntimeClass = isCustomContext ? objectClass : 'ScriptBridgingProxyObject',
        enviroClass = isCustomContext ? objectClass : 'Environment',
        javaClass = (isCustomContext && context.java) ? 'JavaPackage' : getClassOf(context.java),
        phantomClass = isCustomContext ? objectClass : 'RuntimeObject';

    /** Detect Java environments. */
    var java = /\bJava/.test(javaClass) && context.java;

    /** Detect Rhino. */
    var rhino = java && getClassOf(context.environment) == enviroClass;

    /** A character to represent alpha. */
    var alpha = java ? 'a' : '\u03b1';

    /** A character to represent beta. */
    var beta = java ? 'b' : '\u03b2';

    /** Browser document object. */
    var doc = context.document || {};

    /**
     * Detect Opera browser (Presto-based).
     * http://www.howtocreate.co.uk/operaStuff/operaObject.html
     * http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
     */
    var opera = context.operamini || context.opera;

    /** Opera `[[Class]]`. */
    var operaClass = reOpera.test(operaClass = (isCustomContext && opera) ? opera['[[Class]]'] : getClassOf(opera))
      ? operaClass
      : (opera = null);

    /*------------------------------------------------------------------------*/

    /** Temporary variable used over the script's lifetime. */
    var data;

    /** The CPU architecture. */
    var arch = ua;

    /** Platform description array. */
    var description = [];

    /** Platform alpha/beta indicator. */
    var prerelease = null;

    /** A flag to indicate that environment features should be used to resolve the platform. */
    var useFeatures = ua == userAgent;

    /** The browser/environment version. */
    var version = useFeatures && opera && typeof opera.version == 'function' && opera.version();

    /** A flag to indicate if the OS ends with "/ Version" */
    var isSpecialCasedOS;

    /* Detectable layout engines (order is important). */
    var layout = getLayout([
      { 'label': 'EdgeHTML', 'pattern': 'Edge' },
      'Trident',
      { 'label': 'WebKit', 'pattern': 'AppleWebKit' },
      'iCab',
      'Presto',
      'NetFront',
      'Tasman',
      'KHTML',
      'Gecko'
    ]);

    /* Detectable browser names (order is important). */
    var name = getName([
      'Adobe AIR',
      'Arora',
      'Avant Browser',
      'Breach',
      'Camino',
      'Electron',
      'Epiphany',
      'Fennec',
      'Flock',
      'Galeon',
      'GreenBrowser',
      'iCab',
      'Iceweasel',
      'K-Meleon',
      'Konqueror',
      'Lunascape',
      'Maxthon',
      { 'label': 'Microsoft Edge', 'pattern': 'Edge' },
      'Midori',
      'Nook Browser',
      'PaleMoon',
      'PhantomJS',
      'Raven',
      'Rekonq',
      'RockMelt',
      { 'label': 'Samsung Internet', 'pattern': 'SamsungBrowser' },
      'SeaMonkey',
      { 'label': 'Silk', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Sleipnir',
      'SlimBrowser',
      { 'label': 'SRWare Iron', 'pattern': 'Iron' },
      'Sunrise',
      'Swiftfox',
      'Waterfox',
      'WebPositive',
      'Opera Mini',
      { 'label': 'Opera Mini', 'pattern': 'OPiOS' },
      'Opera',
      { 'label': 'Opera', 'pattern': 'OPR' },
      'Chrome',
      { 'label': 'Chrome Mobile', 'pattern': '(?:CriOS|CrMo)' },
      { 'label': 'Firefox', 'pattern': '(?:Firefox|Minefield)' },
      { 'label': 'Firefox for iOS', 'pattern': 'FxiOS' },
      { 'label': 'IE', 'pattern': 'IEMobile' },
      { 'label': 'IE', 'pattern': 'MSIE' },
      'Safari'
    ]);

    /* Detectable products (order is important). */
    var product = getProduct([
      { 'label': 'BlackBerry', 'pattern': 'BB10' },
      'BlackBerry',
      { 'label': 'Galaxy S', 'pattern': 'GT-I9000' },
      { 'label': 'Galaxy S2', 'pattern': 'GT-I9100' },
      { 'label': 'Galaxy S3', 'pattern': 'GT-I9300' },
      { 'label': 'Galaxy S4', 'pattern': 'GT-I9500' },
      { 'label': 'Galaxy S5', 'pattern': 'SM-G900' },
      { 'label': 'Galaxy S6', 'pattern': 'SM-G920' },
      { 'label': 'Galaxy S6 Edge', 'pattern': 'SM-G925' },
      { 'label': 'Galaxy S7', 'pattern': 'SM-G930' },
      { 'label': 'Galaxy S7 Edge', 'pattern': 'SM-G935' },
      'Google TV',
      'Lumia',
      'iPad',
      'iPod',
      'iPhone',
      'Kindle',
      { 'label': 'Kindle Fire', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Nexus',
      'Nook',
      'PlayBook',
      'PlayStation Vita',
      'PlayStation',
      'TouchPad',
      'Transformer',
      { 'label': 'Wii U', 'pattern': 'WiiU' },
      'Wii',
      'Xbox One',
      { 'label': 'Xbox 360', 'pattern': 'Xbox' },
      'Xoom'
    ]);

    /* Detectable manufacturers. */
    var manufacturer = getManufacturer({
      'Apple': { 'iPad': 1, 'iPhone': 1, 'iPod': 1 },
      'Archos': {},
      'Amazon': { 'Kindle': 1, 'Kindle Fire': 1 },
      'Asus': { 'Transformer': 1 },
      'Barnes & Noble': { 'Nook': 1 },
      'BlackBerry': { 'PlayBook': 1 },
      'Google': { 'Google TV': 1, 'Nexus': 1 },
      'HP': { 'TouchPad': 1 },
      'HTC': {},
      'LG': {},
      'Microsoft': { 'Xbox': 1, 'Xbox One': 1 },
      'Motorola': { 'Xoom': 1 },
      'Nintendo': { 'Wii U': 1,  'Wii': 1 },
      'Nokia': { 'Lumia': 1 },
      'Samsung': { 'Galaxy S': 1, 'Galaxy S2': 1, 'Galaxy S3': 1, 'Galaxy S4': 1 },
      'Sony': { 'PlayStation': 1, 'PlayStation Vita': 1 }
    });

    /* Detectable operating systems (order is important). */
    var os = getOS([
      'Windows Phone',
      'Android',
      'CentOS',
      { 'label': 'Chrome OS', 'pattern': 'CrOS' },
      'Debian',
      'Fedora',
      'FreeBSD',
      'Gentoo',
      'Haiku',
      'Kubuntu',
      'Linux Mint',
      'OpenBSD',
      'Red Hat',
      'SuSE',
      'Ubuntu',
      'Xubuntu',
      'Cygwin',
      'Symbian OS',
      'hpwOS',
      'webOS ',
      'webOS',
      'Tablet OS',
      'Tizen',
      'Linux',
      'Mac OS X',
      'Macintosh',
      'Mac',
      'Windows 98;',
      'Windows '
    ]);

    /*------------------------------------------------------------------------*/

    /**
     * Picks the layout engine from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected layout engine.
     */
    function getLayout(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the manufacturer from an array of guesses.
     *
     * @private
     * @param {Array} guesses An object of guesses.
     * @returns {null|string} The detected manufacturer.
     */
    function getManufacturer(guesses) {
      return reduce(guesses, function(result, value, key) {
        // Lookup the manufacturer by product or scan the UA for the manufacturer.
        return result || (
          value[product] ||
          value[/^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] ||
          RegExp('\\b' + qualify(key) + '(?:\\b|\\w*\\d)', 'i').exec(ua)
        ) && key;
      });
    }

    /**
     * Picks the browser name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected browser name.
     */
    function getName(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the OS name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected OS name.
     */
    function getOS(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua)
            )) {
          result = cleanupOS(result, pattern, guess.label || guess);
        }
        return result;
      });
    }

    /**
     * Picks the product name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected product name.
     */
    function getProduct(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + ' *\\d+[.\\w_]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + ' *\\w+-[\\w]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + '(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)', 'i').exec(ua)
            )) {
          // Split by forward slash and append product version if needed.
          if ((result = String((guess.label && !RegExp(pattern, 'i').test(guess.label)) ? guess.label : result).split('/'))[1] && !/[\d.]+/.test(result[0])) {
            result[0] += ' ' + result[1];
          }
          // Correct character case and cleanup string.
          guess = guess.label || guess;
          result = format(result[0]
            .replace(RegExp(pattern, 'i'), guess)
            .replace(RegExp('; *(?:' + guess + '[_-])?', 'i'), ' ')
            .replace(RegExp('(' + guess + ')[-_.]?(\\w)', 'i'), '$1 $2'));
        }
        return result;
      });
    }

    /**
     * Resolves the version using an array of UA patterns.
     *
     * @private
     * @param {Array} patterns An array of UA patterns.
     * @returns {null|string} The detected version.
     */
    function getVersion(patterns) {
      return reduce(patterns, function(result, pattern) {
        return result || (RegExp(pattern +
          '(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)', 'i').exec(ua) || 0)[1] || null;
      });
    }

    /**
     * Returns `platform.description` when the platform object is coerced to a string.
     *
     * @name toString
     * @memberOf platform
     * @returns {string} Returns `platform.description` if available, else an empty string.
     */
    function toStringPlatform() {
      return this.description || '';
    }

    /*------------------------------------------------------------------------*/

    // Convert layout to an array so we can add extra details.
    layout && (layout = [layout]);

    // Detect product names that contain their manufacturer's name.
    if (manufacturer && !product) {
      product = getProduct([manufacturer]);
    }
    // Clean up Google TV.
    if ((data = /\bGoogle TV\b/.exec(product))) {
      product = data[0];
    }
    // Detect simulators.
    if (/\bSimulator\b/i.test(ua)) {
      product = (product ? product + ' ' : '') + 'Simulator';
    }
    // Detect Opera Mini 8+ running in Turbo/Uncompressed mode on iOS.
    if (name == 'Opera Mini' && /\bOPiOS\b/.test(ua)) {
      description.push('running in Turbo/Uncompressed mode');
    }
    // Detect IE Mobile 11.
    if (name == 'IE' && /\blike iPhone OS\b/.test(ua)) {
      data = parse(ua.replace(/like iPhone OS/, ''));
      manufacturer = data.manufacturer;
      product = data.product;
    }
    // Detect iOS.
    else if (/^iP/.test(product)) {
      name || (name = 'Safari');
      os = 'iOS' + ((data = / OS ([\d_]+)/i.exec(ua))
        ? ' ' + data[1].replace(/_/g, '.')
        : '');
    }
    // Detect Kubuntu.
    else if (name == 'Konqueror' && !/buntu/i.test(os)) {
      os = 'Kubuntu';
    }
    // Detect Android browsers.
    else if ((manufacturer && manufacturer != 'Google' &&
        ((/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua)) || /\bVita\b/.test(product))) ||
        (/\bAndroid\b/.test(os) && /^Chrome/.test(name) && /\bVersion\//i.test(ua))) {
      name = 'Android Browser';
      os = /\bAndroid\b/.test(os) ? os : 'Android';
    }
    // Detect Silk desktop/accelerated modes.
    else if (name == 'Silk') {
      if (!/\bMobi/i.test(ua)) {
        os = 'Android';
        description.unshift('desktop mode');
      }
      if (/Accelerated *= *true/i.test(ua)) {
        description.unshift('accelerated');
      }
    }
    // Detect PaleMoon identifying as Firefox.
    else if (name == 'PaleMoon' && (data = /\bFirefox\/([\d.]+)\b/.exec(ua))) {
      description.push('identifying as Firefox ' + data[1]);
    }
    // Detect Firefox OS and products running Firefox.
    else if (name == 'Firefox' && (data = /\b(Mobile|Tablet|TV)\b/i.exec(ua))) {
      os || (os = 'Firefox OS');
      product || (product = data[1]);
    }
    // Detect false positives for Firefox/Safari.
    else if (!name || (data = !/\bMinefield\b/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
      // Escape the `/` for Firefox 1.
      if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + '/') + 8))) {
        // Clear name of false positives.
        name = null;
      }
      // Reassign a generic name.
      if ((data = product || manufacturer || os) &&
          (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) {
        name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + ' Browser';
      }
    }
    // Add Chrome version to description for Electron.
    else if (name == 'Electron' && (data = (/\bChrome\/([\d.]+)\b/.exec(ua) || 0)[1])) {
      description.push('Chromium ' + data);
    }
    // Detect non-Opera (Presto-based) versions (order is important).
    if (!version) {
      version = getVersion([
        '(?:Cloud9|CriOS|CrMo|Edge|FxiOS|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|SamsungBrowser|Silk(?!/[\\d.]+$))',
        'Version',
        qualify(name),
        '(?:Firefox|Minefield|NetFront)'
      ]);
    }
    // Detect stubborn layout engines.
    if ((data =
          layout == 'iCab' && parseFloat(version) > 3 && 'WebKit' ||
          /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? 'Blink' : 'Presto') ||
          /\b(?:Midori|Nook|Safari)\b/i.test(ua) && !/^(?:Trident|EdgeHTML)$/.test(layout) && 'WebKit' ||
          !layout && /\bMSIE\b/i.test(ua) && (os == 'Mac OS' ? 'Tasman' : 'Trident') ||
          layout == 'WebKit' && /\bPlayStation\b(?! Vita\b)/i.test(name) && 'NetFront'
        )) {
      layout = [data];
    }
    // Detect Windows Phone 7 desktop mode.
    if (name == 'IE' && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
      name += ' Mobile';
      os = 'Windows Phone ' + (/\+$/.test(data) ? data : data + '.x');
      description.unshift('desktop mode');
    }
    // Detect Windows Phone 8.x desktop mode.
    else if (/\bWPDesktop\b/i.test(ua)) {
      name = 'IE Mobile';
      os = 'Windows Phone 8.x';
      description.unshift('desktop mode');
      version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
    }
    // Detect IE 11 identifying as other browsers.
    else if (name != 'IE' && layout == 'Trident' && (data = /\brv:([\d.]+)/.exec(ua))) {
      if (name) {
        description.push('identifying as ' + name + (version ? ' ' + version : ''));
      }
      name = 'IE';
      version = data[1];
    }
    // Leverage environment features.
    if (useFeatures) {
      // Detect server-side environments.
      // Rhino has a global function while others have a global object.
      if (isHostType(context, 'global')) {
        if (java) {
          data = java.lang.System;
          arch = data.getProperty('os.arch');
          os = os || data.getProperty('os.name') + ' ' + data.getProperty('os.version');
        }
        if (rhino) {
          try {
            version = context.require('ringo/engine').version.join('.');
            name = 'RingoJS';
          } catch(e) {
            if ((data = context.system) && data.global.system == context.system) {
              name = 'Narwhal';
              os || (os = data[0].os || null);
            }
          }
          if (!name) {
            name = 'Rhino';
          }
        }
        else if (
          typeof context.process == 'object' && !context.process.browser &&
          (data = context.process)
        ) {
          if (typeof data.versions == 'object') {
            if (typeof data.versions.electron == 'string') {
              description.push('Node ' + data.versions.node);
              name = 'Electron';
              version = data.versions.electron;
            } else if (typeof data.versions.nw == 'string') {
              description.push('Chromium ' + version, 'Node ' + data.versions.node);
              name = 'NW.js';
              version = data.versions.nw;
            }
          }
          if (!name) {
            name = 'Node.js';
            arch = data.arch;
            os = data.platform;
            version = /[\d.]+/.exec(data.version);
            version = version ? version[0] : null;
          }
        }
      }
      // Detect Adobe AIR.
      else if (getClassOf((data = context.runtime)) == airRuntimeClass) {
        name = 'Adobe AIR';
        os = data.flash.system.Capabilities.os;
      }
      // Detect PhantomJS.
      else if (getClassOf((data = context.phantom)) == phantomClass) {
        name = 'PhantomJS';
        version = (data = data.version || null) && (data.major + '.' + data.minor + '.' + data.patch);
      }
      // Detect IE compatibility modes.
      else if (typeof doc.documentMode == 'number' && (data = /\bTrident\/(\d+)/i.exec(ua))) {
        // We're in compatibility mode when the Trident version + 4 doesn't
        // equal the document mode.
        version = [version, doc.documentMode];
        if ((data = +data[1] + 4) != version[1]) {
          description.push('IE ' + version[1] + ' mode');
          layout && (layout[1] = '');
          version[1] = data;
        }
        version = name == 'IE' ? String(version[1].toFixed(1)) : version[0];
      }
      // Detect IE 11 masking as other browsers.
      else if (typeof doc.documentMode == 'number' && /^(?:Chrome|Firefox)\b/.test(name)) {
        description.push('masking as ' + name + ' ' + version);
        name = 'IE';
        version = '11.0';
        layout = ['Trident'];
        os = 'Windows';
      }
      os = os && format(os);
    }
    // Detect prerelease phases.
    if (version && (data =
          /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) ||
          /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ';' + (useFeatures && nav.appMinorVersion)) ||
          /\bMinefield\b/i.test(ua) && 'a'
        )) {
      prerelease = /b/i.test(data) ? 'beta' : 'alpha';
      version = version.replace(RegExp(data + '\\+?$'), '') +
        (prerelease == 'beta' ? beta : alpha) + (/\d+\+?/.exec(data) || '');
    }
    // Detect Firefox Mobile.
    if (name == 'Fennec' || name == 'Firefox' && /\b(?:Android|Firefox OS)\b/.test(os)) {
      name = 'Firefox Mobile';
    }
    // Obscure Maxthon's unreliable version.
    else if (name == 'Maxthon' && version) {
      version = version.replace(/\.[\d.]+/, '.x');
    }
    // Detect Xbox 360 and Xbox One.
    else if (/\bXbox\b/i.test(product)) {
      if (product == 'Xbox 360') {
        os = null;
      }
      if (product == 'Xbox 360' && /\bIEMobile\b/.test(ua)) {
        description.unshift('mobile mode');
      }
    }
    // Add mobile postfix.
    else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) &&
        (os == 'Windows CE' || /Mobi/i.test(ua))) {
      name += ' Mobile';
    }
    // Detect IE platform preview.
    else if (name == 'IE' && useFeatures) {
      try {
        if (context.external === null) {
          description.unshift('platform preview');
        }
      } catch(e) {
        description.unshift('embedded');
      }
    }
    // Detect BlackBerry OS version.
    // http://docs.blackberry.com/en/developers/deliverables/18169/HTTP_headers_sent_by_BB_Browser_1234911_11.jsp
    else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data =
          (RegExp(product.replace(/ +/g, ' *') + '/([.\\d]+)', 'i').exec(ua) || 0)[1] ||
          version
        )) {
      data = [data, /BB10/.test(ua)];
      os = (data[1] ? (product = null, manufacturer = 'BlackBerry') : 'Device Software') + ' ' + data[0];
      version = null;
    }
    // Detect Opera identifying/masking itself as another browser.
    // http://www.opera.com/support/kb/view/843/
    else if (this != forOwn && product != 'Wii' && (
          (useFeatures && opera) ||
          (/Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua)) ||
          (name == 'Firefox' && /\bOS X (?:\d+\.){2,}/.test(os)) ||
          (name == 'IE' && (
            (os && !/^Win/.test(os) && version > 5.5) ||
            /\bWindows XP\b/.test(os) && version > 8 ||
            version == 8 && !/\bTrident\b/.test(ua)
          ))
        ) && !reOpera.test((data = parse.call(forOwn, ua.replace(reOpera, '') + ';'))) && data.name) {
      // When "identifying", the UA contains both Opera and the other browser's name.
      data = 'ing as ' + data.name + ((data = data.version) ? ' ' + data : '');
      if (reOpera.test(name)) {
        if (/\bIE\b/.test(data) && os == 'Mac OS') {
          os = null;
        }
        data = 'identify' + data;
      }
      // When "masking", the UA contains only the other browser's name.
      else {
        data = 'mask' + data;
        if (operaClass) {
          name = format(operaClass.replace(/([a-z])([A-Z])/g, '$1 $2'));
        } else {
          name = 'Opera';
        }
        if (/\bIE\b/.test(data)) {
          os = null;
        }
        if (!useFeatures) {
          version = null;
        }
      }
      layout = ['Presto'];
      description.push(data);
    }
    // Detect WebKit Nightly and approximate Chrome/Safari versions.
    if ((data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
      // Correct build number for numeric comparison.
      // (e.g. "532.5" becomes "532.05")
      data = [parseFloat(data.replace(/\.(\d)$/, '.0$1')), data];
      // Nightly builds are postfixed with a "+".
      if (name == 'Safari' && data[1].slice(-1) == '+') {
        name = 'WebKit Nightly';
        prerelease = 'alpha';
        version = data[1].slice(0, -1);
      }
      // Clear incorrect browser versions.
      else if (version == data[1] ||
          version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
        version = null;
      }
      // Use the full Chrome version when available.
      data[1] = (/\bChrome\/([\d.]+)/i.exec(ua) || 0)[1];
      // Detect Blink layout engine.
      if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && layout == 'WebKit') {
        layout = ['Blink'];
      }
      // Detect JavaScriptCore.
      // http://stackoverflow.com/questions/6768474/how-can-i-detect-which-javascript-engine-v8-or-jsc-is-used-at-runtime-in-androi
      if (!useFeatures || (!likeChrome && !data[1])) {
        layout && (layout[1] = 'like Safari');
        data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? '4+' : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : '8');
      } else {
        layout && (layout[1] = 'like Chrome');
        data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.10 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.30 ? 11 : data < 535.01 ? 12 : data < 535.02 ? '13+' : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.10 ? 19 : data < 537.01 ? 20 : data < 537.11 ? '21+' : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != 'Blink' ? '27' : '28');
      }
      // Add the postfix of ".x" or "+" for approximate versions.
      layout && (layout[1] += ' ' + (data += typeof data == 'number' ? '.x' : /[.+]/.test(data) ? '' : '+'));
      // Obscure version for some Safari 1-2 releases.
      if (name == 'Safari' && (!version || parseInt(version) > 45)) {
        version = data;
      }
    }
    // Detect Opera desktop modes.
    if (name == 'Opera' &&  (data = /\bzbov|zvav$/.exec(os))) {
      name += ' ';
      description.unshift('desktop mode');
      if (data == 'zvav') {
        name += 'Mini';
        version = null;
      } else {
        name += 'Mobile';
      }
      os = os.replace(RegExp(' *' + data + '$'), '');
    }
    // Detect Chrome desktop mode.
    else if (name == 'Safari' && /\bChrome\b/.exec(layout && layout[1])) {
      description.unshift('desktop mode');
      name = 'Chrome Mobile';
      version = null;

      if (/\bOS X\b/.test(os)) {
        manufacturer = 'Apple';
        os = 'iOS 4.3+';
      } else {
        os = null;
      }
    }
    // Strip incorrect OS versions.
    if (version && version.indexOf((data = /[\d.]+$/.exec(os))) == 0 &&
        ua.indexOf('/' + data + '-') > -1) {
      os = trim(os.replace(data, ''));
    }
    // Add layout engine.
    if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (
        /Browser|Lunascape|Maxthon/.test(name) ||
        name != 'Safari' && /^iOS/.test(os) && /\bSafari\b/.test(layout[1]) ||
        /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Samsung Internet|Sleipnir|Web)/.test(name) && layout[1])) {
      // Don't add layout details to description if they are falsey.
      (data = layout[layout.length - 1]) && description.push(data);
    }
    // Combine contextual information.
    if (description.length) {
      description = ['(' + description.join('; ') + ')'];
    }
    // Append manufacturer to description.
    if (manufacturer && product && product.indexOf(manufacturer) < 0) {
      description.push('on ' + manufacturer);
    }
    // Append product to description.
    if (product) {
      description.push((/^on /.test(description[description.length - 1]) ? '' : 'on ') + product);
    }
    // Parse the OS into an object.
    if (os) {
      data = / ([\d.+]+)$/.exec(os);
      isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == '/';
      os = {
        'architecture': 32,
        'family': (data && !isSpecialCasedOS) ? os.replace(data[0], '') : os,
        'version': data ? data[1] : null,
        'toString': function() {
          var version = this.version;
          return this.family + ((version && !isSpecialCasedOS) ? ' ' + version : '') + (this.architecture == 64 ? ' 64-bit' : '');
        }
      };
    }
    // Add browser/OS architecture.
    if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
      if (os) {
        os.architecture = 64;
        os.family = os.family.replace(RegExp(' *' + data), '');
      }
      if (
          name && (/\bWOW64\b/i.test(ua) ||
          (useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua)))
      ) {
        description.unshift('32-bit');
      }
    }
    // Chrome 39 and above on OS X is always 64-bit.
    else if (
        os && /^OS X/.test(os.family) &&
        name == 'Chrome' && parseFloat(version) >= 39
    ) {
      os.architecture = 64;
    }

    ua || (ua = null);

    /*------------------------------------------------------------------------*/

    /**
     * The platform object.
     *
     * @name platform
     * @type Object
     */
    var platform = {};

    /**
     * The platform description.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.description = ua;

    /**
     * The name of the browser's layout engine.
     *
     * The list of common layout engines include:
     * "Blink", "EdgeHTML", "Gecko", "Trident" and "WebKit"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.layout = layout && layout[0];

    /**
     * The name of the product's manufacturer.
     *
     * The list of manufacturers include:
     * "Apple", "Archos", "Amazon", "Asus", "Barnes & Noble", "BlackBerry",
     * "Google", "HP", "HTC", "LG", "Microsoft", "Motorola", "Nintendo",
     * "Nokia", "Samsung" and "Sony"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.manufacturer = manufacturer;

    /**
     * The name of the browser/environment.
     *
     * The list of common browser names include:
     * "Chrome", "Electron", "Firefox", "Firefox for iOS", "IE",
     * "Microsoft Edge", "PhantomJS", "Safari", "SeaMonkey", "Silk",
     * "Opera Mini" and "Opera"
     *
     * Mobile versions of some browsers have "Mobile" appended to their name:
     * eg. "Chrome Mobile", "Firefox Mobile", "IE Mobile" and "Opera Mobile"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.name = name;

    /**
     * The alpha/beta release indicator.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.prerelease = prerelease;

    /**
     * The name of the product hosting the browser.
     *
     * The list of common products include:
     *
     * "BlackBerry", "Galaxy S4", "Lumia", "iPad", "iPod", "iPhone", "Kindle",
     * "Kindle Fire", "Nexus", "Nook", "PlayBook", "TouchPad" and "Transformer"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.product = product;

    /**
     * The browser's user agent string.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.ua = ua;

    /**
     * The browser/environment version.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.version = name && version;

    /**
     * The name of the operating system.
     *
     * @memberOf platform
     * @type Object
     */
    platform.os = os || {

      /**
       * The CPU architecture the OS is built for.
       *
       * @memberOf platform.os
       * @type number|null
       */
      'architecture': null,

      /**
       * The family of the OS.
       *
       * Common values include:
       * "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
       * "Windows XP", "OS X", "Ubuntu", "Debian", "Fedora", "Red Hat", "SuSE",
       * "Android", "iOS" and "Windows Phone"
       *
       * @memberOf platform.os
       * @type string|null
       */
      'family': null,

      /**
       * The version of the OS.
       *
       * @memberOf platform.os
       * @type string|null
       */
      'version': null,

      /**
       * Returns the OS string.
       *
       * @memberOf platform.os
       * @returns {string} The OS string.
       */
      'toString': function() { return 'null'; }
    };

    platform.parse = parse;
    platform.toString = toStringPlatform;

    if (platform.version) {
      description.unshift(version);
    }
    if (platform.name) {
      description.unshift(name);
    }
    if (os && name && !(os == String(os).split(' ')[0] && (os == name.split(' ')[0] || product))) {
      description.push(product ? '(' + os + ')' : 'on ' + os);
    }
    if (description.length) {
      platform.description = description.join(' ');
    }
    return platform;
  }

  /*--------------------------------------------------------------------------*/

  // Export platform.
  var platform = parse();

  // Some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose platform on the global object to prevent errors when platform is
    // loaded by a script tag in the presence of an AMD loader.
    // See http://requirejs.org/docs/errors.html#mismatch for more details.
    root.platform = platform;

    // Define as an anonymous module so platform can be aliased through path mapping.
    define(function() {
      return platform;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
  else if (freeExports && freeModule) {
    // Export for CommonJS support.
    forOwn(platform, function(value, key) {
      freeExports[key] = value;
    });
  }
  else {
    // Export to the global object.
    root.platform = platform;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];

for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex; // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4

  return [bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]]].join('');
}

var _default = bytesToUuid;
exports.default = _default;
module.exports = exports.default;
},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "v1", {
  enumerable: true,
  get: function () {
    return _v.default;
  }
});
Object.defineProperty(exports, "v3", {
  enumerable: true,
  get: function () {
    return _v2.default;
  }
});
Object.defineProperty(exports, "v4", {
  enumerable: true,
  get: function () {
    return _v3.default;
  }
});
Object.defineProperty(exports, "v5", {
  enumerable: true,
  get: function () {
    return _v4.default;
  }
});

var _v = _interopRequireDefault(require("./v1.js"));

var _v2 = _interopRequireDefault(require("./v3.js"));

var _v3 = _interopRequireDefault(require("./v4.js"));

var _v4 = _interopRequireDefault(require("./v5.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
},{"./v1.js":14,"./v3.js":15,"./v4.js":17,"./v5.js":18}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/*
 * Browser-compatible JavaScript MD5
 *
 * Modification of JavaScript MD5
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */
function md5(bytes) {
  if (typeof bytes == 'string') {
    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = new Array(msg.length);

    for (var i = 0; i < msg.length; i++) bytes[i] = msg.charCodeAt(i);
  }

  return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
}
/*
 * Convert an array of little-endian words to an array of bytes
 */


function md5ToHexEncodedArray(input) {
  var i;
  var x;
  var output = [];
  var length32 = input.length * 32;
  var hexTab = '0123456789abcdef';
  var hex;

  for (i = 0; i < length32; i += 8) {
    x = input[i >> 5] >>> i % 32 & 0xff;
    hex = parseInt(hexTab.charAt(x >>> 4 & 0x0f) + hexTab.charAt(x & 0x0f), 16);
    output.push(hex);
  }

  return output;
}
/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */


function wordsToMd5(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << len % 32;
  x[(len + 64 >>> 9 << 4) + 14] = len;
  var i;
  var olda;
  var oldb;
  var oldc;
  var oldd;
  var a = 1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d = 271733878;

  for (i = 0; i < x.length; i += 16) {
    olda = a;
    oldb = b;
    oldc = c;
    oldd = d;
    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, x[i], 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  return [a, b, c, d];
}
/*
 * Convert an array bytes to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */


function bytesToWords(input) {
  var i;
  var output = [];
  output[(input.length >> 2) - 1] = undefined;

  for (i = 0; i < output.length; i += 1) {
    output[i] = 0;
  }

  var length8 = input.length * 8;

  for (i = 0; i < length8; i += 8) {
    output[i >> 5] |= (input[i / 8] & 0xff) << i % 32;
  }

  return output;
}
/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */


function safeAdd(x, y) {
  var lsw = (x & 0xffff) + (y & 0xffff);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return msw << 16 | lsw & 0xffff;
}
/*
 * Bitwise rotate a 32-bit number to the left.
 */


function bitRotateLeft(num, cnt) {
  return num << cnt | num >>> 32 - cnt;
}
/*
 * These functions implement the four basic operations the algorithm uses.
 */


function md5cmn(q, a, b, x, s, t) {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5ff(a, b, c, d, x, s, t) {
  return md5cmn(b & c | ~b & d, a, b, x, s, t);
}

function md5gg(a, b, c, d, x, s, t) {
  return md5cmn(b & d | c & ~d, a, b, x, s, t);
}

function md5hh(a, b, c, d, x, s, t) {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5ii(a, b, c, d, x, s, t) {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

var _default = md5;
exports.default = _default;
module.exports = exports.default;
},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rng;
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).
// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
// find the complete implementation of crypto (msCrypto) on IE11.
var getRandomValues = typeof crypto != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto != 'undefined' && typeof msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto);
var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

function rng() {
  if (!getRandomValues) {
    throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
  }

  return getRandomValues(rnds8);
}

module.exports = exports.default;
},{}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

// Adapted from Chris Veness' SHA1 code at
// http://www.movable-type.co.uk/scripts/sha1.html
function f(s, x, y, z) {
  switch (s) {
    case 0:
      return x & y ^ ~x & z;

    case 1:
      return x ^ y ^ z;

    case 2:
      return x & y ^ x & z ^ y & z;

    case 3:
      return x ^ y ^ z;
  }
}

function ROTL(x, n) {
  return x << n | x >>> 32 - n;
}

function sha1(bytes) {
  var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  var H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

  if (typeof bytes == 'string') {
    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = new Array(msg.length);

    for (var i = 0; i < msg.length; i++) bytes[i] = msg.charCodeAt(i);
  }

  bytes.push(0x80);
  var l = bytes.length / 4 + 2;
  var N = Math.ceil(l / 16);
  var M = new Array(N);

  for (var i = 0; i < N; i++) {
    M[i] = new Array(16);

    for (var j = 0; j < 16; j++) {
      M[i][j] = bytes[i * 64 + j * 4] << 24 | bytes[i * 64 + j * 4 + 1] << 16 | bytes[i * 64 + j * 4 + 2] << 8 | bytes[i * 64 + j * 4 + 3];
    }
  }

  M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
  M[N - 1][14] = Math.floor(M[N - 1][14]);
  M[N - 1][15] = (bytes.length - 1) * 8 & 0xffffffff;

  for (var i = 0; i < N; i++) {
    var W = new Array(80);

    for (var t = 0; t < 16; t++) W[t] = M[i][t];

    for (var t = 16; t < 80; t++) {
      W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }

    var a = H[0];
    var b = H[1];
    var c = H[2];
    var d = H[3];
    var e = H[4];

    for (var t = 0; t < 80; t++) {
      var s = Math.floor(t / 20);
      var T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
      e = d;
      d = c;
      c = ROTL(b, 30) >>> 0;
      b = a;
      a = T;
    }

    H[0] = H[0] + a >>> 0;
    H[1] = H[1] + b >>> 0;
    H[2] = H[2] + c >>> 0;
    H[3] = H[3] + d >>> 0;
    H[4] = H[4] + e >>> 0;
  }

  return [H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff, H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff, H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff, H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff, H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff];
}

var _default = sha1;
exports.default = _default;
module.exports = exports.default;
},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _rng = _interopRequireDefault(require("./rng.js"));

var _bytesToUuid = _interopRequireDefault(require("./bytesToUuid.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html
var _nodeId;

var _clockseq; // Previous uuid creation time


var _lastMSecs = 0;
var _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];
  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    var seedBytes = options.random || (options.rng || _rng.default)();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  var tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : (0, _bytesToUuid.default)(b);
}

var _default = v1;
exports.default = _default;
module.exports = exports.default;
},{"./bytesToUuid.js":9,"./rng.js":12}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _v = _interopRequireDefault(require("./v35.js"));

var _md = _interopRequireDefault(require("./md5.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const v3 = (0, _v.default)('v3', 0x30, _md.default);
var _default = v3;
exports.default = _default;
module.exports = exports.default;
},{"./md5.js":11,"./v35.js":16}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
exports.URL = exports.DNS = void 0;

var _bytesToUuid = _interopRequireDefault(require("./bytesToUuid.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function uuidToBytes(uuid) {
  // Note: We assume we're being passed a valid uuid string
  var bytes = [];
  uuid.replace(/[a-fA-F0-9]{2}/g, function (hex) {
    bytes.push(parseInt(hex, 16));
  });
  return bytes;
}

function stringToBytes(str) {
  str = unescape(encodeURIComponent(str)); // UTF8 escape

  var bytes = new Array(str.length);

  for (var i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }

  return bytes;
}

const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
exports.DNS = DNS;
const URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
exports.URL = URL;

function _default(name, version, hashfunc) {
  var generateUUID = function (value, namespace, buf, offset) {
    var off = buf && offset || 0;
    if (typeof value == 'string') value = stringToBytes(value);
    if (typeof namespace == 'string') namespace = uuidToBytes(namespace);
    if (!Array.isArray(value)) throw TypeError('value must be an array of bytes');
    if (!Array.isArray(namespace) || namespace.length !== 16) throw TypeError('namespace must be uuid string or an Array of 16 byte values'); // Per 4.3

    var bytes = hashfunc(namespace.concat(value));
    bytes[6] = bytes[6] & 0x0f | version;
    bytes[8] = bytes[8] & 0x3f | 0x80;

    if (buf) {
      for (var idx = 0; idx < 16; ++idx) {
        buf[off + idx] = bytes[idx];
      }
    }

    return buf || (0, _bytesToUuid.default)(bytes);
  }; // Function#name is not settable on some platforms (#270)


  try {
    generateUUID.name = name;
  } catch (err) {} // For CommonJS default export support


  generateUUID.DNS = DNS;
  generateUUID.URL = URL;
  return generateUUID;
}
},{"./bytesToUuid.js":9}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _rng = _interopRequireDefault(require("./rng.js"));

var _bytesToUuid = _interopRequireDefault(require("./bytesToUuid.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof options == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }

  options = options || {};

  var rnds = options.random || (options.rng || _rng.default)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`


  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || (0, _bytesToUuid.default)(rnds);
}

var _default = v4;
exports.default = _default;
module.exports = exports.default;
},{"./bytesToUuid.js":9,"./rng.js":12}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _v = _interopRequireDefault(require("./v35.js"));

var _sha = _interopRequireDefault(require("./sha1.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const v5 = (0, _v.default)('v5', 0x50, _sha.default);
var _default = v5;
exports.default = _default;
module.exports = exports.default;
},{"./sha1.js":13,"./v35.js":16}],19:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {

});

emitter.on('somenamespace*', function (eventName, payloads) {

});

Please note that callbacks triggered by wildcard registered events also get
the event name as the first argument.
*/

module.exports = WildEmitter;

function WildEmitter() { }

WildEmitter.mixin = function (constructor) {
    var prototype = constructor.prototype || constructor;

    prototype.isWildEmitter= true;

    // Listen on the given `event` with `fn`. Store a group name if present.
    prototype.on = function (event, groupName, fn) {
        this.callbacks = this.callbacks || {};
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };

    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    prototype.once = function (event, groupName, fn) {
        var self = this,
            hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        function on() {
            self.off(event, on);
            func.apply(this, arguments);
        }
        this.on(event, group, on);
        return this;
    };

    // Unbinds an entire group
    prototype.releaseGroup = function (groupName) {
        this.callbacks = this.callbacks || {};
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };

    // Remove the given callback for `event` or all
    // registered callbacks.
    prototype.off = function (event, fn) {
        this.callbacks = this.callbacks || {};
        var callbacks = this.callbacks[event],
            i;

        if (!callbacks) return this;

        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }

        // remove specific handler
        i = callbacks.indexOf(fn);
        if (i !== -1) {
            callbacks.splice(i, 1);
            if (callbacks.length === 0) {
                delete this.callbacks[event];
            }
        }
        return this;
    };

    /// Emit `event` with the given args.
    // also calls any `*` handlers
    prototype.emit = function (event) {
        this.callbacks = this.callbacks || {};
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item,
            listeners;

        if (callbacks) {
            listeners = callbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            len = specialCallbacks.length;
            listeners = specialCallbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    };

    // Helper for for finding special wildcard event handlers that match the event
    prototype.getWildcardCallbacks = function (eventName) {
        this.callbacks = this.callbacks || {};
        var item,
            split,
            result = [];

        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };

};

WildEmitter.mixin(WildEmitter);

},{}],20:[function(require,module,exports){
/*!
 * EventEmitter v5.2.9 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - https://oli.me.uk/
 * @preserve
 */

;(function (exports) {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    function isValidListener (listener) {
        if (typeof listener === 'function' || listener instanceof RegExp) {
            return true
        } else if (listener && typeof listener === 'object') {
            return isValidListener(listener.listener)
        } else {
            return false
        }
    }

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);

                for (i = 0; i < listeners.length; i++) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}(typeof window !== 'undefined' ? window : this || {}));

},{}],21:[function(require,module,exports){
module.exports={
    "author": "OpenVidu",
    "dependencies": {
        "@types/node": "13.13.2",
        "@types/platform": "1.3.2",
        "freeice": "2.2.2",
        "hark": "1.2.3",
        "platform": "1.3.5",
        "uuid": "7.0.3",
        "wolfy87-eventemitter": "5.2.9"
    },
    "description": "OpenVidu Browser",
    "devDependencies": {
        "browserify": "16.5.1",
        "grunt": "1.1.0",
        "grunt-cli": "1.3.2",
        "grunt-contrib-copy": "1.0.0",
        "grunt-contrib-sass": "1.0.0",
        "grunt-contrib-uglify": "4.0.1",
        "grunt-contrib-watch": "1.1.0",
        "grunt-postcss": "0.9.0",
        "grunt-string-replace": "1.3.1",
        "grunt-ts": "6.0.0-beta.22",
        "terser": "4.6.11",
        "tsify": "4.0.1",
        "tslint": "6.1.1",
        "typedoc": "0.17.4",
        "typescript": "3.8.3"
    },
    "license": "Apache-2.0",
    "main": "lib/index.js",
    "name": "openvidu-browser",
    "repository": {
        "type": "git",
        "url": "git://github.com/OpenVidu/openvidu"
    },
    "scripts": {
        "browserify": "VERSION=${VERSION:-dev}; cd src && ../node_modules/browserify/bin/cmd.js Main.ts -p [ tsify ] --exclude kurento-browser-extensions --debug -o ../static/js/openvidu-browser-$VERSION.js -v",
        "browserify-prod": "VERSION=${VERSION:-dev}; cd src && ../node_modules/browserify/bin/cmd.js --debug Main.ts -p [ tsify ] --exclude kurento-browser-extensions | ../node_modules/terser/bin/terser --source-map content=inline --output ../static/js/openvidu-browser-$VERSION.min.js",
        "build": "cd src/OpenVidu && ./../../node_modules/typescript/bin/tsc && cd ../.. && ./node_modules/typescript/bin/tsc --declaration src/index.ts --outDir ./lib --sourceMap --lib dom,es5,es2015.promise,scripthost",
        "docs": "./generate-docs.sh"
    },
    "types": "lib/index.d.ts",
    "version": "2.15.0"
}

},{}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenVidu_1 = require("./OpenVidu/OpenVidu");
if (window) {
    window['OpenVidu'] = OpenVidu_1.OpenVidu;
}

},{"./OpenVidu/OpenVidu":27}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Stream_1 = require("./Stream");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var Connection = (function () {
    function Connection(session, opts) {
        this.session = session;
        this.disposed = false;
        var msg = "'Connection' created ";
        if (!!opts) {
            msg += "(remote) with 'connectionId' [" + opts.id + ']';
            this.options = opts;
            this.connectionId = opts.id;
            this.creationTime = opts.createdAt;
            if (opts.metadata) {
                this.data = opts.metadata;
            }
            if (opts.streams) {
                this.initRemoteStreams(opts.streams);
            }
        }
        else {
            msg += '(local)';
        }
        logger.info(msg);
    }
    Connection.prototype.sendIceCandidate = function (candidate) {
        logger.debug((!!this.stream.outboundStreamOpts ? 'Local' : 'Remote') + 'candidate for' +
            this.connectionId, candidate);
        this.session.openvidu.sendRequest('onIceCandidate', {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                logger.error('Error sending ICE candidate: '
                    + JSON.stringify(error));
            }
        });
    };
    Connection.prototype.initRemoteStreams = function (options) {
        var _this = this;
        options.forEach(function (opts) {
            var streamOptions = {
                id: opts.id,
                createdAt: opts.createdAt,
                connection: _this,
                hasAudio: opts.hasAudio,
                hasVideo: opts.hasVideo,
                audioActive: opts.audioActive,
                videoActive: opts.videoActive,
                typeOfVideo: opts.typeOfVideo,
                frameRate: opts.frameRate,
                videoDimensions: !!opts.videoDimensions ? JSON.parse(opts.videoDimensions) : undefined,
                filter: !!opts.filter ? opts.filter : undefined
            };
            var stream = new Stream_1.Stream(_this.session, streamOptions);
            _this.addStream(stream);
        });
        logger.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + '] is now configured for receiving Streams with options: ', this.stream.inboundStreamOpts);
    };
    Connection.prototype.addStream = function (stream) {
        stream.connection = this;
        this.stream = stream;
    };
    Connection.prototype.removeStream = function (streamId) {
        delete this.stream;
    };
    Connection.prototype.dispose = function () {
        if (!!this.stream) {
            delete this.stream;
        }
        this.disposed = true;
    };
    return Connection;
}());
exports.Connection = Connection;

},{"../OpenViduInternal/Logger/OpenViduLogger":56,"./Stream":30}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = require("wolfy87-eventemitter");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var EventDispatcher = (function () {
    function EventDispatcher() {
        this.userHandlerArrowHandler = new WeakMap();
        this.ee = new EventEmitter();
    }
    EventDispatcher.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            var arrowHandler = this.userHandlerArrowHandler.get(handler);
            if (!!arrowHandler) {
                this.ee.off(type, arrowHandler);
            }
            this.userHandlerArrowHandler.delete(handler);
        }
        return this;
    };
    EventDispatcher.prototype.onAux = function (type, message, handler) {
        var arrowHandler = function (event) {
            if (event) {
                logger.info(message, event);
            }
            else {
                logger.info(message);
            }
            handler(event);
        };
        this.userHandlerArrowHandler.set(handler, arrowHandler);
        this.ee.on(type, arrowHandler);
        return this;
    };
    EventDispatcher.prototype.onceAux = function (type, message, handler) {
        var _this = this;
        var arrowHandler = function (event) {
            if (event) {
                logger.info(message, event);
            }
            else {
                logger.info(message);
            }
            handler(event);
            _this.userHandlerArrowHandler.delete(handler);
        };
        this.userHandlerArrowHandler.set(handler, arrowHandler);
        this.ee.once(type, arrowHandler);
        return this;
    };
    return EventDispatcher;
}());
exports.EventDispatcher = EventDispatcher;

},{"../OpenViduInternal/Logger/OpenViduLogger":56,"wolfy87-eventemitter":20}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var Filter = (function () {
    function Filter(type, options) {
        this.handlers = {};
        this.type = type;
        this.options = options;
    }
    Filter.prototype.execMethod = function (method, params) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.info('Executing filter method to stream ' + _this.stream.streamId);
            var stringParams;
            if (typeof params !== 'string') {
                try {
                    stringParams = JSON.stringify(params);
                }
                catch (error) {
                    var errorMsg = "'params' property must be a JSON formatted object";
                    logger.error(errorMsg);
                    reject(errorMsg);
                }
            }
            else {
                stringParams = params;
            }
            _this.stream.session.openvidu.sendRequest('execFilterMethod', { streamId: _this.stream.streamId, method: method, params: stringParams }, function (error, response) {
                if (error) {
                    logger.error('Error executing filter method for Stream ' + _this.stream.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to execute a filter method"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    logger.info('Filter method successfully executed on Stream ' + _this.stream.streamId);
                    var oldValue = Object.assign({}, _this.stream.filter);
                    _this.stream.filter.lastExecMethod = { method: method, params: JSON.parse(stringParams) };
                    _this.stream.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.stream.session, _this.stream, 'filter', _this.stream.filter, oldValue, 'execFilterMethod')]);
                    _this.stream.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.stream.streamManager, _this.stream, 'filter', _this.stream.filter, oldValue, 'execFilterMethod')]);
                    resolve();
                }
            });
        });
    };
    Filter.prototype.addEventListener = function (eventType, handler) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.info('Adding filter event listener to event ' + eventType + ' to stream ' + _this.stream.streamId);
            _this.stream.session.openvidu.sendRequest('addFilterEventListener', { streamId: _this.stream.streamId, eventType: eventType }, function (error, response) {
                if (error) {
                    logger.error('Error adding filter event listener to event ' + eventType + 'for Stream ' + _this.stream.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to add a filter event listener"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    _this.handlers[eventType] = handler;
                    logger.info('Filter event listener to event ' + eventType + ' successfully applied on Stream ' + _this.stream.streamId);
                    resolve();
                }
            });
        });
    };
    Filter.prototype.removeEventListener = function (eventType) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.info('Removing filter event listener to event ' + eventType + ' to stream ' + _this.stream.streamId);
            _this.stream.session.openvidu.sendRequest('removeFilterEventListener', { streamId: _this.stream.streamId, eventType: eventType }, function (error, response) {
                if (error) {
                    logger.error('Error removing filter event listener to event ' + eventType + 'for Stream ' + _this.stream.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to add a filter event listener"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    delete _this.handlers[eventType];
                    logger.info('Filter event listener to event ' + eventType + ' successfully removed on Stream ' + _this.stream.streamId);
                    resolve();
                }
            });
        });
    };
    return Filter;
}());
exports.Filter = Filter;

},{"../OpenViduInternal/Enums/OpenViduError":34,"../OpenViduInternal/Events/StreamPropertyChangedEvent":45,"../OpenViduInternal/Logger/OpenViduLogger":56}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorderState_1 = require("../OpenViduInternal/Enums/LocalRecorderState");
var platform = require("platform");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var LocalRecorder = (function () {
    function LocalRecorder(stream) {
        this.stream = stream;
        this.chunks = [];
        this.connectionId = (!!this.stream.connection) ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = LocalRecorderState_1.LocalRecorderState.READY;
    }
    LocalRecorder.prototype.record = function (mimeType) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (typeof MediaRecorder === 'undefined') {
                    logger.error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder');
                    throw (Error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder'));
                }
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.READY) {
                    throw (Error('\'LocalRecord.record()\' needs \'LocalRecord.state\' to be \'READY\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.clean()\' or init a new LocalRecorder before'));
                }
                logger.log("Starting local recording of stream '" + _this.stream.streamId + "' of connection '" + _this.connectionId + "'");
                var options = {};
                if (typeof MediaRecorder.isTypeSupported === 'function') {
                    if (!!mimeType) {
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            reject(new Error('mimeType "' + mimeType + '" is not supported'));
                        }
                        options = { mimeType: mimeType };
                    }
                    else {
                        logger.log('No mimeType parameter provided. Using default codecs');
                    }
                }
                else {
                    logger.warn('MediaRecorder#isTypeSupported is not supported. Using default codecs');
                }
                _this.mediaRecorder = new MediaRecorder(_this.stream.getMediaStream(), options);
                _this.mediaRecorder.start(10);
            }
            catch (err) {
                reject(err);
            }
            _this.mediaRecorder.ondataavailable = function (e) {
                _this.chunks.push(e.data);
            };
            _this.mediaRecorder.onerror = function (e) {
                logger.error('MediaRecorder error: ', e);
            };
            _this.mediaRecorder.onstart = function () {
                logger.log('MediaRecorder started (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onstop = function () {
                _this.onStopDefault();
            };
            _this.mediaRecorder.onpause = function () {
                logger.log('MediaRecorder paused (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onresume = function () {
                logger.log('MediaRecorder resumed (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onwarning = function (e) {
                logger.log('MediaRecorder warning: ' + e);
            };
            _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            resolve();
        });
    };
    LocalRecorder.prototype.stop = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state === LocalRecorderState_1.LocalRecorderState.READY || _this.state === LocalRecorderState_1.LocalRecorderState.FINISHED) {
                    throw (Error('\'LocalRecord.stop()\' needs \'LocalRecord.state\' to be \'RECORDING\' or \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' before'));
                }
                _this.mediaRecorder.onstop = function () {
                    _this.onStopDefault();
                    resolve();
                };
                _this.mediaRecorder.stop();
            }
            catch (e) {
                reject(e);
            }
        });
    };
    LocalRecorder.prototype.pause = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.RECORDING) {
                    reject(Error('\'LocalRecord.pause()\' needs \'LocalRecord.state\' to be \'RECORDING\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' or \'LocalRecorder.resume()\' before'));
                }
                _this.mediaRecorder.pause();
                _this.state = LocalRecorderState_1.LocalRecorderState.PAUSED;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    LocalRecorder.prototype.resume = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.PAUSED) {
                    throw (Error('\'LocalRecord.resume()\' needs \'LocalRecord.state\' to be \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.pause()\' before'));
                }
                _this.mediaRecorder.resume();
                _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    LocalRecorder.prototype.preview = function (parentElement) {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.preview()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        this.videoPreview = document.createElement('video');
        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;
        if (platform.name === 'Safari') {
            this.videoPreview.setAttribute('playsinline', 'true');
        }
        if (typeof parentElement === 'string') {
            var parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        }
        else {
            this.videoPreview = parentElement.appendChild(this.videoPreview);
        }
        this.videoPreview.src = this.videoPreviewSrc;
        return this.videoPreview;
    };
    LocalRecorder.prototype.clean = function () {
        var _this = this;
        var f = function () {
            delete _this.blob;
            _this.chunks = [];
            delete _this.mediaRecorder;
            _this.state = LocalRecorderState_1.LocalRecorderState.READY;
        };
        if (this.state === LocalRecorderState_1.LocalRecorderState.RECORDING || this.state === LocalRecorderState_1.LocalRecorderState.PAUSED) {
            this.stop().then(function () { return f(); }).catch(function () { return f(); });
        }
        else {
            f();
        }
    };
    LocalRecorder.prototype.download = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.download()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        else {
            var a = document.createElement('a');
            a.style.display = 'none';
            document.body.appendChild(a);
            var url = window.URL.createObjectURL(this.blob);
            a.href = url;
            a.download = this.id + '.webm';
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };
    LocalRecorder.prototype.getBlob = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('Call \'LocalRecord.stop()\' before getting Blob file'));
        }
        else {
            return this.blob;
        }
    };
    LocalRecorder.prototype.uploadAsBinary = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsBinary()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_1 = new XMLHttpRequest();
                http_1.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_1.setRequestHeader(key, headers[key]);
                    }
                }
                http_1.onreadystatechange = function () {
                    if (http_1.readyState === 4) {
                        if (http_1.status.toString().charAt(0) === '2') {
                            resolve(http_1.responseText);
                        }
                        else {
                            reject(http_1.status);
                        }
                    }
                };
                http_1.send(_this.blob);
            }
        });
    };
    LocalRecorder.prototype.uploadAsMultipartfile = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsMultipartfile()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_2 = new XMLHttpRequest();
                http_2.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_2.setRequestHeader(key, headers[key]);
                    }
                }
                var sendable = new FormData();
                sendable.append('file', _this.blob, _this.id + '.webm');
                http_2.onreadystatechange = function () {
                    if (http_2.readyState === 4) {
                        if (http_2.status.toString().charAt(0) === '2') {
                            resolve(http_2.responseText);
                        }
                        else {
                            reject(http_2.status);
                        }
                    }
                };
                http_2.send(sendable);
            }
        });
    };
    LocalRecorder.prototype.onStopDefault = function () {
        logger.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ')');
        this.blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this.videoPreviewSrc = window.URL.createObjectURL(this.blob);
        this.state = LocalRecorderState_1.LocalRecorderState.FINISHED;
    };
    return LocalRecorder;
}());
exports.LocalRecorder = LocalRecorder;

},{"../OpenViduInternal/Enums/LocalRecorderState":33,"../OpenViduInternal/Logger/OpenViduLogger":56,"platform":8}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorder_1 = require("./LocalRecorder");
var Publisher_1 = require("./Publisher");
var Session_1 = require("./Session");
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var screenSharingAuto = require("../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto");
var screenSharing = require("../OpenViduInternal/ScreenSharing/Screen-Capturing");
var EventEmitter = require("wolfy87-eventemitter");
var RpcBuilder = require("../OpenViduInternal/KurentoUtils/kurento-jsonrpc");
var platform = require("platform");
platform['isIonicIos'] = (platform.product === 'iPhone' || platform.product === 'iPad') && platform.ua.indexOf('Safari') === -1;
platform['isIonicAndroid'] = platform.os.family === 'Android' && platform.name == "Android Browser";
var packageJson = require('../../package.json');
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var OpenVidu = (function () {
    function OpenVidu() {
        var _this = this;
        this.publishers = [];
        this.secret = '';
        this.recorder = false;
        this.advancedConfiguration = {};
        this.webrtcStatsInterval = 0;
        this.ee = new EventEmitter();
        this.libraryVersion = packageJson.version;
        logger.info("'OpenVidu' initialized");
        logger.info("openvidu-browser version: " + this.libraryVersion);
        if (platform.os.family === 'iOS' || platform.os.family === 'Android') {
            window.addEventListener('orientationchange', function () {
                _this.publishers.forEach(function (publisher) {
                    if (publisher.stream.isLocalStreamPublished && !!publisher.stream && !!publisher.stream.hasVideo && !!publisher.stream.streamManager.videos[0]) {
                        var attempts_1 = 0;
                        var oldWidth_1 = publisher.stream.videoDimensions.width;
                        var oldHeight_1 = publisher.stream.videoDimensions.height;
                        var getNewVideoDimensions_1 = function () {
                            return new Promise(function (resolve, reject) {
                                if (platform['isIonicIos']) {
                                    resolve({
                                        newWidth: publisher.stream.streamManager.videos[0].video.videoWidth,
                                        newHeight: publisher.stream.streamManager.videos[0].video.videoHeight
                                    });
                                }
                                else {
                                    var firefoxSettings = publisher.stream.getMediaStream().getVideoTracks()[0].getSettings();
                                    var newWidth = ((platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings.width : publisher.videoReference.videoWidth);
                                    var newHeight = ((platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings.height : publisher.videoReference.videoHeight);
                                    resolve({ newWidth: newWidth, newHeight: newHeight });
                                }
                            });
                        };
                        var repeatUntilChange_1 = setInterval(function () {
                            getNewVideoDimensions_1().then(function (newDimensions) {
                                sendStreamPropertyChangedEvent_1(oldWidth_1, oldHeight_1, newDimensions.newWidth, newDimensions.newHeight);
                            });
                        }, 75);
                        var sendStreamPropertyChangedEvent_1 = function (oldWidth, oldHeight, newWidth, newHeight) {
                            attempts_1++;
                            if (attempts_1 > 10) {
                                clearTimeout(repeatUntilChange_1);
                            }
                            if (newWidth !== oldWidth || newHeight !== oldHeight) {
                                publisher.stream.videoDimensions = {
                                    width: newWidth || 0,
                                    height: newHeight || 0
                                };
                                _this.sendRequest('streamPropertyChanged', {
                                    streamId: publisher.stream.streamId,
                                    property: 'videoDimensions',
                                    newValue: JSON.stringify(publisher.stream.videoDimensions),
                                    reason: 'deviceRotated'
                                }, function (error, response) {
                                    if (error) {
                                        logger.error("Error sending 'streamPropertyChanged' event", error);
                                    }
                                    else {
                                        _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                                        publisher.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(publisher, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                                    }
                                });
                                clearTimeout(repeatUntilChange_1);
                            }
                        };
                    }
                });
            });
        }
    }
    OpenVidu.prototype.initSession = function () {
        this.session = new Session_1.Session(this);
        return this.session;
    };
    OpenVidu.prototype.initPublisher = function (targetElement, param2, param3) {
        var properties;
        if (!!param2 && (typeof param2 !== 'function')) {
            properties = param2;
            properties = {
                audioSource: (typeof properties.audioSource !== 'undefined') ? properties.audioSource : undefined,
                frameRate: (typeof MediaStreamTrack !== 'undefined' && properties.videoSource instanceof MediaStreamTrack) ? undefined : ((typeof properties.frameRate !== 'undefined') ? properties.frameRate : undefined),
                insertMode: (typeof properties.insertMode !== 'undefined') ? ((typeof properties.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[properties.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: (typeof properties.mirror !== 'undefined') ? properties.mirror : true,
                publishAudio: (typeof properties.publishAudio !== 'undefined') ? properties.publishAudio : true,
                publishVideo: (typeof properties.publishVideo !== 'undefined') ? properties.publishVideo : true,
                resolution: (typeof MediaStreamTrack !== 'undefined' && properties.videoSource instanceof MediaStreamTrack) ? undefined : ((typeof properties.resolution !== 'undefined') ? properties.resolution : '640x480'),
                videoSource: (typeof properties.videoSource !== 'undefined') ? properties.videoSource : undefined,
                filter: properties.filter
            };
        }
        else {
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: true,
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            };
        }
        var publisher = new Publisher_1.Publisher(targetElement, properties, this);
        var completionHandler;
        if (!!param2 && (typeof param2 === 'function')) {
            completionHandler = param2;
        }
        else if (!!param3) {
            completionHandler = param3;
        }
        publisher.initialize()
            .then(function () {
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
            publisher.emitEvent('accessAllowed', []);
        }).catch(function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
            publisher.emitEvent('accessDenied', [error]);
        });
        this.publishers.push(publisher);
        return publisher;
    };
    OpenVidu.prototype.initPublisherAsync = function (targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var publisher;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(publisher);
                }
            };
            if (!!properties) {
                publisher = _this.initPublisher(targetElement, properties, callback);
            }
            else {
                publisher = _this.initPublisher(targetElement, callback);
            }
        });
    };
    OpenVidu.prototype.initLocalRecorder = function (stream) {
        return new LocalRecorder_1.LocalRecorder(stream);
    };
    OpenVidu.prototype.checkSystemRequirements = function () {
        var browser = platform.name;
        var family = platform.os.family;
        var userAgent = !!platform.ua ? platform.ua : navigator.userAgent;
        if (this.isIPhoneOrIPad(userAgent)) {
            if (this.isIOSWithSafari(userAgent)) {
                return 1;
            }
            return 0;
        }
        if ((browser === 'Safari') ||
            (browser === 'Chrome') || (browser === 'Chrome Mobile') ||
            (browser === 'Firefox') || (browser === 'Firefox Mobile') ||
            (browser === 'Opera') || (browser === 'Opera Mobile') ||
            (browser === 'Android Browser') || (browser === 'Electron') ||
            (browser === 'Samsung Internet Mobile') || (browser === 'Samsung Internet')) {
            return 1;
        }
        return 0;
    };
    OpenVidu.prototype.checkScreenSharingCapabilities = function () {
        var browser = platform.name;
        var version = (platform === null || platform === void 0 ? void 0 : platform.version) ? parseFloat(platform.version) : -1;
        var family = platform.os.family;
        if (family === 'iOS' || family === 'Android') {
            return 0;
        }
        if ((browser !== 'Chrome') && (browser !== 'Firefox') && (browser !== 'Opera') && (browser !== 'Electron') &&
            (browser === 'Safari' && version < 13)) {
            return 0;
        }
        else {
            return 1;
        }
    };
    OpenVidu.prototype.getDevices = function () {
        return new Promise(function (resolve, reject) {
            navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
                var _a;
                var devices = [];
                if (platform['isIonicAndroid'] && typeof cordova != "undefined" && ((_a = cordova === null || cordova === void 0 ? void 0 : cordova.plugins) === null || _a === void 0 ? void 0 : _a.EnumerateDevicesPlugin)) {
                    cordova.plugins.EnumerateDevicesPlugin.getEnumerateDevices().then(function (pluginDevices) {
                        var pluginAudioDevices = [];
                        var videoDevices = [];
                        var audioDevices = [];
                        pluginAudioDevices = pluginDevices.filter(function (device) { return device.kind === 'audioinput'; });
                        videoDevices = deviceInfos.filter(function (device) { return device.kind === 'videoinput'; });
                        audioDevices = deviceInfos.filter(function (device) { return device.kind === 'audioinput'; });
                        videoDevices.forEach(function (deviceInfo, index) {
                            if (!deviceInfo.label) {
                                var label = "";
                                if (index === 0) {
                                    label = "Front Camera";
                                }
                                else if (index === 1) {
                                    label = "Back Camera";
                                }
                                else {
                                    label = "Unknown Camera";
                                }
                                devices.push({
                                    kind: deviceInfo.kind,
                                    deviceId: deviceInfo.deviceId,
                                    label: label
                                });
                            }
                            else {
                                devices.push({
                                    kind: deviceInfo.kind,
                                    deviceId: deviceInfo.deviceId,
                                    label: deviceInfo.label
                                });
                            }
                        });
                        audioDevices.forEach(function (deviceInfo, index) {
                            if (!deviceInfo.label) {
                                var label = "";
                                switch (index) {
                                    case 0:
                                        label = 'Default';
                                        break;
                                    case 1:
                                        var defaultMatch = pluginAudioDevices.filter(function (d) { return d.label.includes('Built'); })[0];
                                        label = defaultMatch ? defaultMatch.label : 'Built-in Microphone';
                                        break;
                                    case 2:
                                        var wiredMatch = pluginAudioDevices.filter(function (d) { return d.label.includes('Wired'); })[0];
                                        if (wiredMatch) {
                                            label = wiredMatch.label;
                                        }
                                        else {
                                            label = 'Headset earpiece';
                                        }
                                        break;
                                    case 3:
                                        var wirelessMatch = pluginAudioDevices.filter(function (d) { return d.label.includes('Bluetooth'); })[0];
                                        label = wirelessMatch ? wirelessMatch.label : 'Wireless';
                                        break;
                                    default:
                                        label = "Unknown Microphone";
                                        break;
                                }
                                devices.push({
                                    kind: deviceInfo.kind,
                                    deviceId: deviceInfo.deviceId,
                                    label: label
                                });
                            }
                            else {
                                devices.push({
                                    kind: deviceInfo.kind,
                                    deviceId: deviceInfo.deviceId,
                                    label: deviceInfo.label
                                });
                            }
                        });
                        resolve(devices);
                    });
                }
                else {
                    deviceInfos.forEach(function (deviceInfo) {
                        if (deviceInfo.kind === 'audioinput' || deviceInfo.kind === 'videoinput') {
                            devices.push({
                                kind: deviceInfo.kind,
                                deviceId: deviceInfo.deviceId,
                                label: deviceInfo.label
                            });
                        }
                    });
                    resolve(devices);
                }
            }).catch(function (error) {
                logger.error('Error getting devices', error);
                reject(error);
            });
        });
    };
    OpenVidu.prototype.getUserMedia = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var askForAudioStreamOnly = function (previousMediaStream, constraints) {
                var definedAudioConstraint = ((constraints.audio === undefined) ? true : constraints.audio);
                var constraintsAux = { audio: definedAudioConstraint, video: false };
                navigator.mediaDevices.getUserMedia(constraintsAux)
                    .then(function (audioOnlyStream) {
                    previousMediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                    resolve(previousMediaStream);
                })
                    .catch(function (error) {
                    previousMediaStream.getAudioTracks().forEach(function (track) {
                        track.stop();
                    });
                    previousMediaStream.getVideoTracks().forEach(function (track) {
                        track.stop();
                    });
                    reject(_this.generateAudioDeviceError(error, constraintsAux));
                });
            };
            _this.generateMediaConstraints(options).then(function (myConstraints) {
                var _a, _b;
                if (!!myConstraints.videoTrack && !!myConstraints.audioTrack ||
                    !!myConstraints.audioTrack && ((_a = myConstraints.constraints) === null || _a === void 0 ? void 0 : _a.video) === false ||
                    !!myConstraints.videoTrack && ((_b = myConstraints.constraints) === null || _b === void 0 ? void 0 : _b.audio) === false) {
                    resolve(_this.addAlreadyProvidedTracks(myConstraints, new MediaStream()));
                }
                else {
                    if (!!myConstraints.videoTrack) {
                        delete myConstraints.constraints.video;
                    }
                    if (!!myConstraints.audioTrack) {
                        delete myConstraints.constraints.audio;
                    }
                    var mustAskForAudioTrackLater_1 = false;
                    if (typeof options.videoSource === 'string') {
                        if (options.videoSource === 'screen' ||
                            options.videoSource === 'window' ||
                            (platform.name === 'Electron' && options.videoSource.startsWith('screen:'))) {
                            mustAskForAudioTrackLater_1 = !myConstraints.audioTrack && (options.audioSource !== null && options.audioSource !== false);
                            if (navigator.mediaDevices['getDisplayMedia'] && platform.name !== 'Electron') {
                                navigator.mediaDevices['getDisplayMedia']({ video: true })
                                    .then(function (mediaStream) {
                                    _this.addAlreadyProvidedTracks(myConstraints, mediaStream);
                                    if (mustAskForAudioTrackLater_1) {
                                        askForAudioStreamOnly(mediaStream, myConstraints.constraints);
                                        return;
                                    }
                                    else {
                                        resolve(mediaStream);
                                    }
                                })
                                    .catch(function (error) {
                                    var errorName = OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                                    var errorMessage = error.toString();
                                    reject(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                });
                                return;
                            }
                            else {
                            }
                        }
                        else {
                        }
                    }
                    var constraintsAux = mustAskForAudioTrackLater_1 ? { video: myConstraints.constraints.video } : myConstraints.constraints;
                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(function (mediaStream) {
                        _this.addAlreadyProvidedTracks(myConstraints, mediaStream);
                        if (mustAskForAudioTrackLater_1) {
                            askForAudioStreamOnly(mediaStream, myConstraints.constraints);
                            return;
                        }
                        else {
                            resolve(mediaStream);
                        }
                    })
                        .catch(function (error) {
                        var errorName;
                        var errorMessage = error.toString();
                        if (!(options.videoSource === 'screen')) {
                            errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                        }
                        else {
                            errorName = OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                        }
                        reject(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                    });
                }
            }).catch(function (error) {
                reject(error);
            });
        });
    };
    OpenVidu.prototype.enableProdMode = function () {
        logger.enableProdMode();
    };
    OpenVidu.prototype.setAdvancedConfiguration = function (configuration) {
        this.advancedConfiguration = configuration;
    };
    OpenVidu.prototype.generateMediaConstraints = function (publisherProperties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var myConstraints = {
                audioTrack: undefined,
                videoTrack: undefined,
                constraints: {
                    audio: undefined,
                    video: undefined
                }
            };
            var audioSource = publisherProperties.audioSource;
            var videoSource = publisherProperties.videoSource;
            if (audioSource === null || audioSource === false) {
                myConstraints.constraints.audio = false;
            }
            if (videoSource === null || videoSource === false) {
                myConstraints.constraints.video = false;
            }
            if (myConstraints.constraints.audio === false && myConstraints.constraints.video === false) {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.NO_INPUT_SOURCE_SET, "Properties 'audioSource' and 'videoSource' cannot be set to false or null at the same time"));
            }
            if (typeof MediaStreamTrack !== 'undefined' && audioSource instanceof MediaStreamTrack) {
                myConstraints.audioTrack = audioSource;
            }
            if (typeof MediaStreamTrack !== 'undefined' && videoSource instanceof MediaStreamTrack) {
                myConstraints.videoTrack = videoSource;
            }
            if (audioSource === undefined) {
                myConstraints.constraints.audio = true;
            }
            if (videoSource === undefined) {
                myConstraints.constraints.video = {
                    width: {
                        ideal: 640
                    },
                    height: {
                        ideal: 480
                    }
                };
            }
            if (videoSource !== null && videoSource !== false) {
                if (!!publisherProperties.resolution) {
                    var widthAndHeight = publisherProperties.resolution.toLowerCase().split('x');
                    var idealWidth = Number(widthAndHeight[0]);
                    var idealHeight = Number(widthAndHeight[1]);
                    myConstraints.constraints.video = {
                        width: {
                            ideal: idealWidth
                        },
                        height: {
                            ideal: idealHeight
                        }
                    };
                }
                if (!!publisherProperties.frameRate) {
                    myConstraints.constraints.video.frameRate = { ideal: publisherProperties.frameRate };
                }
            }
            _this.configureDeviceIdOrScreensharing(myConstraints, publisherProperties, resolve, reject);
            resolve(myConstraints);
        });
    };
    OpenVidu.prototype.startWs = function (onConnectSucces) {
        var config = {
            heartbeat: 5000,
            sendCloseMessage: false,
            ws: {
                uri: this.wsUri,
                onconnected: onConnectSucces,
                ondisconnect: this.disconnectCallback.bind(this),
                onreconnecting: this.reconnectingCallback.bind(this),
                onreconnected: this.reconnectedCallback.bind(this)
            },
            rpc: {
                requestTimeout: 10000,
                participantJoined: this.session.onParticipantJoined.bind(this.session),
                participantPublished: this.session.onParticipantPublished.bind(this.session),
                participantUnpublished: this.session.onParticipantUnpublished.bind(this.session),
                participantLeft: this.session.onParticipantLeft.bind(this.session),
                participantEvicted: this.session.onParticipantEvicted.bind(this.session),
                recordingStarted: this.session.onRecordingStarted.bind(this.session),
                recordingStopped: this.session.onRecordingStopped.bind(this.session),
                sendMessage: this.session.onNewMessage.bind(this.session),
                streamPropertyChanged: this.session.onStreamPropertyChanged.bind(this.session),
                filterEventDispatched: this.session.onFilterEventDispatched.bind(this.session),
                iceCandidate: this.session.recvIceCandidate.bind(this.session),
                mediaError: this.session.onMediaError.bind(this.session)
            }
        };
        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    };
    OpenVidu.prototype.closeWs = function () {
        this.jsonRpcClient.close(4102, "Connection closed by client");
    };
    OpenVidu.prototype.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = {};
        }
        logger.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
        this.jsonRpcClient.send(method, params, callback);
    };
    OpenVidu.prototype.getWsUri = function () {
        return this.wsUri;
    };
    OpenVidu.prototype.getSecret = function () {
        return this.secret;
    };
    OpenVidu.prototype.getRecorder = function () {
        return this.recorder;
    };
    OpenVidu.prototype.generateAudioDeviceError = function (error, constraints) {
        if (error.name === 'Error') {
            error.name = error.constructor.name;
        }
        var errorName, errorMessage;
        switch (error.name.toLowerCase()) {
            case 'notfounderror':
                errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                errorMessage = error.toString();
                return new OpenViduError_1.OpenViduError(errorName, errorMessage);
            case 'notallowederror':
                errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                errorMessage = error.toString();
                return new OpenViduError_1.OpenViduError(errorName, errorMessage);
            case 'overconstrainederror':
                if (error.constraint.toLowerCase() === 'deviceid') {
                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                    errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                }
                else {
                    errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                    errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                }
                return new OpenViduError_1.OpenViduError(errorName, errorMessage);
            case 'notreadableerror':
                errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ALREADY_IN_USE;
                errorMessage = error.toString();
                return (new OpenViduError_1.OpenViduError(errorName, errorMessage));
            default:
                return new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_GENERIC_ERROR, error.toString());
        }
    };
    OpenVidu.prototype.addAlreadyProvidedTracks = function (myConstraints, mediaStream) {
        if (!!myConstraints.videoTrack) {
            mediaStream.addTrack(myConstraints.videoTrack);
        }
        if (!!myConstraints.audioTrack) {
            mediaStream.addTrack(myConstraints.audioTrack);
        }
        return mediaStream;
    };
    OpenVidu.prototype.configureDeviceIdOrScreensharing = function (myConstraints, publisherProperties, resolve, reject) {
        var _this = this;
        var audioSource = publisherProperties.audioSource;
        var videoSource = publisherProperties.videoSource;
        if (typeof audioSource === 'string') {
            myConstraints.constraints.audio = { deviceId: { exact: audioSource } };
        }
        if (typeof videoSource === 'string') {
            if (!this.isScreenShare(videoSource)) {
                this.setVideoSource(myConstraints, videoSource);
            }
            else {
                if (!this.checkScreenSharingCapabilities()) {
                    var error = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED, 'You can only screen share in desktop Chrome, Firefox, Opera, Safari (>=13.0) or Electron. Detected client: ' + platform.name);
                    logger.error(error);
                    reject(error);
                }
                else {
                    if (platform.name === 'Electron') {
                        var prefix = "screen:";
                        var videoSourceString = videoSource;
                        var electronScreenId = videoSourceString.substr(videoSourceString.indexOf(prefix) + prefix.length);
                        myConstraints.constraints.video = {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                chromeMediaSourceId: electronScreenId
                            }
                        };
                        resolve(myConstraints);
                    }
                    else {
                        if (!!this.advancedConfiguration.screenShareChromeExtension && !(platform.name.indexOf('Firefox') !== -1) && !navigator.mediaDevices['getDisplayMedia']) {
                            screenSharing.getScreenConstraints(function (error, screenConstraints) {
                                if (!!error || !!screenConstraints.mandatory && screenConstraints.mandatory.chromeMediaSource === 'screen') {
                                    if (error === 'permission-denied' || error === 'PermissionDeniedError') {
                                        var error_1 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                        logger.error(error_1);
                                        reject(error_1);
                                    }
                                    else {
                                        var extensionId = _this.advancedConfiguration.screenShareChromeExtension.split('/').pop().trim();
                                        screenSharing.getChromeExtensionStatus(extensionId, function (status) {
                                            if (status === 'installed-disabled') {
                                                var error_2 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                                logger.error(error_2);
                                                reject(error_2);
                                            }
                                            if (status === 'not-installed') {
                                                var error_3 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, _this.advancedConfiguration.screenShareChromeExtension);
                                                logger.error(error_3);
                                                reject(error_3);
                                            }
                                        });
                                        return;
                                    }
                                }
                                else {
                                    myConstraints.constraints.video = screenConstraints;
                                    resolve(myConstraints);
                                }
                            });
                            return;
                        }
                        else {
                            if (navigator.mediaDevices['getDisplayMedia']) {
                                resolve(myConstraints);
                            }
                            else {
                                var firefoxString = platform.name.indexOf('Firefox') !== -1 ? publisherProperties.videoSource : undefined;
                                screenSharingAuto.getScreenId(firefoxString, function (error, sourceId, screenConstraints) {
                                    if (!!error) {
                                        if (error === 'not-installed') {
                                            var extensionUrl = !!_this.advancedConfiguration.screenShareChromeExtension ? _this.advancedConfiguration.screenShareChromeExtension :
                                                'https://chrome.google.com/webstore/detail/openvidu-screensharing/lfcgfepafnobdloecchnfaclibenjold';
                                            var err = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, extensionUrl);
                                            logger.error(err);
                                            reject(err);
                                        }
                                        else if (error === 'installed-disabled') {
                                            var err = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                            logger.error(err);
                                            reject(err);
                                        }
                                        else if (error === 'permission-denied') {
                                            var err = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            logger.error(err);
                                            reject(err);
                                        }
                                        else {
                                            var err = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, 'Unknown error when accessing screen share');
                                            logger.error(err);
                                            logger.error(error);
                                            reject(err);
                                        }
                                    }
                                    else {
                                        myConstraints.constraints.video = screenConstraints.video;
                                        resolve(myConstraints);
                                    }
                                });
                                return;
                            }
                        }
                    }
                }
            }
        }
    };
    OpenVidu.prototype.setVideoSource = function (myConstraints, videoSource) {
        if (!myConstraints.constraints.video) {
            myConstraints.constraints.video = {};
        }
        myConstraints.constraints.video['deviceId'] = { exact: videoSource };
    };
    OpenVidu.prototype.disconnectCallback = function () {
        logger.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection('networkDisconnect');
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectingCallback = function () {
        logger.warn('Websocket connection lost (reconnecting)');
        if (!this.isRoomAvailable()) {
            alert('Connection error. Please reload page.');
        }
        else {
            this.session.emitEvent('reconnecting', []);
        }
    };
    OpenVidu.prototype.reconnectedCallback = function () {
        var _this = this;
        logger.warn('Websocket reconnected');
        if (this.isRoomAvailable()) {
            this.sendRequest('connect', { sessionId: this.session.connection.rpcSessionId }, function (error, response) {
                if (!!error) {
                    logger.error(error);
                    logger.warn('Websocket was able to reconnect to OpenVidu Server, but your Connection was already destroyed due to timeout. You are no longer a participant of the Session and your media streams have been destroyed');
                    _this.session.onLostConnection("networkDisconnect");
                    _this.jsonRpcClient.close(4101, "Reconnection fault");
                }
                else {
                    _this.jsonRpcClient.resetPing();
                    _this.session.onRecoveredConnection();
                }
            });
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.isRoomAvailable = function () {
        if (this.session !== undefined && this.session instanceof Session_1.Session) {
            return true;
        }
        else {
            logger.warn('Session instance not found');
            return false;
        }
    };
    OpenVidu.prototype.isScreenShare = function (videoSource) {
        return videoSource === 'screen' ||
            videoSource === 'window' ||
            (platform.name === 'Electron' && videoSource.startsWith('screen:'));
    };
    OpenVidu.prototype.isIPhoneOrIPad = function (userAgent) {
        var isTouchable = 'ontouchend' in document;
        var isIPad = /\b(\w*Macintosh\w*)\b/.test(userAgent) && isTouchable;
        var isIPhone = /\b(\w*iPhone\w*)\b/.test(userAgent) && /\b(\w*Mobile\w*)\b/.test(userAgent) && isTouchable;
        return isIPad || isIPhone;
    };
    OpenVidu.prototype.isIOSWithSafari = function (userAgent) {
        return /\b(\w*Apple\w*)\b/.test(navigator.vendor) && /\b(\w*Safari\w*)\b/.test(userAgent)
            && !/\b(\w*CriOS\w*)\b/.test(userAgent) && !/\b(\w*FxiOS\w*)\b/.test(userAgent);
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;

},{"../../package.json":21,"../OpenViduInternal/Enums/OpenViduError":34,"../OpenViduInternal/Enums/VideoInsertMode":35,"../OpenViduInternal/Events/StreamPropertyChangedEvent":45,"../OpenViduInternal/KurentoUtils/kurento-jsonrpc":52,"../OpenViduInternal/Logger/OpenViduLogger":56,"../OpenViduInternal/ScreenSharing/Screen-Capturing":58,"../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto":57,"./LocalRecorder":26,"./Publisher":28,"./Session":29,"platform":8,"wolfy87-eventemitter":20}],28:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Session_1 = require("./Session");
var Stream_1 = require("./Stream");
var StreamManager_1 = require("./StreamManager");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var platform = require("platform");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var Publisher = (function (_super) {
    __extends(Publisher, _super);
    function Publisher(targEl, properties, openvidu) {
        var _this = _super.call(this, new Stream_1.Stream((!!openvidu.session) ? openvidu.session : new Session_1.Session(openvidu), { publisherProperties: properties, mediaConstraints: {} }), targEl) || this;
        _this.accessAllowed = false;
        _this.isSubscribedToRemote = false;
        _this.accessDenied = false;
        _this.properties = properties;
        _this.openvidu = openvidu;
        _this.stream.ee.on('local-stream-destroyed', function (reason) {
            _this.stream.isLocalStreamPublished = false;
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', _this.stream, reason);
            _this.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehavior();
        });
        return _this;
    }
    Publisher.prototype.publishAudio = function (value) {
        var _this = this;
        if (this.stream.audioActive !== value) {
            var affectedMediaStream = this.stream.displayMyRemote() ? this.stream.localMediaStreamWhenSubscribedToRemote : this.stream.getMediaStream();
            affectedMediaStream.getAudioTracks().forEach(function (track) {
                track.enabled = value;
            });
            if (!!this.session && !!this.stream.streamId) {
                this.session.openvidu.sendRequest('streamPropertyChanged', {
                    streamId: this.stream.streamId,
                    property: 'audioActive',
                    newValue: value,
                    reason: 'publishAudio'
                }, function (error, response) {
                    if (error) {
                        logger.error("Error sending 'streamPropertyChanged' event", error);
                    }
                    else {
                        _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this.stream, 'audioActive', value, !value, 'publishAudio')]);
                        _this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, _this.stream, 'audioActive', value, !value, 'publishAudio')]);
                    }
                });
            }
            this.stream.audioActive = value;
            logger.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its audio stream');
        }
    };
    Publisher.prototype.publishVideo = function (value) {
        var _this = this;
        if (this.stream.videoActive !== value) {
            var affectedMediaStream = this.stream.displayMyRemote() ? this.stream.localMediaStreamWhenSubscribedToRemote : this.stream.getMediaStream();
            affectedMediaStream.getVideoTracks().forEach(function (track) {
                track.enabled = value;
            });
            if (!!this.session && !!this.stream.streamId) {
                this.session.openvidu.sendRequest('streamPropertyChanged', {
                    streamId: this.stream.streamId,
                    property: 'videoActive',
                    newValue: value,
                    reason: 'publishVideo'
                }, function (error, response) {
                    if (error) {
                        logger.error("Error sending 'streamPropertyChanged' event", error);
                    }
                    else {
                        _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this.stream, 'videoActive', value, !value, 'publishVideo')]);
                        _this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, _this.stream, 'videoActive', value, !value, 'publishVideo')]);
                    }
                });
            }
            this.stream.videoActive = value;
            logger.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its video stream');
        }
    };
    Publisher.prototype.subscribeToRemote = function (value) {
        value = (value !== undefined) ? value : true;
        this.isSubscribedToRemote = value;
        this.stream.subscribeToMyRemote(value);
    };
    Publisher.prototype.on = function (type, handler) {
        var _this = this;
        _super.prototype.on.call(this, type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.ee.on('stream-created-by-publisher', function () {
                    _this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.emitEvent('accessAllowed', []);
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.emitEvent('accessDenied', []);
            }
        }
        return this;
    };
    Publisher.prototype.once = function (type, handler) {
        var _this = this;
        _super.prototype.once.call(this, type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.ee.once('stream-created-by-publisher', function () {
                    _this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.emitEvent('accessAllowed', []);
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.emitEvent('accessDenied', []);
            }
        }
        return this;
    };
    Publisher.prototype.replaceTrack = function (track) {
        var _this = this;
        var replaceMediaStreamTrack = function () {
            var mediaStream = _this.stream.displayMyRemote() ? _this.stream.localMediaStreamWhenSubscribedToRemote : _this.stream.getMediaStream();
            var removedTrack;
            if (track.kind === 'video') {
                removedTrack = mediaStream.getVideoTracks()[0];
            }
            else {
                removedTrack = mediaStream.getAudioTracks()[0];
            }
            mediaStream.removeTrack(removedTrack);
            removedTrack.stop();
            mediaStream.addTrack(track);
        };
        return new Promise(function (resolve, reject) {
            if (_this.stream.isLocalStreamPublished) {
                var senders = _this.stream.getRTCPeerConnection().getSenders();
                var sender = void 0;
                if (track.kind === 'video') {
                    sender = senders.find(function (s) { return !!s.track && s.track.kind === 'video'; });
                    if (!sender) {
                        reject(new Error('There\'s no replaceable track for that kind of MediaStreamTrack in this Publisher object'));
                    }
                }
                else if (track.kind === 'audio') {
                    sender = senders.find(function (s) { return !!s.track && s.track.kind === 'audio'; });
                    if (!sender) {
                        reject(new Error('There\'s no replaceable track for that kind of MediaStreamTrack in this Publisher object'));
                    }
                }
                else {
                    reject(new Error('Unknown track kind ' + track.kind));
                }
                sender.replaceTrack(track).then(function () {
                    replaceMediaStreamTrack();
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            }
            else {
                replaceMediaStreamTrack();
                resolve();
            }
        });
    };
    Publisher.prototype.initialize = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var constraints = {};
            var constraintsAux = {};
            var timeForDialogEvent = 1250;
            var startTime;
            var errorCallback = function (openViduError) {
                _this.accessDenied = true;
                _this.accessAllowed = false;
                reject(openViduError);
            };
            var successCallback = function (mediaStream) {
                _this.accessAllowed = true;
                _this.accessDenied = false;
                if (typeof MediaStreamTrack !== 'undefined' && _this.properties.audioSource instanceof MediaStreamTrack) {
                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                    mediaStream.addTrack(_this.properties.audioSource);
                }
                if (typeof MediaStreamTrack !== 'undefined' && _this.properties.videoSource instanceof MediaStreamTrack) {
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                    mediaStream.addTrack(_this.properties.videoSource);
                }
                if (!!mediaStream.getAudioTracks()[0]) {
                    var enabled = (_this.stream.audioActive !== undefined && _this.stream.audioActive !== null) ? _this.stream.audioActive : !!_this.stream.outboundStreamOpts.publisherProperties.publishAudio;
                    mediaStream.getAudioTracks()[0].enabled = enabled;
                }
                if (!!mediaStream.getVideoTracks()[0]) {
                    var enabled = (_this.stream.videoActive !== undefined && _this.stream.videoActive !== null) ? _this.stream.videoActive : !!_this.stream.outboundStreamOpts.publisherProperties.publishVideo;
                    mediaStream.getVideoTracks()[0].enabled = enabled;
                }
                _this.initializeVideoReference(mediaStream);
                if (!_this.stream.displayMyRemote()) {
                    _this.stream.updateMediaStreamInVideos();
                }
                delete _this.firstVideoElement;
                if (_this.stream.isSendVideo()) {
                    if (!_this.stream.isSendScreen()) {
                        if (platform['isIonicIos'] || platform.name === 'Safari') {
                            _this.videoReference.style.display = 'none';
                            document.body.appendChild(_this.videoReference);
                            var videoDimensionsSet_1 = function () {
                                _this.stream.videoDimensions = {
                                    width: _this.videoReference.videoWidth,
                                    height: _this.videoReference.videoHeight
                                };
                                _this.stream.isLocalStreamReadyToPublish = true;
                                _this.stream.ee.emitEvent('stream-ready-to-publish', []);
                                document.body.removeChild(_this.videoReference);
                            };
                            var interval_1;
                            _this.videoReference.addEventListener('loadedmetadata', function () {
                                if (_this.videoReference.videoWidth === 0) {
                                    interval_1 = setInterval(function () {
                                        if (_this.videoReference.videoWidth !== 0) {
                                            clearInterval(interval_1);
                                            videoDimensionsSet_1();
                                        }
                                    }, 40);
                                }
                                else {
                                    videoDimensionsSet_1();
                                }
                            });
                        }
                        else {
                            var _a = _this.getVideoDimensions(mediaStream), width = _a.width, height = _a.height;
                            if ((platform.os.family === 'iOS' || platform.os.family === 'Android') && (window.innerHeight > window.innerWidth)) {
                                _this.stream.videoDimensions = {
                                    width: height || 0,
                                    height: width || 0
                                };
                            }
                            else {
                                _this.stream.videoDimensions = {
                                    width: width || 0,
                                    height: height || 0
                                };
                            }
                            _this.stream.isLocalStreamReadyToPublish = true;
                            _this.stream.ee.emitEvent('stream-ready-to-publish', []);
                        }
                    }
                    else {
                        _this.videoReference.addEventListener('loadedmetadata', function () {
                            _this.stream.videoDimensions = {
                                width: _this.videoReference.videoWidth,
                                height: _this.videoReference.videoHeight
                            };
                            _this.screenShareResizeInterval = setInterval(function () {
                                var firefoxSettings = mediaStream.getVideoTracks()[0].getSettings();
                                var newWidth = (platform.name === 'Chrome' || platform.name === 'Opera') ? _this.videoReference.videoWidth : firefoxSettings.width;
                                var newHeight = (platform.name === 'Chrome' || platform.name === 'Opera') ? _this.videoReference.videoHeight : firefoxSettings.height;
                                if (_this.stream.isLocalStreamPublished &&
                                    (newWidth !== _this.stream.videoDimensions.width ||
                                        newHeight !== _this.stream.videoDimensions.height)) {
                                    var oldValue_1 = { width: _this.stream.videoDimensions.width, height: _this.stream.videoDimensions.height };
                                    _this.stream.videoDimensions = {
                                        width: newWidth || 0,
                                        height: newHeight || 0
                                    };
                                    _this.session.openvidu.sendRequest('streamPropertyChanged', {
                                        streamId: _this.stream.streamId,
                                        property: 'videoDimensions',
                                        newValue: JSON.stringify(_this.stream.videoDimensions),
                                        reason: 'screenResized'
                                    }, function (error, response) {
                                        if (error) {
                                            logger.error("Error sending 'streamPropertyChanged' event", error);
                                        }
                                        else {
                                            _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this.stream, 'videoDimensions', _this.stream.videoDimensions, oldValue_1, 'screenResized')]);
                                            _this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, _this.stream, 'videoDimensions', _this.stream.videoDimensions, oldValue_1, 'screenResized')]);
                                        }
                                    });
                                }
                            }, 500);
                            _this.stream.isLocalStreamReadyToPublish = true;
                            _this.stream.ee.emitEvent('stream-ready-to-publish', []);
                        });
                    }
                }
                else {
                    _this.stream.isLocalStreamReadyToPublish = true;
                    _this.stream.ee.emitEvent('stream-ready-to-publish', []);
                }
                resolve();
            };
            var getMediaSuccess = function (mediaStream, definedAudioConstraint) {
                _this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                if (_this.stream.isSendScreen() && _this.stream.isSendAudio()) {
                    constraintsAux.audio = definedAudioConstraint;
                    constraintsAux.video = false;
                    startTime = Date.now();
                    _this.setPermissionDialogTimer(timeForDialogEvent);
                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(function (audioOnlyStream) {
                        _this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                        mediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                        successCallback(mediaStream);
                    })
                        .catch(function (error) {
                        _this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                        mediaStream.getAudioTracks().forEach(function (track) {
                            track.stop();
                        });
                        mediaStream.getVideoTracks().forEach(function (track) {
                            track.stop();
                        });
                        errorCallback(_this.openvidu.generateAudioDeviceError(error, constraints));
                        return;
                    });
                }
                else {
                    successCallback(mediaStream);
                }
            };
            var getMediaError = function (error) {
                logger.error(error);
                _this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                if (error.name === 'Error') {
                    error.name = error.constructor.name;
                }
                var errorName, errorMessage;
                switch (error.name.toLowerCase()) {
                    case 'notfounderror':
                        navigator.mediaDevices.getUserMedia({
                            audio: false,
                            video: constraints.video
                        })
                            .then(function (mediaStream) {
                            mediaStream.getVideoTracks().forEach(function (track) {
                                track.stop();
                            });
                            errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                            errorMessage = error.toString();
                            errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                        }).catch(function (e) {
                            errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                            errorMessage = error.toString();
                            errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                        });
                        break;
                    case 'notallowederror':
                        errorName = _this.stream.isSendScreen() ? OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED : OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                        errorMessage = error.toString();
                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                        break;
                    case 'overconstrainederror':
                        navigator.mediaDevices.getUserMedia({
                            audio: false,
                            video: constraints.video
                        })
                            .then(function (mediaStream) {
                            mediaStream.getVideoTracks().forEach(function (track) {
                                track.stop();
                            });
                            if (error.constraint.toLowerCase() === 'deviceid') {
                                errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                            }
                            else {
                                errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                            }
                            errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                        }).catch(function (e) {
                            if (error.constraint.toLowerCase() === 'deviceid') {
                                errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                errorMessage = "Video input device with deviceId '" + constraints.video.deviceId.exact + "' not found";
                            }
                            else {
                                errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                errorMessage = "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                            }
                            errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                        });
                        break;
                    case 'aborterror':
                    case 'notreadableerror':
                        errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ALREADY_IN_USE;
                        errorMessage = error.toString();
                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                        break;
                    default:
                        errorName = OpenViduError_1.OpenViduErrorName.GENERIC_ERROR;
                        errorMessage = error.toString();
                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                        break;
                }
            };
            _this.openvidu.generateMediaConstraints(_this.properties)
                .then(function (myConstraints) {
                var _a, _b;
                if (!!myConstraints.videoTrack && !!myConstraints.audioTrack ||
                    !!myConstraints.audioTrack && ((_a = myConstraints.constraints) === null || _a === void 0 ? void 0 : _a.video) === false ||
                    !!myConstraints.videoTrack && ((_b = myConstraints.constraints) === null || _b === void 0 ? void 0 : _b.audio) === false) {
                    successCallback(_this.openvidu.addAlreadyProvidedTracks(myConstraints, new MediaStream()));
                    return;
                }
                constraints = myConstraints.constraints;
                var outboundStreamOptions = {
                    mediaConstraints: constraints,
                    publisherProperties: _this.properties
                };
                _this.stream.setOutboundStreamOptions(outboundStreamOptions);
                var definedAudioConstraint = ((constraints.audio === undefined) ? true : constraints.audio);
                constraintsAux.audio = _this.stream.isSendScreen() ? false : definedAudioConstraint;
                constraintsAux.video = constraints.video;
                startTime = Date.now();
                _this.setPermissionDialogTimer(timeForDialogEvent);
                if (_this.stream.isSendScreen() && navigator.mediaDevices['getDisplayMedia'] && platform.name !== 'Electron') {
                    navigator.mediaDevices['getDisplayMedia']({ video: true })
                        .then(function (mediaStream) {
                        _this.openvidu.addAlreadyProvidedTracks(myConstraints, mediaStream);
                        getMediaSuccess(mediaStream, definedAudioConstraint);
                    })
                        .catch(function (error) {
                        getMediaError(error);
                    });
                }
                else {
                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(function (mediaStream) {
                        _this.openvidu.addAlreadyProvidedTracks(myConstraints, mediaStream);
                        getMediaSuccess(mediaStream, definedAudioConstraint);
                    })
                        .catch(function (error) {
                        getMediaError(error);
                    });
                }
            })
                .catch(function (error) {
                errorCallback(error);
            });
        });
    };
    Publisher.prototype.getVideoDimensions = function (mediaStream) {
        return mediaStream.getVideoTracks()[0].getSettings();
    };
    Publisher.prototype.reestablishStreamPlayingEvent = function () {
        if (this.ee.getListeners('streamPlaying').length > 0) {
            this.addPlayEventToFirstVideo();
        }
    };
    Publisher.prototype.initializeVideoReference = function (mediaStream) {
        this.videoReference = document.createElement('video');
        if (platform.name === 'Safari') {
            this.videoReference.setAttribute('playsinline', 'true');
        }
        this.stream.setMediaStream(mediaStream);
        if (!!this.firstVideoElement) {
            this.createVideoElement(this.firstVideoElement.targetElement, this.properties.insertMode);
        }
        this.videoReference.srcObject = mediaStream;
    };
    Publisher.prototype.setPermissionDialogTimer = function (waitTime) {
        var _this = this;
        this.permissionDialogTimeout = setTimeout(function () {
            _this.emitEvent('accessDialogOpened', []);
        }, waitTime);
    };
    Publisher.prototype.clearPermissionDialogTimer = function (startTime, waitTime) {
        clearTimeout(this.permissionDialogTimeout);
        if ((Date.now() - startTime) > waitTime) {
            this.emitEvent('accessDialogClosed', []);
        }
    };
    return Publisher;
}(StreamManager_1.StreamManager));
exports.Publisher = Publisher;

},{"../OpenViduInternal/Enums/OpenViduError":34,"../OpenViduInternal/Events/StreamEvent":43,"../OpenViduInternal/Events/StreamPropertyChangedEvent":45,"../OpenViduInternal/Events/VideoElementEvent":46,"../OpenViduInternal/Logger/OpenViduLogger":56,"./Session":29,"./Stream":30,"./StreamManager":31,"platform":8}],29:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Connection_1 = require("./Connection");
var Filter_1 = require("./Filter");
var Subscriber_1 = require("./Subscriber");
var EventDispatcher_1 = require("./EventDispatcher");
var ConnectionEvent_1 = require("../OpenViduInternal/Events/ConnectionEvent");
var FilterEvent_1 = require("../OpenViduInternal/Events/FilterEvent");
var RecordingEvent_1 = require("../OpenViduInternal/Events/RecordingEvent");
var SessionDisconnectedEvent_1 = require("../OpenViduInternal/Events/SessionDisconnectedEvent");
var SignalEvent_1 = require("../OpenViduInternal/Events/SignalEvent");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var platform = require("platform");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var Session = (function (_super) {
    __extends(Session, _super);
    function Session(openvidu) {
        var _this = _super.call(this) || this;
        _this.streamManagers = [];
        _this.remoteStreamsCreated = {};
        _this.isFirstIonicIosSubscriber = true;
        _this.countDownForIonicIosSubscribersActive = true;
        _this.remoteConnections = {};
        _this.startSpeakingEventsEnabled = false;
        _this.startSpeakingEventsEnabledOnce = false;
        _this.stopSpeakingEventsEnabled = false;
        _this.stopSpeakingEventsEnabledOnce = false;
        _this.openvidu = openvidu;
        return _this;
    }
    Session.prototype.connect = function (token, metadata) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.processToken(token);
            if (_this.openvidu.checkSystemRequirements()) {
                _this.options = {
                    sessionId: _this.sessionId,
                    participantId: token,
                    metadata: !!metadata ? _this.stringClientMetadata(metadata) : ''
                };
                _this.connectAux(token).then(function () {
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            }
            else {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.BROWSER_NOT_SUPPORTED, 'Browser ' + platform.name + ' (version ' + platform.version + ') for ' + platform.os.family + ' is not supported in OpenVidu'));
            }
        });
    };
    Session.prototype.disconnect = function () {
        this.leave(false, 'disconnect');
    };
    Session.prototype.subscribe = function (stream, targetElement, param3, param4) {
        var properties = {};
        if (!!param3 && typeof param3 !== 'function') {
            properties = {
                insertMode: (typeof param3.insertMode !== 'undefined') ? ((typeof param3.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[param3.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: (typeof param3.subscribeToAudio !== 'undefined') ? param3.subscribeToAudio : true,
                subscribeToVideo: (typeof param3.subscribeToVideo !== 'undefined') ? param3.subscribeToVideo : true
            };
        }
        else {
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: true,
                subscribeToVideo: true
            };
        }
        var completionHandler;
        if (!!param3 && (typeof param3 === 'function')) {
            completionHandler = param3;
        }
        else if (!!param4) {
            completionHandler = param4;
        }
        logger.info('Subscribing to ' + stream.connection.connectionId);
        stream.subscribe()
            .then(function () {
            logger.info('Subscribed correctly to ' + stream.connection.connectionId);
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
        })
            .catch(function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
        });
        var subscriber = new Subscriber_1.Subscriber(stream, targetElement, properties);
        if (!!subscriber.targetElement) {
            stream.streamManager.createVideoElement(subscriber.targetElement, properties.insertMode);
        }
        return subscriber;
    };
    Session.prototype.subscribeAsync = function (stream, targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var subscriber;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(subscriber);
                }
            };
            if (!!properties) {
                subscriber = _this.subscribe(stream, targetElement, properties, callback);
            }
            else {
                subscriber = _this.subscribe(stream, targetElement, callback);
            }
        });
    };
    Session.prototype.unsubscribe = function (subscriber) {
        var connectionId = subscriber.stream.connection.connectionId;
        logger.info('Unsubscribing from ' + connectionId);
        this.openvidu.sendRequest('unsubscribeFromVideo', { sender: subscriber.stream.connection.connectionId }, function (error, response) {
            if (error) {
                logger.error('Error unsubscribing from ' + connectionId, error);
            }
            else {
                logger.info('Unsubscribed correctly from ' + connectionId);
            }
            subscriber.stream.disposeWebRtcPeer();
            subscriber.stream.disposeMediaStream();
        });
        subscriber.stream.streamManager.removeAllVideos();
    };
    Session.prototype.publish = function (publisher) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            publisher.session = _this;
            publisher.stream.session = _this;
            if (!publisher.stream.publishedOnce) {
                _this.connection.addStream(publisher.stream);
                publisher.stream.publish()
                    .then(function () {
                    resolve();
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            else {
                publisher.initialize()
                    .then(function () {
                    _this.connection.addStream(publisher.stream);
                    publisher.reestablishStreamPlayingEvent();
                    publisher.stream.publish()
                        .then(function () {
                        resolve();
                    })
                        .catch(function (error) {
                        reject(error);
                    });
                }).catch(function (error) {
                    reject(error);
                });
            }
        });
    };
    Session.prototype.unpublish = function (publisher) {
        var stream = publisher.stream;
        if (!stream.connection) {
            logger.error('The associated Connection object of this Publisher is null', stream);
            return;
        }
        else if (stream.connection !== this.connection) {
            logger.error('The associated Connection object of this Publisher is not your local Connection.' +
                "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method", stream);
            return;
        }
        else {
            logger.info('Unpublishing local media (' + stream.connection.connectionId + ')');
            this.openvidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    logger.error(error);
                }
                else {
                    logger.info('Media unpublished correctly');
                }
            });
            stream.disposeWebRtcPeer();
            delete stream.connection.stream;
            var streamEvent = new StreamEvent_1.StreamEvent(true, publisher, 'streamDestroyed', publisher.stream, 'unpublish');
            publisher.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehavior();
        }
    };
    Session.prototype.forceDisconnect = function (connection) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.info('Forcing disconnect for connection ' + connection.connectionId);
            _this.openvidu.sendRequest('forceDisconnect', { connectionId: connection.connectionId }, function (error, response) {
                if (error) {
                    logger.error('Error forcing disconnect for Connection ' + connection.connectionId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to force a disconnection"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    logger.info('Forcing disconnect correctly for Connection ' + connection.connectionId);
                    resolve();
                }
            });
        });
    };
    Session.prototype.forceUnpublish = function (stream) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.info('Forcing unpublish for stream ' + stream.streamId);
            _this.openvidu.sendRequest('forceUnpublish', { streamId: stream.streamId }, function (error, response) {
                if (error) {
                    logger.error('Error forcing unpublish for Stream ' + stream.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to force an unpublishing"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    logger.info('Forcing unpublish correctly for Stream ' + stream.streamId);
                    resolve();
                }
            });
        });
    };
    Session.prototype.signal = function (signal) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var signalMessage = {};
            if (signal.to && signal.to.length > 0) {
                var connectionIds_1 = [];
                signal.to.forEach(function (connection) {
                    if (!!connection.connectionId) {
                        connectionIds_1.push(connection.connectionId);
                    }
                });
                signalMessage['to'] = connectionIds_1;
            }
            else {
                signalMessage['to'] = [];
            }
            signalMessage['data'] = signal.data ? signal.data : '';
            var typeAux = signal.type ? signal.type : 'signal';
            if (!!typeAux) {
                if (typeAux.substring(0, 7) !== 'signal:') {
                    typeAux = 'signal:' + typeAux;
                }
            }
            signalMessage['type'] = typeAux;
            _this.openvidu.sendRequest('sendMessage', {
                message: JSON.stringify(signalMessage)
            }, function (error, response) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    };
    Session.prototype.on = function (type, handler) {
        _super.prototype.onAux.call(this, type, "Event '" + type + "' triggered by 'Session'", handler);
        if (type === 'publisherStartSpeaking') {
            this.startSpeakingEventsEnabled = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && str.hasAudio) {
                    str.enableStartSpeakingEvent();
                }
            }
        }
        if (type === 'publisherStopSpeaking') {
            this.stopSpeakingEventsEnabled = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && str.hasAudio) {
                    str.enableStopSpeakingEvent();
                }
            }
        }
        return this;
    };
    Session.prototype.once = function (type, handler) {
        _super.prototype.onceAux.call(this, type, "Event '" + type + "' triggered once by 'Session'", handler);
        if (type === 'publisherStartSpeaking') {
            this.startSpeakingEventsEnabledOnce = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && str.hasAudio) {
                    str.enableOnceStartSpeakingEvent();
                }
            }
        }
        if (type === 'publisherStopSpeaking') {
            this.stopSpeakingEventsEnabledOnce = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && str.hasAudio) {
                    str.enableOnceStopSpeakingEvent();
                }
            }
        }
        return this;
    };
    Session.prototype.off = function (type, handler) {
        _super.prototype.off.call(this, type, handler);
        if (type === 'publisherStartSpeaking') {
            var remainingStartSpeakingListeners = this.ee.getListeners(type).length;
            if (remainingStartSpeakingListeners === 0) {
                this.startSpeakingEventsEnabled = false;
                for (var connectionId in this.remoteConnections) {
                    var str = this.remoteConnections[connectionId].stream;
                    if (!!str) {
                        str.disableStartSpeakingEvent(false);
                    }
                }
            }
        }
        if (type === 'publisherStopSpeaking') {
            var remainingStopSpeakingListeners = this.ee.getListeners(type).length;
            if (remainingStopSpeakingListeners === 0) {
                this.stopSpeakingEventsEnabled = false;
                for (var connectionId in this.remoteConnections) {
                    var str = this.remoteConnections[connectionId].stream;
                    if (!!str) {
                        str.disableStopSpeakingEvent(false);
                    }
                }
            }
        }
        return this;
    };
    Session.prototype.onParticipantJoined = function (response) {
        var _this = this;
        this.getConnection(response.id, '')
            .then(function (connection) {
            logger.warn('Connection ' + response.id + ' already exists in connections list');
        })
            .catch(function (openViduError) {
            var connection = new Connection_1.Connection(_this, response);
            _this.remoteConnections[response.id] = connection;
            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
        });
    };
    Session.prototype.onParticipantLeft = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.connectionId, 'Remote connection ' + msg.connectionId + " unknown when 'onParticipantLeft'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            if (!!connection.stream) {
                var stream = connection.stream;
                var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', stream, msg.reason);
                _this.ee.emitEvent('streamDestroyed', [streamEvent]);
                streamEvent.callDefaultBehavior();
                delete _this.remoteStreamsCreated[stream.streamId];
                if (Object.keys(_this.remoteStreamsCreated).length === 0) {
                    _this.isFirstIonicIosSubscriber = true;
                    _this.countDownForIonicIosSubscribersActive = true;
                }
            }
            delete _this.remoteConnections[connection.connectionId];
            _this.ee.emitEvent('connectionDestroyed', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionDestroyed', connection, msg.reason)]);
        })
            .catch(function (openViduError) {
            logger.error(openViduError);
        });
    };
    Session.prototype.onParticipantPublished = function (response) {
        var _this = this;
        var afterConnectionFound = function (connection) {
            _this.remoteConnections[connection.connectionId] = connection;
            if (!_this.remoteStreamsCreated[connection.stream.streamId]) {
                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', connection.stream, '')]);
            }
            _this.remoteStreamsCreated[connection.stream.streamId] = true;
        };
        var connection;
        this.getRemoteConnection(response.id, "Remote connection '" + response.id + "' unknown when 'onParticipantPublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (con) {
            connection = con;
            response.metadata = con.data;
            connection.options = response;
            connection.initRemoteStreams(response.streams);
            afterConnectionFound(connection);
        })
            .catch(function (openViduError) {
            connection = new Connection_1.Connection(_this, response);
            afterConnectionFound(connection);
        });
    };
    Session.prototype.onParticipantUnpublished = function (msg) {
        var _this = this;
        if (msg.connectionId === this.connection.connectionId) {
            this.stopPublisherStream(msg.reason);
        }
        else {
            this.getRemoteConnection(msg.connectionId, "Remote connection '" + msg.connectionId + "' unknown when 'onParticipantUnpublished'. " +
                'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
                .then(function (connection) {
                var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', connection.stream, msg.reason);
                _this.ee.emitEvent('streamDestroyed', [streamEvent]);
                streamEvent.callDefaultBehavior();
                var streamId = connection.stream.streamId;
                delete _this.remoteStreamsCreated[streamId];
                if (Object.keys(_this.remoteStreamsCreated).length === 0) {
                    _this.isFirstIonicIosSubscriber = true;
                    _this.countDownForIonicIosSubscribersActive = true;
                }
                connection.removeStream(streamId);
            })
                .catch(function (openViduError) {
                logger.error(openViduError);
            });
        }
    };
    Session.prototype.onParticipantEvicted = function (msg) {
        if (msg.connectionId === this.connection.connectionId) {
            if (!!this.sessionId && !this.connection.disposed) {
                this.leave(true, msg.reason);
            }
        }
    };
    Session.prototype.onNewMessage = function (msg) {
        var _this = this;
        logger.info('New signal: ' + JSON.stringify(msg));
        var strippedType = !!msg.type ? msg.type.replace(/^(signal:)/, '') : undefined;
        if (!!msg.from) {
            this.getConnection(msg.from, "Connection '" + msg.from + "' unknow when 'onNewMessage'. Existing remote connections: "
                + JSON.stringify(Object.keys(this.remoteConnections)) + '. Existing local connection: ' + this.connection.connectionId)
                .then(function (connection) {
                _this.ee.emitEvent('signal', [new SignalEvent_1.SignalEvent(_this, strippedType, msg.data, connection)]);
                if (msg.type !== 'signal') {
                    _this.ee.emitEvent(msg.type, [new SignalEvent_1.SignalEvent(_this, strippedType, msg.data, connection)]);
                }
            })
                .catch(function (openViduError) {
                logger.error(openViduError);
            });
        }
        else {
            this.ee.emitEvent('signal', [new SignalEvent_1.SignalEvent(this, strippedType, msg.data, undefined)]);
            if (msg.type !== 'signal') {
                this.ee.emitEvent(msg.type, [new SignalEvent_1.SignalEvent(this, strippedType, msg.data, undefined)]);
            }
        }
    };
    Session.prototype.onStreamPropertyChanged = function (msg) {
        var _this = this;
        var callback = function (connection) {
            if (!!connection.stream && connection.stream.streamId === msg.streamId) {
                var stream = connection.stream;
                var oldValue = void 0;
                switch (msg.property) {
                    case 'audioActive':
                        oldValue = stream.audioActive;
                        msg.newValue = msg.newValue === 'true';
                        stream.audioActive = msg.newValue;
                        break;
                    case 'videoActive':
                        oldValue = stream.videoActive;
                        msg.newValue = msg.newValue === 'true';
                        stream.videoActive = msg.newValue;
                        break;
                    case 'videoDimensions':
                        oldValue = stream.videoDimensions;
                        msg.newValue = JSON.parse(JSON.parse(msg.newValue));
                        stream.videoDimensions = msg.newValue;
                        break;
                    case 'filter':
                        oldValue = stream.filter;
                        msg.newValue = (Object.keys(msg.newValue).length > 0) ? msg.newValue : undefined;
                        if (msg.newValue !== undefined) {
                            stream.filter = new Filter_1.Filter(msg.newValue.type, msg.newValue.options);
                            stream.filter.stream = stream;
                            if (msg.newValue.lastExecMethod) {
                                stream.filter.lastExecMethod = msg.newValue.lastExecMethod;
                            }
                        }
                        else {
                            delete stream.filter;
                        }
                        msg.newValue = stream.filter;
                        break;
                }
                _this.ee.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, stream, msg.property, msg.newValue, oldValue, msg.reason)]);
                if (!!stream.streamManager) {
                    stream.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(stream.streamManager, stream, msg.property, msg.newValue, oldValue, msg.reason)]);
                }
            }
            else {
                logger.error("No stream with streamId '" + msg.streamId + "' found for connection '" + msg.connectionId + "' on 'streamPropertyChanged' event");
            }
        };
        if (msg.connectionId === this.connection.connectionId) {
            callback(this.connection);
        }
        else {
            this.getRemoteConnection(msg.connectionId, 'Remote connection ' + msg.connectionId + " unknown when 'onStreamPropertyChanged'. " +
                'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
                .then(function (connection) {
                callback(connection);
            })
                .catch(function (openViduError) {
                logger.error(openViduError);
            });
        }
    };
    Session.prototype.recvIceCandidate = function (msg) {
        var candidate = {
            candidate: msg.candidate,
            component: msg.component,
            foundation: msg.foundation,
            port: msg.port,
            priority: msg.priority,
            protocol: msg.protocol,
            relatedAddress: msg.relatedAddress,
            relatedPort: msg.relatedPort,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex,
            tcpType: msg.tcpType,
            usernameFragment: msg.usernameFragment,
            type: msg.type,
            toJSON: function () {
                return { candidate: msg.candidate };
            }
        };
        this.getConnection(msg.senderConnectionId, 'Connection not found for connectionId ' + msg.senderConnectionId + ' owning endpoint ' + msg.endpointName + '. Ice candidate will be ignored: ' + candidate)
            .then(function (connection) {
            var stream = connection.stream;
            stream.getWebRtcPeer().addIceCandidate(candidate).catch(function (error) {
                logger.error('Error adding candidate for ' + stream.streamId
                    + ' stream of endpoint ' + msg.endpointName + ': ' + error);
            });
        })
            .catch(function (openViduError) {
            logger.error(openViduError);
        });
    };
    Session.prototype.onSessionClosed = function (msg) {
        logger.info('Session closed: ' + JSON.stringify(msg));
        var s = msg.sessionId;
        if (s !== undefined) {
            this.ee.emitEvent('session-closed', [{
                    session: s
                }]);
        }
        else {
            logger.warn('Session undefined on session closed', msg);
        }
    };
    Session.prototype.onLostConnection = function (reason) {
        logger.warn('Lost connection in Session ' + this.sessionId);
        if (!!this.sessionId && !this.connection.disposed) {
            this.leave(true, reason);
        }
    };
    Session.prototype.onRecoveredConnection = function () {
        logger.info('Recovered connection in Session ' + this.sessionId);
        this.reconnectBrokenStreams();
        this.ee.emitEvent('reconnected', []);
    };
    Session.prototype.onMediaError = function (params) {
        logger.error('Media error: ' + JSON.stringify(params));
        var err = params.error;
        if (err) {
            this.ee.emitEvent('error-media', [{
                    error: err
                }]);
        }
        else {
            logger.warn('Received undefined media error. Params:', params);
        }
    };
    Session.prototype.onRecordingStarted = function (response) {
        this.ee.emitEvent('recordingStarted', [new RecordingEvent_1.RecordingEvent(this, 'recordingStarted', response.id, response.name)]);
    };
    Session.prototype.onRecordingStopped = function (response) {
        this.ee.emitEvent('recordingStopped', [new RecordingEvent_1.RecordingEvent(this, 'recordingStopped', response.id, response.name, response.reason)]);
    };
    Session.prototype.onFilterEventDispatched = function (response) {
        var connectionId = response.connectionId;
        var streamId = response.streamId;
        this.getConnection(connectionId, 'No connection found for connectionId ' + connectionId)
            .then(function (connection) {
            logger.info('Filter event dispatched');
            var stream = connection.stream;
            stream.filter.handlers[response.eventType](new FilterEvent_1.FilterEvent(stream.filter, response.eventType, response.data));
        });
    };
    Session.prototype.reconnectBrokenStreams = function () {
        logger.info('Re-establishing media connections...');
        var someReconnection = false;
        if (!!this.connection.stream && this.connection.stream.streamIceConnectionStateBroken()) {
            logger.warn('Re-establishing Publisher ' + this.connection.stream.streamId);
            this.connection.stream.initWebRtcPeerSend(true);
            someReconnection = true;
        }
        for (var _i = 0, _a = Object.values(this.remoteConnections); _i < _a.length; _i++) {
            var remoteConnection = _a[_i];
            if (!!remoteConnection.stream && remoteConnection.stream.streamIceConnectionStateBroken()) {
                logger.warn('Re-establishing Subscriber ' + remoteConnection.stream.streamId);
                remoteConnection.stream.initWebRtcPeerReceive(true);
                someReconnection = true;
            }
        }
        if (!someReconnection) {
            logger.info('There were no media streams in need of a reconnection');
        }
    };
    Session.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    Session.prototype.leave = function (forced, reason) {
        var _this = this;
        forced = !!forced;
        logger.info('Leaving Session (forced=' + forced + ')');
        if (!!this.connection) {
            if (!this.connection.disposed && !forced) {
                this.openvidu.sendRequest('leaveRoom', function (error, response) {
                    if (error) {
                        logger.error(error);
                    }
                    _this.openvidu.closeWs();
                });
            }
            else {
                this.openvidu.closeWs();
            }
            this.stopPublisherStream(reason);
            if (!this.connection.disposed) {
                var sessionDisconnectEvent = new SessionDisconnectedEvent_1.SessionDisconnectedEvent(this, reason);
                this.ee.emitEvent('sessionDisconnected', [sessionDisconnectEvent]);
                sessionDisconnectEvent.callDefaultBehavior();
            }
        }
        else {
            logger.warn('You were not connected to the session ' + this.sessionId);
        }
    };
    Session.prototype.initializeParams = function (token) {
        var joinParams = {
            token: (!!token) ? token : '',
            session: this.sessionId,
            platform: !!platform.description ? platform.description : 'unknown',
            metadata: !!this.options.metadata ? this.options.metadata : '',
            secret: this.openvidu.getSecret(),
            recorder: this.openvidu.getRecorder()
        };
        return joinParams;
    };
    Session.prototype.connectAux = function (token) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.openvidu.startWs(function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    var joinParams = _this.initializeParams(token);
                    _this.openvidu.sendRequest('joinRoom', joinParams, function (error, response) {
                        if (!!error) {
                            reject(error);
                        }
                        else {
                            _this.capabilities = {
                                subscribe: true,
                                publish: _this.openvidu.role !== 'SUBSCRIBER',
                                forceUnpublish: _this.openvidu.role === 'MODERATOR',
                                forceDisconnect: _this.openvidu.role === 'MODERATOR'
                            };
                            _this.connection = new Connection_1.Connection(_this);
                            _this.connection.connectionId = response.id;
                            _this.connection.creationTime = response.createdAt;
                            _this.connection.data = response.metadata;
                            _this.connection.rpcSessionId = response.sessionId;
                            var events_1 = {
                                connections: new Array(),
                                streams: new Array()
                            };
                            var existingParticipants = response.value;
                            existingParticipants.forEach(function (participant) {
                                var connection = new Connection_1.Connection(_this, participant);
                                _this.remoteConnections[connection.connectionId] = connection;
                                events_1.connections.push(connection);
                                if (!!connection.stream) {
                                    _this.remoteStreamsCreated[connection.stream.streamId] = true;
                                    events_1.streams.push(connection.stream);
                                }
                            });
                            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', _this.connection, '')]);
                            events_1.connections.forEach(function (connection) {
                                _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
                            });
                            events_1.streams.forEach(function (stream) {
                                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', stream, '')]);
                            });
                            resolve();
                        }
                    });
                }
            });
        });
    };
    Session.prototype.stopPublisherStream = function (reason) {
        if (!!this.connection.stream) {
            this.connection.stream.disposeWebRtcPeer();
            if (this.connection.stream.isLocalStreamPublished) {
                this.connection.stream.ee.emitEvent('local-stream-destroyed', [reason]);
            }
        }
    };
    Session.prototype.stringClientMetadata = function (metadata) {
        if (typeof metadata !== 'string') {
            return JSON.stringify(metadata);
        }
        else {
            return metadata;
        }
    };
    Session.prototype.getConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                resolve(connection);
            }
            else {
                if (_this.connection.connectionId === connectionId) {
                    resolve(_this.connection);
                }
                else {
                    reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
                }
            }
        });
    };
    Session.prototype.getRemoteConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                resolve(connection);
            }
            else {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
            }
        });
    };
    Session.prototype.processToken = function (token) {
        var match = token.match(/^(wss?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
        if (!!match) {
            var url = {
                protocol: match[1],
                host: match[2],
                hostname: match[3],
                port: match[4],
                pathname: match[5],
                search: match[6],
                hash: match[7]
            };
            var params = token.split('?');
            var queryParams = decodeURI(params[1])
                .split('&')
                .map(function (param) { return param.split('='); })
                .reduce(function (values, _a) {
                var key = _a[0], value = _a[1];
                values[key] = value;
                return values;
            }, {});
            this.sessionId = queryParams['sessionId'];
            var secret = queryParams['secret'];
            var recorder = queryParams['recorder'];
            var coturnIp = queryParams['coturnIp'];
            var turnUsername = queryParams['turnUsername'];
            var turnCredential = queryParams['turnCredential'];
            var role = queryParams['role'];
            var webrtcStatsInterval = queryParams['webrtcStatsInterval'];
            var openviduServerVersion = queryParams['version'];
            if (!!secret) {
                this.openvidu.secret = secret;
            }
            if (!!recorder) {
                this.openvidu.recorder = true;
            }
            if (!!turnUsername && !!turnCredential) {
                var stunUrl = 'stun:' + coturnIp + ':3478';
                var turnUrl1 = 'turn:' + coturnIp + ':3478';
                var turnUrl2 = turnUrl1 + '?transport=tcp';
                this.openvidu.iceServers = [
                    { urls: [stunUrl] },
                    { urls: [turnUrl1, turnUrl2], username: turnUsername, credential: turnCredential }
                ];
                logger.log("STUN/TURN server IP: " + coturnIp);
                logger.log('TURN temp credentials [' + turnUsername + ':' + turnCredential + ']');
            }
            if (!!role) {
                this.openvidu.role = role;
            }
            if (!!webrtcStatsInterval) {
                this.openvidu.webrtcStatsInterval = +webrtcStatsInterval;
            }
            if (!!openviduServerVersion) {
                logger.info("openvidu-server version: " + openviduServerVersion);
                if (openviduServerVersion !== this.openvidu.libraryVersion) {
                    logger.error('OpenVidu Server (' + openviduServerVersion +
                        ') and OpenVidu Browser (' + this.openvidu.libraryVersion +
                        ') versions do NOT match. There may be incompatibilities');
                }
            }
            this.openvidu.wsUri = 'wss://' + url.host + '/openvidu';
            this.openvidu.httpUri = 'https://' + url.host;
        }
        else {
            logger.error('Token "' + token + '" is not valid');
        }
    };
    return Session;
}(EventDispatcher_1.EventDispatcher));
exports.Session = Session;

},{"../OpenViduInternal/Enums/OpenViduError":34,"../OpenViduInternal/Enums/VideoInsertMode":35,"../OpenViduInternal/Events/ConnectionEvent":36,"../OpenViduInternal/Events/FilterEvent":38,"../OpenViduInternal/Events/RecordingEvent":40,"../OpenViduInternal/Events/SessionDisconnectedEvent":41,"../OpenViduInternal/Events/SignalEvent":42,"../OpenViduInternal/Events/StreamEvent":43,"../OpenViduInternal/Events/StreamPropertyChangedEvent":45,"../OpenViduInternal/Logger/OpenViduLogger":56,"./Connection":23,"./EventDispatcher":24,"./Filter":25,"./Subscriber":32,"platform":8}],30:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Filter_1 = require("./Filter");
var Subscriber_1 = require("./Subscriber");
var EventDispatcher_1 = require("./EventDispatcher");
var WebRtcPeer_1 = require("../OpenViduInternal/WebRtcPeer/WebRtcPeer");
var WebRtcStats_1 = require("../OpenViduInternal/WebRtcStats/WebRtcStats");
var PublisherSpeakingEvent_1 = require("../OpenViduInternal/Events/PublisherSpeakingEvent");
var StreamManagerEvent_1 = require("../OpenViduInternal/Events/StreamManagerEvent");
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var hark = require("hark");
var platform = require("platform");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var Stream = (function (_super) {
    __extends(Stream, _super);
    function Stream(session, options) {
        var _this = _super.call(this) || this;
        _this.isSubscribeToRemote = false;
        _this.isLocalStreamReadyToPublish = false;
        _this.isLocalStreamPublished = false;
        _this.publishedOnce = false;
        _this.publisherStartSpeakingEventEnabled = false;
        _this.publisherStartSpeakingEventEnabledOnce = false;
        _this.publisherStopSpeakingEventEnabled = false;
        _this.publisherStopSpeakingEventEnabledOnce = false;
        _this.volumeChangeEventEnabled = false;
        _this.volumeChangeEventEnabledOnce = false;
        _this.session = session;
        if (options.hasOwnProperty('id')) {
            _this.inboundStreamOpts = options;
            _this.streamId = _this.inboundStreamOpts.id;
            _this.creationTime = _this.inboundStreamOpts.createdAt;
            _this.hasAudio = _this.inboundStreamOpts.hasAudio;
            _this.hasVideo = _this.inboundStreamOpts.hasVideo;
            if (_this.hasAudio) {
                _this.audioActive = _this.inboundStreamOpts.audioActive;
            }
            if (_this.hasVideo) {
                _this.videoActive = _this.inboundStreamOpts.videoActive;
                _this.typeOfVideo = (!_this.inboundStreamOpts.typeOfVideo) ? undefined : _this.inboundStreamOpts.typeOfVideo;
                _this.frameRate = (_this.inboundStreamOpts.frameRate === -1) ? undefined : _this.inboundStreamOpts.frameRate;
                _this.videoDimensions = _this.inboundStreamOpts.videoDimensions;
            }
            if (!!_this.inboundStreamOpts.filter && (Object.keys(_this.inboundStreamOpts.filter).length > 0)) {
                if (!!_this.inboundStreamOpts.filter.lastExecMethod && Object.keys(_this.inboundStreamOpts.filter.lastExecMethod).length === 0) {
                    delete _this.inboundStreamOpts.filter.lastExecMethod;
                }
                _this.filter = _this.inboundStreamOpts.filter;
            }
        }
        else {
            _this.outboundStreamOpts = options;
            _this.hasAudio = _this.isSendAudio();
            _this.hasVideo = _this.isSendVideo();
            if (_this.hasAudio) {
                _this.audioActive = !!_this.outboundStreamOpts.publisherProperties.publishAudio;
            }
            if (_this.hasVideo) {
                _this.videoActive = !!_this.outboundStreamOpts.publisherProperties.publishVideo;
                _this.frameRate = _this.outboundStreamOpts.publisherProperties.frameRate;
                if (typeof MediaStreamTrack !== 'undefined' && _this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack) {
                    _this.typeOfVideo = 'CUSTOM';
                }
                else {
                    _this.typeOfVideo = _this.isSendScreen() ? 'SCREEN' : 'CAMERA';
                }
            }
            if (!!_this.outboundStreamOpts.publisherProperties.filter) {
                _this.filter = _this.outboundStreamOpts.publisherProperties.filter;
            }
        }
        _this.ee.on('mediastream-updated', function () {
            _this.streamManager.updateMediaStream(_this.mediaStream);
            logger.debug('Video srcObject [' + _this.mediaStream + '] updated in stream [' + _this.streamId + ']');
        });
        return _this;
    }
    Stream.prototype.on = function (type, handler) {
        _super.prototype.onAux.call(this, type, "Event '" + type + "' triggered by stream '" + this.streamId + "'", handler);
        return this;
    };
    Stream.prototype.once = function (type, handler) {
        _super.prototype.onceAux.call(this, type, "Event '" + type + "' triggered once by stream '" + this.streamId + "'", handler);
        return this;
    };
    Stream.prototype.off = function (type, handler) {
        _super.prototype.off.call(this, type, handler);
        return this;
    };
    Stream.prototype.applyFilter = function (type, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.info('Applying filter to stream ' + _this.streamId);
            options = !!options ? options : {};
            if (typeof options !== 'string') {
                options = JSON.stringify(options);
            }
            _this.session.openvidu.sendRequest('applyFilter', { streamId: _this.streamId, type: type, options: options }, function (error, response) {
                if (error) {
                    logger.error('Error applying filter for Stream ' + _this.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to apply a filter"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    logger.info('Filter successfully applied on Stream ' + _this.streamId);
                    var oldValue = _this.filter;
                    _this.filter = new Filter_1.Filter(type, options);
                    _this.filter.stream = _this;
                    _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    _this.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.streamManager, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    resolve(_this.filter);
                }
            });
        });
    };
    Stream.prototype.removeFilter = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.info('Removing filter of stream ' + _this.streamId);
            _this.session.openvidu.sendRequest('removeFilter', { streamId: _this.streamId }, function (error, response) {
                if (error) {
                    logger.error('Error removing filter for Stream ' + _this.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to remove a filter"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    logger.info('Filter successfully removed from Stream ' + _this.streamId);
                    var oldValue = _this.filter;
                    delete _this.filter;
                    _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    _this.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.streamManager, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    resolve();
                }
            });
        });
    };
    Stream.prototype.getRTCPeerConnection = function () {
        return this.webRtcPeer.pc;
    };
    Stream.prototype.getMediaStream = function () {
        return this.mediaStream;
    };
    Stream.prototype.setMediaStream = function (mediaStream) {
        this.mediaStream = mediaStream;
    };
    Stream.prototype.updateMediaStreamInVideos = function () {
        this.ee.emitEvent('mediastream-updated', []);
    };
    Stream.prototype.getWebRtcPeer = function () {
        return this.webRtcPeer;
    };
    Stream.prototype.subscribeToMyRemote = function (value) {
        this.isSubscribeToRemote = value;
    };
    Stream.prototype.setOutboundStreamOptions = function (outboundStreamOpts) {
        this.outboundStreamOpts = outboundStreamOpts;
    };
    Stream.prototype.subscribe = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.initWebRtcPeerReceive(false)
                .then(function () {
                resolve();
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    Stream.prototype.publish = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.isLocalStreamReadyToPublish) {
                _this.initWebRtcPeerSend(false)
                    .then(function () {
                    resolve();
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            else {
                _this.ee.once('stream-ready-to-publish', function () {
                    _this.publish()
                        .then(function () {
                        resolve();
                    })
                        .catch(function (error) {
                        reject(error);
                    });
                });
            }
        });
    };
    Stream.prototype.disposeWebRtcPeer = function () {
        if (!!this.webRtcPeer) {
            this.webRtcPeer.dispose();
            this.stopWebRtcStats();
        }
        logger.info((!!this.outboundStreamOpts ? 'Outbound ' : 'Inbound ') + "WebRTCPeer from 'Stream' with id [" + this.streamId + '] is now closed');
    };
    Stream.prototype.disposeMediaStream = function () {
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach(function (track) {
                track.stop();
            });
            this.mediaStream.getVideoTracks().forEach(function (track) {
                track.stop();
            });
            delete this.mediaStream;
        }
        if (this.localMediaStreamWhenSubscribedToRemote) {
            this.localMediaStreamWhenSubscribedToRemote.getAudioTracks().forEach(function (track) {
                track.stop();
            });
            this.localMediaStreamWhenSubscribedToRemote.getVideoTracks().forEach(function (track) {
                track.stop();
            });
            delete this.localMediaStreamWhenSubscribedToRemote;
        }
        if (!!this.speechEvent) {
            if (!!this.speechEvent.stop) {
                this.speechEvent.stop();
            }
            delete this.speechEvent;
        }
        logger.info((!!this.outboundStreamOpts ? 'Local ' : 'Remote ') + "MediaStream from 'Stream' with id [" + this.streamId + '] is now disposed');
    };
    Stream.prototype.displayMyRemote = function () {
        return this.isSubscribeToRemote;
    };
    Stream.prototype.isSendAudio = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.audioSource !== null &&
            this.outboundStreamOpts.publisherProperties.audioSource !== false);
    };
    Stream.prototype.isSendVideo = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource !== null &&
            this.outboundStreamOpts.publisherProperties.videoSource !== false);
    };
    Stream.prototype.isSendScreen = function () {
        var screen = this.outboundStreamOpts.publisherProperties.videoSource === 'screen';
        if (platform.name === 'Electron') {
            screen = typeof this.outboundStreamOpts.publisherProperties.videoSource === 'string' &&
                this.outboundStreamOpts.publisherProperties.videoSource.startsWith('screen:');
        }
        return !!this.outboundStreamOpts && screen;
    };
    Stream.prototype.enableStartSpeakingEvent = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        if (!this.publisherStartSpeakingEventEnabled) {
            this.publisherStartSpeakingEventEnabled = true;
            this.speechEvent.on('speaking', function () {
                _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
                _this.publisherStartSpeakingEventEnabledOnce = false;
            });
        }
    };
    Stream.prototype.enableOnceStartSpeakingEvent = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        if (!this.publisherStartSpeakingEventEnabledOnce) {
            this.publisherStartSpeakingEventEnabledOnce = true;
            this.speechEvent.once('speaking', function () {
                if (_this.publisherStartSpeakingEventEnabledOnce) {
                    _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
                }
                _this.disableStartSpeakingEvent(true);
            });
        }
    };
    Stream.prototype.disableStartSpeakingEvent = function (disabledByOnce) {
        if (!!this.speechEvent) {
            this.publisherStartSpeakingEventEnabledOnce = false;
            if (disabledByOnce) {
                if (this.publisherStartSpeakingEventEnabled) {
                    return;
                }
            }
            else {
                this.publisherStartSpeakingEventEnabled = false;
            }
            if (this.volumeChangeEventEnabled ||
                this.volumeChangeEventEnabledOnce ||
                this.publisherStopSpeakingEventEnabled ||
                this.publisherStopSpeakingEventEnabledOnce) {
                this.speechEvent.off('speaking');
            }
            else {
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
    };
    Stream.prototype.enableStopSpeakingEvent = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        if (!this.publisherStopSpeakingEventEnabled) {
            this.publisherStopSpeakingEventEnabled = true;
            this.speechEvent.on('stopped_speaking', function () {
                _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
                _this.publisherStopSpeakingEventEnabledOnce = false;
            });
        }
    };
    Stream.prototype.enableOnceStopSpeakingEvent = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        if (!this.publisherStopSpeakingEventEnabledOnce) {
            this.publisherStopSpeakingEventEnabledOnce = true;
            this.speechEvent.once('stopped_speaking', function () {
                if (_this.publisherStopSpeakingEventEnabledOnce) {
                    _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
                }
                _this.disableStopSpeakingEvent(true);
            });
        }
    };
    Stream.prototype.disableStopSpeakingEvent = function (disabledByOnce) {
        if (!!this.speechEvent) {
            this.publisherStopSpeakingEventEnabledOnce = false;
            if (disabledByOnce) {
                if (this.publisherStopSpeakingEventEnabled) {
                    return;
                }
            }
            else {
                this.publisherStopSpeakingEventEnabled = false;
            }
            if (this.volumeChangeEventEnabled ||
                this.volumeChangeEventEnabledOnce ||
                this.publisherStartSpeakingEventEnabled ||
                this.publisherStartSpeakingEventEnabledOnce) {
                this.speechEvent.off('stopped_speaking');
            }
            else {
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
    };
    Stream.prototype.enableVolumeChangeEvent = function (force) {
        var _this = this;
        if (this.setSpeechEventIfNotExists()) {
            if (!this.volumeChangeEventEnabled || force) {
                this.volumeChangeEventEnabled = true;
                this.speechEvent.on('volume_change', function (harkEvent) {
                    var oldValue = _this.speechEvent.oldVolumeValue;
                    var value = { newValue: harkEvent, oldValue: oldValue };
                    _this.speechEvent.oldVolumeValue = harkEvent;
                    _this.streamManager.emitEvent('streamAudioVolumeChange', [new StreamManagerEvent_1.StreamManagerEvent(_this.streamManager, 'streamAudioVolumeChange', value)]);
                });
            }
        }
        else {
            this.volumeChangeEventEnabled = true;
        }
    };
    Stream.prototype.enableOnceVolumeChangeEvent = function (force) {
        var _this = this;
        if (this.setSpeechEventIfNotExists()) {
            if (!this.volumeChangeEventEnabledOnce || force) {
                this.volumeChangeEventEnabledOnce = true;
                this.speechEvent.once('volume_change', function (harkEvent) {
                    var oldValue = _this.speechEvent.oldVolumeValue;
                    var value = { newValue: harkEvent, oldValue: oldValue };
                    _this.speechEvent.oldVolumeValue = harkEvent;
                    _this.disableVolumeChangeEvent(true);
                    _this.streamManager.emitEvent('streamAudioVolumeChange', [new StreamManagerEvent_1.StreamManagerEvent(_this.streamManager, 'streamAudioVolumeChange', value)]);
                });
            }
        }
        else {
            this.volumeChangeEventEnabledOnce = true;
        }
    };
    Stream.prototype.disableVolumeChangeEvent = function (disabledByOnce) {
        if (!!this.speechEvent) {
            this.volumeChangeEventEnabledOnce = false;
            if (disabledByOnce) {
                if (this.volumeChangeEventEnabled) {
                    return;
                }
            }
            else {
                this.volumeChangeEventEnabled = false;
            }
            if (this.publisherStartSpeakingEventEnabled ||
                this.publisherStartSpeakingEventEnabledOnce ||
                this.publisherStopSpeakingEventEnabled ||
                this.publisherStopSpeakingEventEnabledOnce) {
                this.speechEvent.off('volume_change');
            }
            else {
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
    };
    Stream.prototype.isLocal = function () {
        return (!this.inboundStreamOpts && !!this.outboundStreamOpts);
    };
    Stream.prototype.getSelectedIceCandidate = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.webRtcStats.getSelectedIceCandidateInfo()
                .then(function (report) { return resolve(report); })
                .catch(function (error) { return reject(error); });
        });
    };
    Stream.prototype.getRemoteIceCandidateList = function () {
        return this.webRtcPeer.remoteCandidatesQueue;
    };
    Stream.prototype.getLocalIceCandidateList = function () {
        return this.webRtcPeer.localCandidatesQueue;
    };
    Stream.prototype.streamIceConnectionStateBroken = function () {
        if (!this.getWebRtcPeer() || !this.getRTCPeerConnection()) {
            return false;
        }
        if (this.isLocal && !!this.session.openvidu.advancedConfiguration.forceMediaReconnectionAfterNetworkDrop) {
            logger.warn('OpenVidu Browser advanced configuration option "forceMediaReconnectionAfterNetworkDrop" is enabled. Publisher stream ' + this.streamId + 'will force a reconnection');
            return true;
        }
        var iceConnectionState = this.getRTCPeerConnection().iceConnectionState;
        return iceConnectionState === 'disconnected' || iceConnectionState === 'failed';
    };
    Stream.prototype.setSpeechEventIfNotExists = function () {
        if (!!this.mediaStream) {
            if (!this.speechEvent) {
                var harkOptions = !!this.harkOptions ? this.harkOptions : (this.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {});
                harkOptions.interval = (typeof harkOptions.interval === 'number') ? harkOptions.interval : 100;
                harkOptions.threshold = (typeof harkOptions.threshold === 'number') ? harkOptions.threshold : -50;
                this.speechEvent = hark(this.mediaStream, harkOptions);
            }
            return true;
        }
        return false;
    };
    Stream.prototype.initWebRtcPeerSend = function (reconnect) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!reconnect) {
                _this.initHarkEvents();
            }
            var userMediaConstraints = {
                audio: _this.isSendAudio(),
                video: _this.isSendVideo()
            };
            var options = {
                mediaStream: _this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                iceServers: _this.getIceServersConf(),
                simulcast: false
            };
            var successCallback = function (sdpOfferParam) {
                logger.debug('Sending SDP offer to publish as '
                    + _this.streamId, sdpOfferParam);
                var method = reconnect ? 'reconnectStream' : 'publishVideo';
                var params;
                if (reconnect) {
                    params = {
                        stream: _this.streamId
                    };
                }
                else {
                    var typeOfVideo = '';
                    if (_this.isSendVideo()) {
                        typeOfVideo = (typeof MediaStreamTrack !== 'undefined' && _this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack) ? 'CUSTOM' : (_this.isSendScreen() ? 'SCREEN' : 'CAMERA');
                    }
                    params = {
                        doLoopback: _this.displayMyRemote() || false,
                        hasAudio: _this.isSendAudio(),
                        hasVideo: _this.isSendVideo(),
                        audioActive: _this.audioActive,
                        videoActive: _this.videoActive,
                        typeOfVideo: typeOfVideo,
                        frameRate: !!_this.frameRate ? _this.frameRate : -1,
                        videoDimensions: JSON.stringify(_this.videoDimensions),
                        filter: _this.outboundStreamOpts.publisherProperties.filter
                    };
                }
                params['sdpOffer'] = sdpOfferParam;
                _this.session.openvidu.sendRequest(method, params, function (error, response) {
                    if (error) {
                        if (error.code === 401) {
                            reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to publish"));
                        }
                        else {
                            reject('Error on publishVideo: ' + JSON.stringify(error));
                        }
                    }
                    else {
                        _this.webRtcPeer.processAnswer(response.sdpAnswer, false)
                            .then(function () {
                            _this.streamId = response.id;
                            _this.creationTime = response.createdAt;
                            _this.isLocalStreamPublished = true;
                            _this.publishedOnce = true;
                            if (_this.displayMyRemote()) {
                                _this.localMediaStreamWhenSubscribedToRemote = _this.mediaStream;
                                _this.remotePeerSuccessfullyEstablished();
                            }
                            if (reconnect) {
                                _this.ee.emitEvent('stream-reconnected-by-publisher', []);
                            }
                            else {
                                _this.ee.emitEvent('stream-created-by-publisher', []);
                            }
                            _this.initWebRtcStats();
                            logger.info("'Publisher' (" + _this.streamId + ") successfully " + (reconnect ? "reconnected" : "published") + " to session");
                            resolve();
                        })
                            .catch(function (error) {
                            reject(error);
                        });
                    }
                });
            };
            if (reconnect) {
                _this.disposeWebRtcPeer();
            }
            if (_this.displayMyRemote()) {
                _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerSendrecv(options);
            }
            else {
                _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerSendonly(options);
            }
            _this.webRtcPeer.addIceConnectionStateChangeListener('publisher of ' + _this.connection.connectionId);
            _this.webRtcPeer.generateOffer().then(function (sdpOffer) {
                successCallback(sdpOffer);
            }).catch(function (error) {
                reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    };
    Stream.prototype.initWebRtcPeerReceive = function (reconnect) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerConstraints = {
                audio: _this.inboundStreamOpts.hasAudio,
                video: _this.inboundStreamOpts.hasVideo
            };
            logger.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer", offerConstraints);
            var options = {
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                mediaConstraints: offerConstraints,
                iceServers: _this.getIceServersConf(),
                simulcast: false
            };
            var successCallback = function (sdpOfferParam) {
                logger.debug('Sending SDP offer to subscribe to '
                    + _this.streamId, sdpOfferParam);
                var method = reconnect ? 'reconnectStream' : 'receiveVideoFrom';
                var params = { sdpOffer: sdpOfferParam };
                params[reconnect ? 'stream' : 'sender'] = _this.streamId;
                _this.session.openvidu.sendRequest(method, params, function (error, response) {
                    if (error) {
                        reject(new Error('Error on recvVideoFrom: ' + JSON.stringify(error)));
                    }
                    else {
                        if (_this.session.isFirstIonicIosSubscriber) {
                            _this.session.isFirstIonicIosSubscriber = false;
                            setTimeout(function () {
                                _this.session.countDownForIonicIosSubscribersActive = false;
                            }, 400);
                        }
                        var needsTimeoutOnProcessAnswer = _this.session.countDownForIonicIosSubscribersActive;
                        _this.webRtcPeer.processAnswer(response.sdpAnswer, needsTimeoutOnProcessAnswer).then(function () {
                            logger.info("'Subscriber' (" + _this.streamId + ") successfully " + (reconnect ? "reconnected" : "subscribed"));
                            _this.remotePeerSuccessfullyEstablished();
                            _this.initWebRtcStats();
                            resolve();
                        }).catch(function (error) {
                            reject(error);
                        });
                    }
                });
            };
            _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerRecvonly(options);
            _this.webRtcPeer.addIceConnectionStateChangeListener(_this.streamId);
            _this.webRtcPeer.generateOffer()
                .then(function (sdpOffer) {
                successCallback(sdpOffer);
            })
                .catch(function (error) {
                reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    };
    Stream.prototype.remotePeerSuccessfullyEstablished = function () {
        this.mediaStream = new MediaStream();
        var receiver;
        for (var _i = 0, _a = this.webRtcPeer.pc.getReceivers(); _i < _a.length; _i++) {
            receiver = _a[_i];
            if (!!receiver.track) {
                this.mediaStream.addTrack(receiver.track);
            }
        }
        logger.debug('Peer remote stream', this.mediaStream);
        if (!!this.mediaStream) {
            if (this.streamManager instanceof Subscriber_1.Subscriber) {
                if (!!this.mediaStream.getAudioTracks()[0]) {
                    var enabled = !!(this.streamManager.properties.subscribeToAudio);
                    this.mediaStream.getAudioTracks()[0].enabled = enabled;
                }
                if (!!this.mediaStream.getVideoTracks()[0]) {
                    var enabled = !!(this.streamManager.properties.subscribeToVideo);
                    this.mediaStream.getVideoTracks()[0].enabled = enabled;
                }
            }
            this.updateMediaStreamInVideos();
            this.initHarkEvents();
        }
    };
    Stream.prototype.initHarkEvents = function () {
        if (!!this.mediaStream.getAudioTracks()[0]) {
            if (this.streamManager.remote) {
                if (this.session.startSpeakingEventsEnabled) {
                    this.enableStartSpeakingEvent();
                }
                if (this.session.startSpeakingEventsEnabledOnce) {
                    this.enableOnceStartSpeakingEvent();
                }
                if (this.session.stopSpeakingEventsEnabled) {
                    this.enableStopSpeakingEvent();
                }
                if (this.session.stopSpeakingEventsEnabledOnce) {
                    this.enableOnceStopSpeakingEvent();
                }
            }
            if (this.volumeChangeEventEnabled) {
                this.enableVolumeChangeEvent(true);
            }
            if (this.volumeChangeEventEnabledOnce) {
                this.enableOnceVolumeChangeEvent(true);
            }
        }
    };
    Stream.prototype.initWebRtcStats = function () {
        this.webRtcStats = new WebRtcStats_1.WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();
    };
    Stream.prototype.stopWebRtcStats = function () {
        if (!!this.webRtcStats && this.webRtcStats.isEnabled()) {
            this.webRtcStats.stopWebRtcStats();
        }
    };
    Stream.prototype.getIceServersConf = function () {
        var returnValue;
        if (!!this.session.openvidu.advancedConfiguration.iceServers) {
            returnValue = this.session.openvidu.advancedConfiguration.iceServers === 'freeice' ?
                undefined :
                this.session.openvidu.advancedConfiguration.iceServers;
        }
        else if (this.session.openvidu.iceServers) {
            returnValue = this.session.openvidu.iceServers;
        }
        else {
            returnValue = undefined;
        }
        return returnValue;
    };
    Stream.prototype.gatherStatsForPeer = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.isLocal()) {
                _this.getRTCPeerConnection().getSenders().forEach(function (sender) { return sender.getStats()
                    .then(function (response) {
                    response.forEach(function (report) {
                        if (_this.isReportWanted(report)) {
                            var finalReport = {};
                            finalReport['type'] = report.type;
                            finalReport['timestamp'] = report.timestamp;
                            finalReport['id'] = report.id;
                            if (report.type === 'outbound-rtp') {
                                finalReport['ssrc'] = report.ssrc;
                                finalReport['firCount'] = report.firCount;
                                finalReport['pliCount'] = report.pliCount;
                                finalReport['nackCount'] = report.nackCount;
                                finalReport['qpSum'] = report.qpSum;
                                if (!!report.kind) {
                                    finalReport['mediaType'] = report.kind;
                                }
                                else if (!!report.mediaType) {
                                    finalReport['mediaType'] = report.mediaType;
                                }
                                else {
                                    finalReport['mediaType'] = (report.id.indexOf('VideoStream') !== -1) ? 'video' : 'audio';
                                }
                                if (finalReport['mediaType'] === 'video') {
                                    finalReport['framesEncoded'] = report.framesEncoded;
                                }
                                finalReport['packetsSent'] = report.packetsSent;
                                finalReport['bytesSent'] = report.bytesSent;
                            }
                            if (report.type === 'candidate-pair' && report.totalRoundTripTime !== undefined) {
                                finalReport['availableOutgoingBitrate'] = report.availableOutgoingBitrate;
                                finalReport['rtt'] = report.currentRoundTripTime;
                                finalReport['averageRtt'] = report.totalRoundTripTime / report.responsesReceived;
                            }
                            if (report.type === 'remote-inbound-rtp' || report.type === 'remote-outbound-rtp') {
                            }
                            logger.log(finalReport);
                        }
                    });
                }); });
            }
            else {
                _this.getRTCPeerConnection().getReceivers().forEach(function (receiver) { return receiver.getStats()
                    .then(function (response) {
                    response.forEach(function (report) {
                        if (_this.isReportWanted(report)) {
                            var finalReport = {};
                            finalReport['type'] = report.type;
                            finalReport['timestamp'] = report.timestamp;
                            finalReport['id'] = report.id;
                            if (report.type === 'inbound-rtp') {
                                finalReport['ssrc'] = report.ssrc;
                                finalReport['firCount'] = report.firCount;
                                finalReport['pliCount'] = report.pliCount;
                                finalReport['nackCount'] = report.nackCount;
                                finalReport['qpSum'] = report.qpSum;
                                if (!!report.kind) {
                                    finalReport['mediaType'] = report.kind;
                                }
                                else if (!!report.mediaType) {
                                    finalReport['mediaType'] = report.mediaType;
                                }
                                else {
                                    finalReport['mediaType'] = (report.id.indexOf('VideoStream') !== -1) ? 'video' : 'audio';
                                }
                                if (finalReport['mediaType'] === 'video') {
                                    finalReport['framesDecoded'] = report.framesDecoded;
                                }
                                finalReport['packetsReceived'] = report.packetsReceived;
                                finalReport['packetsLost'] = report.packetsLost;
                                finalReport['jitter'] = report.jitter;
                                finalReport['bytesReceived'] = report.bytesReceived;
                            }
                            if (report.type === 'candidate-pair' && report.totalRoundTripTime !== undefined) {
                                finalReport['availableIncomingBitrate'] = report.availableIncomingBitrate;
                                finalReport['rtt'] = report.currentRoundTripTime;
                                finalReport['averageRtt'] = report.totalRoundTripTime / report.responsesReceived;
                            }
                            if (report.type === 'remote-inbound-rtp' || report.type === 'remote-outbound-rtp') {
                            }
                            logger.log(finalReport);
                        }
                    });
                }); });
            }
        });
    };
    Stream.prototype.isReportWanted = function (report) {
        return report.type === 'inbound-rtp' && !this.isLocal() ||
            report.type === 'outbound-rtp' && this.isLocal() ||
            (report.type === 'candidate-pair' && report.nominated && report.bytesSent > 0);
    };
    return Stream;
}(EventDispatcher_1.EventDispatcher));
exports.Stream = Stream;

},{"../OpenViduInternal/Enums/OpenViduError":34,"../OpenViduInternal/Events/PublisherSpeakingEvent":39,"../OpenViduInternal/Events/StreamManagerEvent":44,"../OpenViduInternal/Events/StreamPropertyChangedEvent":45,"../OpenViduInternal/Logger/OpenViduLogger":56,"../OpenViduInternal/WebRtcPeer/WebRtcPeer":59,"../OpenViduInternal/WebRtcStats/WebRtcStats":60,"./EventDispatcher":24,"./Filter":25,"./Subscriber":32,"hark":5,"platform":8}],31:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var EventDispatcher_1 = require("./EventDispatcher");
var StreamManagerEvent_1 = require("../OpenViduInternal/Events/StreamManagerEvent");
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var platform = require("platform");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var StreamManager = (function (_super) {
    __extends(StreamManager, _super);
    function StreamManager(stream, targetElement) {
        var _this = _super.call(this) || this;
        _this.videos = [];
        _this.lazyLaunchVideoElementCreatedEvent = false;
        _this.stream = stream;
        _this.stream.streamManager = _this;
        _this.remote = !_this.stream.isLocal();
        if (!!targetElement) {
            var targEl = void 0;
            if (typeof targetElement === 'string') {
                targEl = document.getElementById(targetElement);
            }
            else if (targetElement instanceof HTMLElement) {
                targEl = targetElement;
            }
            if (!!targEl) {
                _this.firstVideoElement = {
                    targetElement: targEl,
                    video: document.createElement('video'),
                    id: '',
                    canplayListenerAdded: false
                };
                if (platform.name === 'Safari') {
                    _this.firstVideoElement.video.setAttribute('playsinline', 'true');
                }
                _this.targetElement = targEl;
                _this.element = targEl;
            }
        }
        _this.canPlayListener = function () {
            if (_this.stream.isLocal()) {
                if (!_this.stream.displayMyRemote()) {
                    logger.info("Your local 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'videoPlaying')]);
                }
                else {
                    logger.info("Your own remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'remoteVideoPlaying')]);
                }
            }
            else {
                logger.info("Remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'videoPlaying')]);
            }
            _this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(_this, 'streamPlaying', undefined)]);
        };
        return _this;
    }
    StreamManager.prototype.on = function (type, handler) {
        _super.prototype.onAux.call(this, type, "Event '" + type + "' triggered by '" + (this.remote ? 'Subscriber' : 'Publisher') + "'", handler);
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
                this.lazyLaunchVideoElementCreatedEvent = false;
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this, 'streamPlaying', undefined)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        if (type === 'streamAudioVolumeChange' && this.stream.hasAudio) {
            this.stream.enableVolumeChangeEvent(false);
        }
        return this;
    };
    StreamManager.prototype.once = function (type, handler) {
        _super.prototype.onceAux.call(this, type, "Event '" + type + "' triggered once by '" + (this.remote ? 'Subscriber' : 'Publisher') + "'", handler);
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this, 'streamPlaying', undefined)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        if (type === 'streamAudioVolumeChange' && this.stream.hasAudio) {
            this.stream.enableOnceVolumeChangeEvent(false);
        }
        return this;
    };
    StreamManager.prototype.off = function (type, handler) {
        _super.prototype.off.call(this, type, handler);
        if (type === 'streamAudioVolumeChange') {
            var remainingVolumeEventListeners = this.ee.getListeners(type).length;
            if (remainingVolumeEventListeners === 0) {
                this.stream.disableVolumeChangeEvent(false);
            }
        }
        return this;
    };
    StreamManager.prototype.addVideoElement = function (video) {
        this.initializeVideoProperties(video);
        if (this.stream.isLocal() && this.stream.displayMyRemote()) {
            if (video.srcObject !== this.stream.getMediaStream()) {
                video.srcObject = this.stream.getMediaStream();
            }
        }
        for (var _i = 0, _a = this.videos; _i < _a.length; _i++) {
            var v = _a[_i];
            if (v.video === video) {
                return 0;
            }
        }
        var returnNumber = 1;
        for (var _b = 0, _c = this.stream.session.streamManagers; _b < _c.length; _b++) {
            var streamManager = _c[_b];
            if (streamManager.disassociateVideo(video)) {
                returnNumber = -1;
                break;
            }
        }
        this.stream.session.streamManagers.forEach(function (streamManager) {
            streamManager.disassociateVideo(video);
        });
        this.pushNewStreamManagerVideo({
            video: video,
            id: video.id,
            canplayListenerAdded: false
        });
        logger.info('New video element associated to ', this);
        return returnNumber;
    };
    StreamManager.prototype.createVideoElement = function (targetElement, insertMode) {
        var targEl;
        if (typeof targetElement === 'string') {
            targEl = document.getElementById(targetElement);
            if (!targEl) {
                throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
            }
        }
        else if (targetElement instanceof HTMLElement) {
            targEl = targetElement;
        }
        else {
            throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
        }
        var video = this.createVideo();
        this.initializeVideoProperties(video);
        var insMode = !!insertMode ? insertMode : VideoInsertMode_1.VideoInsertMode.APPEND;
        switch (insMode) {
            case VideoInsertMode_1.VideoInsertMode.AFTER:
                targEl.parentNode.insertBefore(video, targEl.nextSibling);
                break;
            case VideoInsertMode_1.VideoInsertMode.APPEND:
                targEl.appendChild(video);
                break;
            case VideoInsertMode_1.VideoInsertMode.BEFORE:
                targEl.parentNode.insertBefore(video, targEl);
                break;
            case VideoInsertMode_1.VideoInsertMode.PREPEND:
                targEl.insertBefore(video, targEl.childNodes[0]);
                break;
            case VideoInsertMode_1.VideoInsertMode.REPLACE:
                targEl.parentNode.replaceChild(video, targEl);
                break;
            default:
                insMode = VideoInsertMode_1.VideoInsertMode.APPEND;
                targEl.appendChild(video);
                break;
        }
        var v = {
            targetElement: targEl,
            video: video,
            insertMode: insMode,
            id: video.id,
            canplayListenerAdded: false
        };
        this.pushNewStreamManagerVideo(v);
        this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(v.video, this, 'videoElementCreated')]);
        this.lazyLaunchVideoElementCreatedEvent = !!this.firstVideoElement;
        return video;
    };
    StreamManager.prototype.updatePublisherSpeakingEventsOptions = function (publisherSpeakingEventsOptions) {
        var currentHarkOptions = !!this.stream.harkOptions ? this.stream.harkOptions : (this.stream.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {});
        var newInterval = (typeof publisherSpeakingEventsOptions.interval === 'number') ?
            publisherSpeakingEventsOptions.interval : ((typeof currentHarkOptions.interval === 'number') ? currentHarkOptions.interval : 100);
        var newThreshold = (typeof publisherSpeakingEventsOptions.threshold === 'number') ?
            publisherSpeakingEventsOptions.threshold : ((typeof currentHarkOptions.threshold === 'number') ? currentHarkOptions.threshold : -50);
        this.stream.harkOptions = {
            interval: newInterval,
            threshold: newThreshold
        };
        if (!!this.stream.speechEvent) {
            this.stream.speechEvent.setInterval(newInterval);
            this.stream.speechEvent.setThreshold(newThreshold);
        }
    };
    StreamManager.prototype.initializeVideoProperties = function (video) {
        if (!(this.stream.isLocal() && this.stream.displayMyRemote())) {
            if (video.srcObject !== this.stream.getMediaStream()) {
                video.srcObject = this.stream.getMediaStream();
            }
        }
        video.autoplay = true;
        video.controls = false;
        if (platform.name === 'Safari') {
            video.setAttribute('playsinline', 'true');
        }
        if (!video.id) {
            video.id = (this.remote ? 'remote-' : 'local-') + 'video-' + this.stream.streamId;
            if (!this.id && !!this.targetElement) {
                this.id = video.id;
            }
        }
        if (!this.remote && !this.stream.displayMyRemote()) {
            video.muted = true;
            if (video.style.transform === 'rotateY(180deg)' && !this.stream.outboundStreamOpts.publisherProperties.mirror) {
                this.removeMirrorVideo(video);
            }
            else if (this.stream.outboundStreamOpts.publisherProperties.mirror && !this.stream.isSendScreen()) {
                this.mirrorVideo(video);
            }
        }
    };
    StreamManager.prototype.removeAllVideos = function () {
        var _this = this;
        for (var i = this.stream.session.streamManagers.length - 1; i >= 0; --i) {
            if (this.stream.session.streamManagers[i] === this) {
                this.stream.session.streamManagers.splice(i, 1);
            }
        }
        this.videos.forEach(function (streamManagerVideo) {
            if (!!streamManagerVideo.video && !!streamManagerVideo.video.removeEventListener) {
                streamManagerVideo.video.removeEventListener('canplay', _this.canPlayListener);
            }
            streamManagerVideo.canplayListenerAdded = false;
            if (!!streamManagerVideo.targetElement) {
                streamManagerVideo.video.parentNode.removeChild(streamManagerVideo.video);
                _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(streamManagerVideo.video, _this, 'videoElementDestroyed')]);
            }
            _this.removeSrcObject(streamManagerVideo);
            _this.videos.filter(function (v) { return !v.targetElement; });
        });
    };
    StreamManager.prototype.disassociateVideo = function (video) {
        var disassociated = false;
        for (var i = 0; i < this.videos.length; i++) {
            if (this.videos[i].video === video) {
                this.videos[i].video.removeEventListener('canplay', this.canPlayListener);
                this.videos.splice(i, 1);
                disassociated = true;
                logger.info('Video element disassociated from ', this);
                break;
            }
        }
        return disassociated;
    };
    StreamManager.prototype.addPlayEventToFirstVideo = function () {
        if ((!!this.videos[0]) && (!!this.videos[0].video) && (!this.videos[0].canplayListenerAdded)) {
            this.videos[0].video.addEventListener('canplay', this.canPlayListener);
            this.videos[0].canplayListenerAdded = true;
        }
    };
    StreamManager.prototype.updateMediaStream = function (mediaStream) {
        this.videos.forEach(function (streamManagerVideo) {
            streamManagerVideo.video.srcObject = mediaStream;
            if (platform['isIonicIos']) {
                var vParent = streamManagerVideo.video.parentElement;
                var newVideo = streamManagerVideo.video;
                vParent.replaceChild(newVideo, streamManagerVideo.video);
                streamManagerVideo.video = newVideo;
            }
        });
    };
    StreamManager.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    StreamManager.prototype.createVideo = function () {
        return document.createElement('video');
    };
    StreamManager.prototype.removeSrcObject = function (streamManagerVideo) {
        streamManagerVideo.video.srcObject = null;
    };
    StreamManager.prototype.pushNewStreamManagerVideo = function (streamManagerVideo) {
        this.videos.push(streamManagerVideo);
        this.addPlayEventToFirstVideo();
        if (this.stream.session.streamManagers.indexOf(this) === -1) {
            this.stream.session.streamManagers.push(this);
        }
    };
    StreamManager.prototype.mirrorVideo = function (video) {
        if (!platform['isIonicIos']) {
            video.style.transform = 'rotateY(180deg)';
            video.style.webkitTransform = 'rotateY(180deg)';
        }
    };
    StreamManager.prototype.removeMirrorVideo = function (video) {
        video.style.transform = 'unset';
        video.style.webkitTransform = 'unset';
    };
    return StreamManager;
}(EventDispatcher_1.EventDispatcher));
exports.StreamManager = StreamManager;

},{"../OpenViduInternal/Enums/VideoInsertMode":35,"../OpenViduInternal/Events/StreamManagerEvent":44,"../OpenViduInternal/Events/VideoElementEvent":46,"../OpenViduInternal/Logger/OpenViduLogger":56,"./EventDispatcher":24,"platform":8}],32:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var StreamManager_1 = require("./StreamManager");
var OpenViduLogger_1 = require("../OpenViduInternal/Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var Subscriber = (function (_super) {
    __extends(Subscriber, _super);
    function Subscriber(stream, targEl, properties) {
        var _this = _super.call(this, stream, targEl) || this;
        _this.element = _this.targetElement;
        _this.stream = stream;
        _this.properties = properties;
        return _this;
    }
    Subscriber.prototype.subscribeToAudio = function (value) {
        this.stream.getMediaStream().getAudioTracks().forEach(function (track) {
            track.enabled = value;
        });
        this.stream.audioActive = value;
        logger.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its audio stream');
        return this;
    };
    Subscriber.prototype.subscribeToVideo = function (value) {
        this.stream.getMediaStream().getVideoTracks().forEach(function (track) {
            track.enabled = value;
        });
        this.stream.videoActive = value;
        logger.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its video stream');
        return this;
    };
    return Subscriber;
}(StreamManager_1.StreamManager));
exports.Subscriber = Subscriber;

},{"../OpenViduInternal/Logger/OpenViduLogger":56,"./StreamManager":31}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorderState;
(function (LocalRecorderState) {
    LocalRecorderState["READY"] = "READY";
    LocalRecorderState["RECORDING"] = "RECORDING";
    LocalRecorderState["PAUSED"] = "PAUSED";
    LocalRecorderState["FINISHED"] = "FINISHED";
})(LocalRecorderState = exports.LocalRecorderState || (exports.LocalRecorderState = {}));

},{}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduErrorName;
(function (OpenViduErrorName) {
    OpenViduErrorName["BROWSER_NOT_SUPPORTED"] = "BROWSER_NOT_SUPPORTED";
    OpenViduErrorName["DEVICE_ACCESS_DENIED"] = "DEVICE_ACCESS_DENIED";
    OpenViduErrorName["DEVICE_ALREADY_IN_USE"] = "DEVICE_ALREADY_IN_USE";
    OpenViduErrorName["SCREEN_CAPTURE_DENIED"] = "SCREEN_CAPTURE_DENIED";
    OpenViduErrorName["SCREEN_SHARING_NOT_SUPPORTED"] = "SCREEN_SHARING_NOT_SUPPORTED";
    OpenViduErrorName["SCREEN_EXTENSION_NOT_INSTALLED"] = "SCREEN_EXTENSION_NOT_INSTALLED";
    OpenViduErrorName["SCREEN_EXTENSION_DISABLED"] = "SCREEN_EXTENSION_DISABLED";
    OpenViduErrorName["INPUT_VIDEO_DEVICE_NOT_FOUND"] = "INPUT_VIDEO_DEVICE_NOT_FOUND";
    OpenViduErrorName["INPUT_AUDIO_DEVICE_NOT_FOUND"] = "INPUT_AUDIO_DEVICE_NOT_FOUND";
    OpenViduErrorName["INPUT_AUDIO_DEVICE_GENERIC_ERROR"] = "INPUT_AUDIO_DEVICE_GENERIC_ERROR";
    OpenViduErrorName["NO_INPUT_SOURCE_SET"] = "NO_INPUT_SOURCE_SET";
    OpenViduErrorName["PUBLISHER_PROPERTIES_ERROR"] = "PUBLISHER_PROPERTIES_ERROR";
    OpenViduErrorName["OPENVIDU_PERMISSION_DENIED"] = "OPENVIDU_PERMISSION_DENIED";
    OpenViduErrorName["OPENVIDU_NOT_CONNECTED"] = "OPENVIDU_NOT_CONNECTED";
    OpenViduErrorName["GENERIC_ERROR"] = "GENERIC_ERROR";
})(OpenViduErrorName = exports.OpenViduErrorName || (exports.OpenViduErrorName = {}));
var OpenViduError = (function () {
    function OpenViduError(name, message) {
        this.name = name;
        this.message = message;
    }
    return OpenViduError;
}());
exports.OpenViduError = OpenViduError;

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var VideoInsertMode;
(function (VideoInsertMode) {
    VideoInsertMode["AFTER"] = "AFTER";
    VideoInsertMode["APPEND"] = "APPEND";
    VideoInsertMode["BEFORE"] = "BEFORE";
    VideoInsertMode["PREPEND"] = "PREPEND";
    VideoInsertMode["REPLACE"] = "REPLACE";
})(VideoInsertMode = exports.VideoInsertMode || (exports.VideoInsertMode = {}));

},{}],36:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var ConnectionEvent = (function (_super) {
    __extends(ConnectionEvent, _super);
    function ConnectionEvent(cancelable, target, type, connection, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.connection = connection;
        _this.reason = reason;
        return _this;
    }
    ConnectionEvent.prototype.callDefaultBehavior = function () { };
    return ConnectionEvent;
}(Event_1.Event));
exports.ConnectionEvent = ConnectionEvent;

},{"./Event":37}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Event = (function () {
    function Event(cancelable, target, type) {
        this.hasBeenPrevented = false;
        this.cancelable = cancelable;
        this.target = target;
        this.type = type;
    }
    Event.prototype.isDefaultPrevented = function () {
        return this.hasBeenPrevented;
    };
    Event.prototype.preventDefault = function () {
        this.callDefaultBehavior = function () { };
        this.hasBeenPrevented = true;
    };
    return Event;
}());
exports.Event = Event;

},{}],38:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var FilterEvent = (function (_super) {
    __extends(FilterEvent, _super);
    function FilterEvent(target, eventType, data) {
        var _this = _super.call(this, false, target, eventType) || this;
        _this.data = data;
        return _this;
    }
    FilterEvent.prototype.callDefaultBehavior = function () { };
    return FilterEvent;
}(Event_1.Event));
exports.FilterEvent = FilterEvent;

},{"./Event":37}],39:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var PublisherSpeakingEvent = (function (_super) {
    __extends(PublisherSpeakingEvent, _super);
    function PublisherSpeakingEvent(target, type, connection, streamId) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.connection = connection;
        _this.streamId = streamId;
        return _this;
    }
    PublisherSpeakingEvent.prototype.callDefaultBehavior = function () { };
    return PublisherSpeakingEvent;
}(Event_1.Event));
exports.PublisherSpeakingEvent = PublisherSpeakingEvent;

},{"./Event":37}],40:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var RecordingEvent = (function (_super) {
    __extends(RecordingEvent, _super);
    function RecordingEvent(target, type, id, name, reason) {
        var _this = _super.call(this, false, target, type) || this;
        _this.id = id;
        if (name !== id) {
            _this.name = name;
        }
        _this.reason = reason;
        return _this;
    }
    RecordingEvent.prototype.callDefaultBehavior = function () { };
    return RecordingEvent;
}(Event_1.Event));
exports.RecordingEvent = RecordingEvent;

},{"./Event":37}],41:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var OpenViduLogger_1 = require("../Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var SessionDisconnectedEvent = (function (_super) {
    __extends(SessionDisconnectedEvent, _super);
    function SessionDisconnectedEvent(target, reason) {
        var _this = _super.call(this, true, target, 'sessionDisconnected') || this;
        _this.reason = reason;
        return _this;
    }
    SessionDisconnectedEvent.prototype.callDefaultBehavior = function () {
        logger.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Session'");
        var session = this.target;
        for (var connectionId in session.remoteConnections) {
            if (!!session.remoteConnections[connectionId].stream) {
                session.remoteConnections[connectionId].stream.disposeWebRtcPeer();
                session.remoteConnections[connectionId].stream.disposeMediaStream();
                if (session.remoteConnections[connectionId].stream.streamManager) {
                    session.remoteConnections[connectionId].stream.streamManager.removeAllVideos();
                }
                delete session.remoteStreamsCreated[session.remoteConnections[connectionId].stream.streamId];
                session.remoteConnections[connectionId].dispose();
            }
            delete session.remoteConnections[connectionId];
        }
    };
    return SessionDisconnectedEvent;
}(Event_1.Event));
exports.SessionDisconnectedEvent = SessionDisconnectedEvent;

},{"../Logger/OpenViduLogger":56,"./Event":37}],42:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var SignalEvent = (function (_super) {
    __extends(SignalEvent, _super);
    function SignalEvent(target, type, data, from) {
        var _this = _super.call(this, false, target, 'signal') || this;
        if (!!type) {
            _this.type = 'signal:' + type;
        }
        _this.data = data;
        _this.from = from;
        return _this;
    }
    SignalEvent.prototype.callDefaultBehavior = function () { };
    return SignalEvent;
}(Event_1.Event));
exports.SignalEvent = SignalEvent;

},{"./Event":37}],43:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var Publisher_1 = require("../../OpenVidu/Publisher");
var Session_1 = require("../../OpenVidu/Session");
var OpenViduLogger_1 = require("../Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var StreamEvent = (function (_super) {
    __extends(StreamEvent, _super);
    function StreamEvent(cancelable, target, type, stream, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.stream = stream;
        _this.reason = reason;
        return _this;
    }
    StreamEvent.prototype.callDefaultBehavior = function () {
        if (this.type === 'streamDestroyed') {
            if (this.target instanceof Session_1.Session) {
                logger.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Session'");
                this.stream.disposeWebRtcPeer();
            }
            else if (this.target instanceof Publisher_1.Publisher) {
                logger.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Publisher'");
                clearInterval(this.target.screenShareResizeInterval);
                this.stream.isLocalStreamReadyToPublish = false;
                var openviduPublishers = this.target.openvidu.publishers;
                for (var i = 0; i < openviduPublishers.length; i++) {
                    if (openviduPublishers[i] === this.target) {
                        openviduPublishers.splice(i, 1);
                        break;
                    }
                }
            }
            this.stream.disposeMediaStream();
            if (this.stream.streamManager)
                this.stream.streamManager.removeAllVideos();
            delete this.stream.session.remoteStreamsCreated[this.stream.streamId];
            var remoteConnection = this.stream.session.remoteConnections[this.stream.connection.connectionId];
            if (!!remoteConnection && !!remoteConnection.options) {
                var streamOptionsServer = remoteConnection.options.streams;
                for (var i = streamOptionsServer.length - 1; i >= 0; --i) {
                    if (streamOptionsServer[i].id === this.stream.streamId) {
                        streamOptionsServer.splice(i, 1);
                    }
                }
            }
        }
    };
    return StreamEvent;
}(Event_1.Event));
exports.StreamEvent = StreamEvent;

},{"../../OpenVidu/Publisher":28,"../../OpenVidu/Session":29,"../Logger/OpenViduLogger":56,"./Event":37}],44:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var StreamManagerEvent = (function (_super) {
    __extends(StreamManagerEvent, _super);
    function StreamManagerEvent(target, type, value) {
        var _this = _super.call(this, false, target, type) || this;
        _this.value = value;
        return _this;
    }
    StreamManagerEvent.prototype.callDefaultBehavior = function () { };
    return StreamManagerEvent;
}(Event_1.Event));
exports.StreamManagerEvent = StreamManagerEvent;

},{"./Event":37}],45:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var StreamPropertyChangedEvent = (function (_super) {
    __extends(StreamPropertyChangedEvent, _super);
    function StreamPropertyChangedEvent(target, stream, changedProperty, newValue, oldValue, reason) {
        var _this = _super.call(this, false, target, 'streamPropertyChanged') || this;
        _this.stream = stream;
        _this.changedProperty = changedProperty;
        _this.newValue = newValue;
        _this.oldValue = oldValue;
        _this.reason = reason;
        return _this;
    }
    StreamPropertyChangedEvent.prototype.callDefaultBehavior = function () { };
    return StreamPropertyChangedEvent;
}(Event_1.Event));
exports.StreamPropertyChangedEvent = StreamPropertyChangedEvent;

},{"./Event":37}],46:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var VideoElementEvent = (function (_super) {
    __extends(VideoElementEvent, _super);
    function VideoElementEvent(element, target, type) {
        var _this = _super.call(this, false, target, type) || this;
        _this.element = element;
        return _this;
    }
    VideoElementEvent.prototype.callDefaultBehavior = function () { };
    return VideoElementEvent;
}(Event_1.Event));
exports.VideoElementEvent = VideoElementEvent;

},{"./Event":37}],47:[function(require,module,exports){
function Mapper() {
    var sources = {};
    this.forEach = function (callback) {
        for (var key in sources) {
            var source = sources[key];
            for (var key2 in source)
                callback(source[key2]);
        }
        ;
    };
    this.get = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return undefined;
        return ids[id];
    };
    this.remove = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return;
        delete ids[id];
        for (var i in ids) {
            return false;
        }
        delete sources[source];
    };
    this.set = function (value, id, source) {
        if (value == undefined)
            return this.remove(id, source);
        var ids = sources[source];
        if (ids == undefined)
            sources[source] = ids = {};
        ids[id] = value;
    };
}
;
Mapper.prototype.pop = function (id, source) {
    var value = this.get(id, source);
    if (value == undefined)
        return undefined;
    this.remove(id, source);
    return value;
};
module.exports = Mapper;

},{}],48:[function(require,module,exports){
var JsonRpcClient = require('./jsonrpcclient');
exports.JsonRpcClient = JsonRpcClient;

},{"./jsonrpcclient":49}],49:[function(require,module,exports){
var RpcBuilder = require('../');
var WebSocketWithReconnection = require('./transports/webSocketWithReconnection');
Date.now = Date.now || function () {
    return +new Date;
};
var PING_INTERVAL = 5000;
var RECONNECTING = 'RECONNECTING';
var CONNECTED = 'CONNECTED';
var DISCONNECTED = 'DISCONNECTED';
var Logger = console;
function JsonRpcClient(configuration) {
    var self = this;
    var wsConfig = configuration.ws;
    var notReconnectIfNumLessThan = -1;
    var pingNextNum = 0;
    var enabledPings = true;
    var pingPongStarted = false;
    var pingInterval;
    var status = DISCONNECTED;
    var onreconnecting = wsConfig.onreconnecting;
    var onreconnected = wsConfig.onreconnected;
    var onconnected = wsConfig.onconnected;
    var onerror = wsConfig.onerror;
    configuration.rpc.pull = function (params, request) {
        request.reply(null, "push");
    };
    wsConfig.onreconnecting = function () {
        Logger.debug("--------- ONRECONNECTING -----------");
        if (status === RECONNECTING) {
            Logger.error("Websocket already in RECONNECTING state when receiving a new ONRECONNECTING message. Ignoring it");
            return;
        }
        stopPing();
        status = RECONNECTING;
        if (onreconnecting) {
            onreconnecting();
        }
    };
    wsConfig.onreconnected = function () {
        Logger.debug("--------- ONRECONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONRECONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        updateNotReconnectIfLessThan();
        if (onreconnected) {
            onreconnected();
        }
    };
    wsConfig.onconnected = function () {
        Logger.debug("--------- ONCONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONCONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        usePing();
        if (onconnected) {
            onconnected();
        }
    };
    wsConfig.onerror = function (error) {
        Logger.debug("--------- ONERROR -----------");
        status = DISCONNECTED;
        stopPing();
        if (onerror) {
            onerror(error);
        }
    };
    var ws = new WebSocketWithReconnection(wsConfig);
    Logger.debug('Connecting websocket to URI: ' + wsConfig.uri);
    var rpcBuilderOptions = {
        request_timeout: configuration.rpc.requestTimeout,
        ping_request_timeout: configuration.rpc.heartbeatRequestTimeout
    };
    var rpc = new RpcBuilder(RpcBuilder.packers.JsonRPC, rpcBuilderOptions, ws, function (request) {
        Logger.debug('Received request: ' + JSON.stringify(request));
        try {
            var func = configuration.rpc[request.method];
            if (func === undefined) {
                Logger.error("Method " + request.method + " not registered in client");
            }
            else {
                func(request.params, request);
            }
        }
        catch (err) {
            Logger.error('Exception processing request: ' + JSON.stringify(request));
            Logger.error(err);
        }
    });
    this.send = function (method, params, callback) {
        if (method !== 'ping') {
            Logger.debug('Request: method:' + method + " params:" + JSON.stringify(params));
        }
        var requestTime = Date.now();
        rpc.encode(method, params, function (error, result) {
            if (error) {
                try {
                    Logger.error("ERROR:" + error.message + " in Request: method:" +
                        method + " params:" + JSON.stringify(params) + " request:" +
                        error.request);
                    if (error.data) {
                        Logger.error("ERROR DATA:" + JSON.stringify(error.data));
                    }
                }
                catch (e) { }
                error.requestTime = requestTime;
            }
            if (callback) {
                if (result != undefined && result.value !== 'pong') {
                    Logger.debug('Response: ' + JSON.stringify(result));
                }
                callback(error, result);
            }
        });
    };
    function updateNotReconnectIfLessThan() {
        Logger.debug("notReconnectIfNumLessThan = " + pingNextNum + ' (old=' +
            notReconnectIfNumLessThan + ')');
        notReconnectIfNumLessThan = pingNextNum;
    }
    function sendPing() {
        if (enabledPings) {
            var params = null;
            if (pingNextNum == 0 || pingNextNum == notReconnectIfNumLessThan) {
                params = {
                    interval: configuration.heartbeat || PING_INTERVAL
                };
            }
            pingNextNum++;
            self.send('ping', params, (function (pingNum) {
                return function (error, result) {
                    if (error) {
                        Logger.debug("Error in ping request #" + pingNum + " (" +
                            error.message + ")");
                        if (pingNum > notReconnectIfNumLessThan) {
                            enabledPings = false;
                            updateNotReconnectIfLessThan();
                            Logger.debug("Server did not respond to ping message #" +
                                pingNum + ". Reconnecting... ");
                            ws.reconnectWs();
                        }
                    }
                };
            })(pingNextNum));
        }
        else {
            Logger.debug("Trying to send ping, but ping is not enabled");
        }
    }
    function usePing() {
        if (!pingPongStarted) {
            Logger.debug("Starting ping (if configured)");
            pingPongStarted = true;
            if (configuration.heartbeat != undefined) {
                pingInterval = setInterval(sendPing, configuration.heartbeat);
                sendPing();
            }
        }
    }
    function stopPing() {
        clearInterval(pingInterval);
        pingPongStarted = false;
        enabledPings = false;
        pingNextNum = -1;
        rpc.cancel();
    }
    this.close = function (code, reason) {
        Logger.debug("Closing  with code: " + code + " because: " + reason);
        if (pingInterval != undefined) {
            Logger.debug("Clearing ping interval");
            clearInterval(pingInterval);
        }
        pingPongStarted = false;
        enabledPings = false;
        if (configuration.sendCloseMessage) {
            Logger.debug("Sending close message");
            this.send('closeSession', null, function (error, result) {
                if (error) {
                    Logger.error("Error sending close message: " + JSON.stringify(error));
                }
                ws.close(code, reason);
            });
        }
        else {
            ws.close(code, reason);
        }
    };
    this.forceClose = function (millis) {
        ws.forceClose(millis);
    };
    this.reconnect = function () {
        ws.reconnectWs();
    };
    this.resetPing = function () {
        enabledPings = true;
        pingNextNum = 0;
        usePing();
    };
}
module.exports = JsonRpcClient;

},{"../":52,"./transports/webSocketWithReconnection":51}],50:[function(require,module,exports){
var WebSocketWithReconnection = require('./webSocketWithReconnection');
exports.WebSocketWithReconnection = WebSocketWithReconnection;

},{"./webSocketWithReconnection":51}],51:[function(require,module,exports){
"use strict";
var Logger = console;
var MAX_RETRIES = 2000;
var RETRY_TIME_MS = 3000;
var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;
function WebSocketWithReconnection(config) {
    var closing = false;
    var registerMessageHandler;
    var wsUri = config.uri;
    var reconnecting = false;
    var ws = new WebSocket(wsUri);
    ws.onopen = function () {
        Logger.debug("WebSocket connected to " + wsUri);
        if (config.onconnected) {
            config.onconnected();
        }
    };
    ws.onerror = function (error) {
        Logger.error("Could not connect to " + wsUri + " (invoking onerror if defined)", error);
        if (config.onerror) {
            config.onerror(error);
        }
    };
    var reconnectionOnClose = function () {
        if (ws.readyState === CLOSED) {
            if (closing) {
                Logger.debug("Connection closed by user");
            }
            else {
                Logger.debug("Connection closed unexpectecly. Reconnecting...");
                reconnect(MAX_RETRIES, 1);
            }
        }
        else {
            Logger.debug("Close callback from previous websocket. Ignoring it");
        }
    };
    ws.onclose = reconnectionOnClose;
    function reconnect(maxRetries, numRetries) {
        Logger.debug("reconnect (attempt #" + numRetries + ", max=" + maxRetries + ")");
        if (numRetries === 1) {
            if (reconnecting) {
                Logger.warn("Trying to reconnect when already reconnecting... Ignoring this reconnection.");
                return;
            }
            else {
                reconnecting = true;
            }
            if (config.onreconnecting) {
                config.onreconnecting();
            }
        }
        reconnectAux(maxRetries, numRetries);
    }
    function reconnectAux(maxRetries, numRetries) {
        Logger.debug("Reconnection attempt #" + numRetries);
        ws.close();
        ws = new WebSocket(wsUri);
        ws.onopen = function () {
            Logger.debug("Reconnected to " + wsUri + " after " + numRetries + " attempts...");
            reconnecting = false;
            registerMessageHandler();
            if (config.onreconnected()) {
                config.onreconnected();
            }
            ws.onclose = reconnectionOnClose;
        };
        ws.onerror = function (error) {
            Logger.warn("Reconnection error: ", error);
            if (numRetries === maxRetries) {
                if (config.ondisconnect) {
                    config.ondisconnect();
                }
            }
            else {
                setTimeout(function () {
                    reconnect(maxRetries, numRetries + 1);
                }, RETRY_TIME_MS);
            }
        };
    }
    this.close = function () {
        closing = true;
        ws.close();
    };
    this.reconnectWs = function () {
        Logger.debug("reconnectWs");
        reconnect(MAX_RETRIES, 1);
    };
    this.send = function (message) {
        ws.send(message);
    };
    this.addEventListener = function (type, callback) {
        registerMessageHandler = function () {
            ws.addEventListener(type, callback);
        };
        registerMessageHandler();
    };
}
module.exports = WebSocketWithReconnection;

},{}],52:[function(require,module,exports){
var defineProperty_IE8 = false;
if (Object.defineProperty) {
    try {
        Object.defineProperty({}, "x", {});
    }
    catch (e) {
        defineProperty_IE8 = true;
    }
}
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }
        var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, fNOP = function () { }, fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
                ? this
                : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var packers = require('./packers');
var Mapper = require('./Mapper');
var BASE_TIMEOUT = 5000;
function unifyResponseMethods(responseMethods) {
    if (!responseMethods)
        return {};
    for (var key in responseMethods) {
        var value = responseMethods[key];
        if (typeof value == 'string')
            responseMethods[key] =
                {
                    response: value
                };
    }
    ;
    return responseMethods;
}
;
function unifyTransport(transport) {
    if (!transport)
        return;
    if (transport instanceof Function)
        return { send: transport };
    if (transport.send instanceof Function)
        return transport;
    if (transport.postMessage instanceof Function) {
        transport.send = transport.postMessage;
        return transport;
    }
    if (transport.write instanceof Function) {
        transport.send = transport.write;
        return transport;
    }
    if (transport.onmessage !== undefined)
        return;
    if (transport.pause instanceof Function)
        return;
    throw new SyntaxError("Transport is not a function nor a valid object");
}
;
function RpcNotification(method, params) {
    if (defineProperty_IE8) {
        this.method = method;
        this.params = params;
    }
    else {
        Object.defineProperty(this, 'method', { value: method, enumerable: true });
        Object.defineProperty(this, 'params', { value: params, enumerable: true });
    }
}
;
function RpcBuilder(packer, options, transport, onRequest) {
    var self = this;
    if (!packer)
        throw new SyntaxError('Packer is not defined');
    if (!packer.pack || !packer.unpack)
        throw new SyntaxError('Packer is invalid');
    var responseMethods = unifyResponseMethods(packer.responseMethods);
    if (options instanceof Function) {
        if (transport != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = options;
        transport = undefined;
        options = undefined;
    }
    ;
    if (options && options.send instanceof Function) {
        if (transport && !(transport instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
        onRequest = transport;
        transport = options;
        options = undefined;
    }
    ;
    if (transport instanceof Function) {
        if (onRequest != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = transport;
        transport = undefined;
    }
    ;
    if (transport && transport.send instanceof Function)
        if (onRequest && !(onRequest instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
    options = options || {};
    EventEmitter.call(this);
    if (onRequest)
        this.on('request', onRequest);
    if (defineProperty_IE8)
        this.peerID = options.peerID;
    else
        Object.defineProperty(this, 'peerID', { value: options.peerID });
    var max_retries = options.max_retries || 0;
    function transportMessage(event) {
        self.decode(event.data || event);
    }
    ;
    this.getTransport = function () {
        return transport;
    };
    this.setTransport = function (value) {
        if (transport) {
            if (transport.removeEventListener)
                transport.removeEventListener('message', transportMessage);
            else if (transport.removeListener)
                transport.removeListener('data', transportMessage);
        }
        ;
        if (value) {
            if (value.addEventListener)
                value.addEventListener('message', transportMessage);
            else if (value.addListener)
                value.addListener('data', transportMessage);
        }
        ;
        transport = unifyTransport(value);
    };
    if (!defineProperty_IE8)
        Object.defineProperty(this, 'transport', {
            get: this.getTransport.bind(this),
            set: this.setTransport.bind(this)
        });
    this.setTransport(transport);
    var request_timeout = options.request_timeout || BASE_TIMEOUT;
    var ping_request_timeout = options.ping_request_timeout || request_timeout;
    var response_timeout = options.response_timeout || BASE_TIMEOUT;
    var duplicates_timeout = options.duplicates_timeout || BASE_TIMEOUT;
    var requestID = 0;
    var requests = new Mapper();
    var responses = new Mapper();
    var processedResponses = new Mapper();
    var message2Key = {};
    function storeResponse(message, id, dest) {
        var response = {
            message: message,
            timeout: setTimeout(function () {
                responses.remove(id, dest);
            }, response_timeout)
        };
        responses.set(response, id, dest);
    }
    ;
    function storeProcessedResponse(ack, from) {
        var timeout = setTimeout(function () {
            processedResponses.remove(ack, from);
        }, duplicates_timeout);
        processedResponses.set(timeout, ack, from);
    }
    ;
    function RpcRequest(method, params, id, from, transport) {
        RpcNotification.call(this, method, params);
        this.getTransport = function () {
            return transport;
        };
        this.setTransport = function (value) {
            transport = unifyTransport(value);
        };
        if (!defineProperty_IE8)
            Object.defineProperty(this, 'transport', {
                get: this.getTransport.bind(this),
                set: this.setTransport.bind(this)
            });
        var response = responses.get(id, from);
        if (!(transport || self.getTransport())) {
            if (defineProperty_IE8)
                this.duplicated = Boolean(response);
            else
                Object.defineProperty(this, 'duplicated', {
                    value: Boolean(response)
                });
        }
        var responseMethod = responseMethods[method];
        this.pack = packer.pack.bind(packer, this, id);
        this.reply = function (error, result, transport) {
            if (error instanceof Function || error && error.send instanceof Function) {
                if (result != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = error;
                result = null;
                error = undefined;
            }
            else if (result instanceof Function
                || result && result.send instanceof Function) {
                if (transport != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = result;
                result = null;
            }
            ;
            transport = unifyTransport(transport);
            if (response)
                clearTimeout(response.timeout);
            if (from != undefined) {
                if (error)
                    error.dest = from;
                if (result)
                    result.dest = from;
            }
            ;
            var message;
            if (error || result != undefined) {
                if (self.peerID != undefined) {
                    if (error)
                        error.from = self.peerID;
                    else
                        result.from = self.peerID;
                }
                if (responseMethod) {
                    if (responseMethod.error == undefined && error)
                        message =
                            {
                                error: error
                            };
                    else {
                        var method = error
                            ? responseMethod.error
                            : responseMethod.response;
                        message =
                            {
                                method: method,
                                params: error || result
                            };
                    }
                }
                else
                    message =
                        {
                            error: error,
                            result: result
                        };
                message = packer.pack(message, id);
            }
            else if (response)
                message = response.message;
            else
                message = packer.pack({ result: null }, id);
            storeResponse(message, id, from);
            transport = transport || this.getTransport() || self.getTransport();
            if (transport)
                return transport.send(message);
            return message;
        };
    }
    ;
    inherits(RpcRequest, RpcNotification);
    function cancel(message) {
        var key = message2Key[message];
        if (!key)
            return;
        delete message2Key[message];
        var request = requests.pop(key.id, key.dest);
        if (!request)
            return;
        clearTimeout(request.timeout);
        storeProcessedResponse(key.id, key.dest);
    }
    ;
    this.cancel = function (message) {
        if (message)
            return cancel(message);
        for (var message in message2Key)
            cancel(message);
    };
    this.close = function () {
        var transport = this.getTransport();
        if (transport && transport.close)
            transport.close(4003, "Cancel request");
        this.cancel();
        processedResponses.forEach(clearTimeout);
        responses.forEach(function (response) {
            clearTimeout(response.timeout);
        });
    };
    this.encode = function (method, params, dest, transport, callback) {
        if (params instanceof Function) {
            if (dest != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = params;
            transport = undefined;
            dest = undefined;
            params = undefined;
        }
        else if (dest instanceof Function) {
            if (transport != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = dest;
            transport = undefined;
            dest = undefined;
        }
        else if (transport instanceof Function) {
            if (callback != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = transport;
            transport = undefined;
        }
        ;
        if (self.peerID != undefined) {
            params = params || {};
            params.from = self.peerID;
        }
        ;
        if (dest != undefined) {
            params = params || {};
            params.dest = dest;
        }
        ;
        var message = {
            method: method,
            params: params
        };
        if (callback) {
            var id = requestID++;
            var retried = 0;
            message = packer.pack(message, id);
            function dispatchCallback(error, result) {
                self.cancel(message);
                callback(error, result);
            }
            ;
            var request = {
                message: message,
                callback: dispatchCallback,
                responseMethods: responseMethods[method] || {}
            };
            var encode_transport = unifyTransport(transport);
            function sendRequest(transport) {
                var rt = (method === 'ping' ? ping_request_timeout : request_timeout);
                request.timeout = setTimeout(timeout, rt * Math.pow(2, retried++));
                message2Key[message] = { id: id, dest: dest };
                requests.set(request, id, dest);
                transport = transport || encode_transport || self.getTransport();
                if (transport)
                    return transport.send(message);
                return message;
            }
            ;
            function retry(transport) {
                transport = unifyTransport(transport);
                console.warn(retried + ' retry for request message:', message);
                var timeout = processedResponses.pop(id, dest);
                clearTimeout(timeout);
                return sendRequest(transport);
            }
            ;
            function timeout() {
                if (retried < max_retries)
                    return retry(transport);
                var error = new Error('Request has timed out');
                error.request = message;
                error.retry = retry;
                dispatchCallback(error);
            }
            ;
            return sendRequest(transport);
        }
        ;
        message = packer.pack(message);
        transport = transport || this.getTransport();
        if (transport)
            return transport.send(message);
        return message;
    };
    this.decode = function (message, transport) {
        if (!message)
            throw new TypeError("Message is not defined");
        try {
            message = packer.unpack(message);
        }
        catch (e) {
            return console.debug(e, message);
        }
        ;
        var id = message.id;
        var ack = message.ack;
        var method = message.method;
        var params = message.params || {};
        var from = params.from;
        var dest = params.dest;
        if (self.peerID != undefined && from == self.peerID)
            return;
        if (id == undefined && ack == undefined) {
            var notification = new RpcNotification(method, params);
            if (self.emit('request', notification))
                return;
            return notification;
        }
        ;
        function processRequest() {
            transport = unifyTransport(transport) || self.getTransport();
            if (transport) {
                var response = responses.get(id, from);
                if (response)
                    return transport.send(response.message);
            }
            ;
            var idAck = (id != undefined) ? id : ack;
            var request = new RpcRequest(method, params, idAck, from, transport);
            if (self.emit('request', request))
                return;
            return request;
        }
        ;
        function processResponse(request, error, result) {
            request.callback(error, result);
        }
        ;
        function duplicatedResponse(timeout) {
            console.warn("Response already processed", message);
            clearTimeout(timeout);
            storeProcessedResponse(ack, from);
        }
        ;
        if (method) {
            if (dest == undefined || dest == self.peerID) {
                var request = requests.get(ack, from);
                if (request) {
                    var responseMethods = request.responseMethods;
                    if (method == responseMethods.error)
                        return processResponse(request, params);
                    if (method == responseMethods.response)
                        return processResponse(request, null, params);
                    return processRequest();
                }
                var processed = processedResponses.get(ack, from);
                if (processed)
                    return duplicatedResponse(processed);
            }
            return processRequest();
        }
        ;
        var error = message.error;
        var result = message.result;
        if (error && error.dest && error.dest != self.peerID)
            return;
        if (result && result.dest && result.dest != self.peerID)
            return;
        var request = requests.get(ack, from);
        if (!request) {
            var processed = processedResponses.get(ack, from);
            if (processed)
                return duplicatedResponse(processed);
            return console.warn("No callback was defined for this message", message);
        }
        ;
        processResponse(request, error, result);
    };
}
;
inherits(RpcBuilder, EventEmitter);
RpcBuilder.RpcNotification = RpcNotification;
module.exports = RpcBuilder;
var clients = require('./clients');
var transports = require('./clients/transports');
RpcBuilder.clients = clients;
RpcBuilder.clients.transports = transports;
RpcBuilder.packers = packers;

},{"./Mapper":47,"./clients":48,"./clients/transports":50,"./packers":55,"events":1,"inherits":6}],53:[function(require,module,exports){
function pack(message, id) {
    var result = {
        jsonrpc: "2.0"
    };
    if (message.method) {
        result.method = message.method;
        if (message.params)
            result.params = message.params;
        if (id != undefined)
            result.id = id;
    }
    else if (id != undefined) {
        if (message.error) {
            if (message.result !== undefined)
                throw new TypeError("Both result and error are defined");
            result.error = message.error;
        }
        else if (message.result !== undefined)
            result.result = message.result;
        else
            throw new TypeError("No result or error is defined");
        result.id = id;
    }
    ;
    return JSON.stringify(result);
}
;
function unpack(message) {
    var result = message;
    if (typeof message === 'string' || message instanceof String) {
        result = JSON.parse(message);
    }
    var version = result.jsonrpc;
    if (version !== '2.0')
        throw new TypeError("Invalid JsonRPC version '" + version + "': " + message);
    if (result.method == undefined) {
        if (result.id == undefined)
            throw new TypeError("Invalid message: " + message);
        var result_defined = result.result !== undefined;
        var error_defined = result.error !== undefined;
        if (result_defined && error_defined)
            throw new TypeError("Both result and error are defined: " + message);
        if (!result_defined && !error_defined)
            throw new TypeError("No result or error is defined: " + message);
        result.ack = result.id;
        delete result.id;
    }
    return result;
}
;
exports.pack = pack;
exports.unpack = unpack;

},{}],54:[function(require,module,exports){
function pack(message) {
    throw new TypeError("Not yet implemented");
}
;
function unpack(message) {
    throw new TypeError("Not yet implemented");
}
;
exports.pack = pack;
exports.unpack = unpack;

},{}],55:[function(require,module,exports){
var JsonRPC = require('./JsonRPC');
var XmlRPC = require('./XmlRPC');
exports.JsonRPC = JsonRPC;
exports.XmlRPC = XmlRPC;

},{"./JsonRPC":53,"./XmlRPC":54}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduLogger = (function () {
    function OpenViduLogger() {
        this.logger = window.console;
        this.LOG_FNS = [this.logger.log, this.logger.debug, this.logger.info, this.logger.warn, this.logger.error];
        this.isProdMode = false;
    }
    OpenViduLogger.getInstance = function () {
        if (!OpenViduLogger.instance) {
            OpenViduLogger.instance = new OpenViduLogger();
        }
        return OpenViduLogger.instance;
    };
    OpenViduLogger.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.isProdMode) {
            this.LOG_FNS[0].apply(this.logger, arguments);
        }
    };
    OpenViduLogger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.isProdMode) {
            this.LOG_FNS[1].apply(this.logger, arguments);
        }
    };
    OpenViduLogger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.isProdMode) {
            this.LOG_FNS[2].apply(this.logger, arguments);
        }
    };
    OpenViduLogger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.isProdMode) {
            this.LOG_FNS[3].apply(this.logger, arguments);
        }
    };
    OpenViduLogger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.LOG_FNS[4].apply(this.logger, arguments);
    };
    OpenViduLogger.prototype.enableProdMode = function () {
        this.isProdMode = true;
    };
    return OpenViduLogger;
}());
exports.OpenViduLogger = OpenViduLogger;

},{}],57:[function(require,module,exports){
window.getScreenId = function (firefoxString, callback, custom_parameter) {
    if (navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob)) {
        callback({
            video: true
        });
        return;
    }
    if (!!navigator.mozGetUserMedia) {
        callback(null, 'firefox', {
            video: {
                mozMediaSource: firefoxString,
                mediaSource: firefoxString
            }
        });
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeMediaSourceId) {
            if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                callback('permission-denied');
            }
            else {
                callback(null, event.data.chromeMediaSourceId, getScreenConstraints(null, event.data.chromeMediaSourceId, event.data.canRequestAudioTrack));
            }
            window.removeEventListener('message', onIFrameCallback);
        }
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus, null, getScreenConstraints(event.data.chromeExtensionStatus));
            window.removeEventListener('message', onIFrameCallback);
        }
    }
    if (!custom_parameter) {
        setTimeout(postGetSourceIdMessage, 100);
    }
    else {
        setTimeout(function () {
            postGetSourceIdMessage(custom_parameter);
        }, 100);
    }
};
function getScreenConstraints(error, sourceId, canRequestAudioTrack) {
    var screen_constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
                maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
            },
            optional: []
        }
    };
    if (!!canRequestAudioTrack) {
        screen_constraints.audio = {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
            },
            optional: []
        };
    }
    if (sourceId) {
        screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
        if (screen_constraints.audio && screen_constraints.audio.mandatory) {
            screen_constraints.audio.mandatory.chromeMediaSourceId = sourceId;
        }
    }
    return screen_constraints;
}
function postGetSourceIdMessage(custom_parameter) {
    if (!iframe) {
        loadIFrame(function () {
            postGetSourceIdMessage(custom_parameter);
        });
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(function () {
            postGetSourceIdMessage(custom_parameter);
        }, 100);
        return;
    }
    if (!custom_parameter) {
        iframe.contentWindow.postMessage({
            captureSourceId: true
        }, '*');
    }
    else if (!!custom_parameter.forEach) {
        iframe.contentWindow.postMessage({
            captureCustomSourceId: custom_parameter
        }, '*');
    }
    else {
        iframe.contentWindow.postMessage({
            captureSourceIdWithAudio: true
        }, '*');
    }
}
var iframe;
window.getScreenConstraints = function (callback) {
    loadIFrame(function () {
        getScreenId(function (error, sourceId, screen_constraints) {
            if (!screen_constraints) {
                screen_constraints = {
                    video: true
                };
            }
            callback(error, screen_constraints.video);
        });
    });
};
function loadIFrame(loadCallback) {
    if (iframe) {
        loadCallback();
        return;
    }
    iframe = document.createElement('iframe');
    iframe.onload = function () {
        iframe.isLoaded = true;
        loadCallback();
    };
    iframe.src = 'https://openvidu.github.io/openvidu-screen-sharing-chrome-extension/';
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
}
window.getChromeExtensionStatus = function (callback) {
    if (!!navigator.mozGetUserMedia) {
        callback('installed-enabled');
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus);
            window.removeEventListener('message', onIFrameCallback);
        }
    }
    setTimeout(postGetChromeExtensionStatusMessage, 100);
};
function postGetChromeExtensionStatusMessage() {
    if (!iframe) {
        loadIFrame(postGetChromeExtensionStatusMessage);
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(postGetChromeExtensionStatusMessage, 100);
        return;
    }
    iframe.contentWindow.postMessage({
        getChromeExtensionStatus: true
    }, '*');
}
exports.getScreenId = getScreenId;

},{}],58:[function(require,module,exports){
var chromeMediaSource = 'screen';
var sourceId;
var screenCallback;
if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.userAgent !== 'undefined') {
    var isFirefox = typeof window.InstallTrigger !== 'undefined';
    var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    var isChrome = !!window.chrome && !isOpera;
    window.addEventListener('message', function (event) {
        if (event.origin != window.location.origin) {
            return;
        }
        onMessageCallback(event.data);
    });
}
function onMessageCallback(data) {
    if (data == 'PermissionDeniedError') {
        if (screenCallback)
            return screenCallback('PermissionDeniedError');
        else
            throw new Error('PermissionDeniedError');
    }
    if (data == 'rtcmulticonnection-extension-loaded') {
        chromeMediaSource = 'desktop';
    }
    if (data.sourceId && screenCallback) {
        screenCallback(sourceId = data.sourceId, data.canRequestAudioTrack === true);
    }
}
function isChromeExtensionAvailable(callback) {
    if (!callback)
        return;
    if (chromeMediaSource == 'desktop')
        return callback(true);
    window.postMessage('are-you-there', '*');
    setTimeout(function () {
        if (chromeMediaSource == 'screen') {
            callback(false);
        }
        else
            callback(true);
    }, 2000);
}
function getSourceId(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('get-sourceId', '*');
}
function getCustomSourceId(arr, callback) {
    if (!arr || !arr.forEach)
        throw '"arr" parameter is mandatory and it must be an array.';
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage({
        'get-custom-sourceId': arr
    }, '*');
}
function getSourceIdWithAudio(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('audio-plus-tab', '*');
}
function getChromeExtensionStatus(extensionid, callback) {
    if (isFirefox)
        return callback('not-chrome');
    if (arguments.length != 2) {
        callback = extensionid;
        extensionid = 'lfcgfepafnobdloecchnfaclibenjold';
    }
    var image = document.createElement('img');
    image.src = 'chrome-extension://' + extensionid + '/icon.png';
    image.onload = function () {
        chromeMediaSource = 'screen';
        window.postMessage('are-you-there', '*');
        setTimeout(function () {
            if (chromeMediaSource == 'screen') {
                callback('installed-disabled');
            }
            else
                callback('installed-enabled');
        }, 2000);
    };
    image.onerror = function () {
        callback('not-installed');
    };
}
function getScreenConstraintsWithAudio(callback) {
    getScreenConstraints(callback, true);
}
function getScreenConstraints(callback, captureSourceIdWithAudio) {
    sourceId = '';
    var firefoxScreenConstraints = {
        mozMediaSource: 'window',
        mediaSource: 'window'
    };
    if (isFirefox)
        return callback(null, firefoxScreenConstraints);
    var screen_constraints = {
        mandatory: {
            chromeMediaSource: chromeMediaSource,
            maxWidth: screen.width > 1920 ? screen.width : 1920,
            maxHeight: screen.height > 1080 ? screen.height : 1080
        },
        optional: []
    };
    if (chromeMediaSource == 'desktop' && !sourceId) {
        if (captureSourceIdWithAudio) {
            getSourceIdWithAudio(function (sourceId, canRequestAudioTrack) {
                screen_constraints.mandatory.chromeMediaSourceId = sourceId;
                if (canRequestAudioTrack) {
                    screen_constraints.canRequestAudioTrack = true;
                }
                callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
            });
        }
        else {
            getSourceId(function (sourceId) {
                screen_constraints.mandatory.chromeMediaSourceId = sourceId;
                callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
            });
        }
        return;
    }
    if (chromeMediaSource == 'desktop') {
        screen_constraints.mandatory.chromeMediaSourceId = sourceId;
    }
    callback(null, screen_constraints);
}
exports.getScreenConstraints = getScreenConstraints;
exports.getScreenConstraintsWithAudio = getScreenConstraintsWithAudio;
exports.isChromeExtensionAvailable = isChromeExtensionAvailable;
exports.getChromeExtensionStatus = getChromeExtensionStatus;
exports.getSourceId = getSourceId;

},{}],59:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var freeice = require("freeice");
var uuid = require("uuid");
var platform = require("platform");
var OpenViduLogger_1 = require("../Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var WebRtcPeer = (function () {
    function WebRtcPeer(configuration) {
        var _this = this;
        this.configuration = configuration;
        this.remoteCandidatesQueue = [];
        this.localCandidatesQueue = [];
        this.iceCandidateList = [];
        this.candidategatheringdone = false;
        this.configuration.iceServers = (!!this.configuration.iceServers && this.configuration.iceServers.length > 0) ? this.configuration.iceServers : freeice();
        this.pc = new RTCPeerConnection({ iceServers: this.configuration.iceServers });
        this.id = !!configuration.id ? configuration.id : this.generateUniqueId();
        this.pc.onicecandidate = function (event) {
            if (!!event.candidate) {
                var candidate = event.candidate;
                if (candidate) {
                    _this.localCandidatesQueue.push({ candidate: candidate.candidate });
                    _this.candidategatheringdone = false;
                    _this.configuration.onicecandidate(event.candidate);
                }
                else if (!_this.candidategatheringdone) {
                    _this.candidategatheringdone = true;
                }
            }
        };
        this.pc.onsignalingstatechange = function () {
            if (_this.pc.signalingState === 'stable') {
                while (_this.iceCandidateList.length > 0) {
                    var candidate = _this.iceCandidateList.shift();
                    _this.pc.addIceCandidate(candidate);
                }
            }
        };
        this.start();
    }
    WebRtcPeer.prototype.start = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.pc.signalingState === 'closed') {
                reject('The peer connection object is in "closed" state. This is most likely due to an invocation of the dispose method before accepting in the dialogue');
            }
            if (!!_this.configuration.mediaStream) {
                for (var _i = 0, _a = _this.configuration.mediaStream.getTracks(); _i < _a.length; _i++) {
                    var track = _a[_i];
                    _this.pc.addTrack(track, _this.configuration.mediaStream);
                }
                resolve();
            }
        });
    };
    WebRtcPeer.prototype.dispose = function () {
        logger.debug('Disposing WebRtcPeer');
        if (this.pc) {
            if (this.pc.signalingState === 'closed') {
                return;
            }
            this.pc.close();
            this.remoteCandidatesQueue = [];
            this.localCandidatesQueue = [];
        }
    };
    WebRtcPeer.prototype.generateOffer = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerAudio, offerVideo = true;
            if (!!_this.configuration.mediaConstraints) {
                offerAudio = (typeof _this.configuration.mediaConstraints.audio === 'boolean') ?
                    _this.configuration.mediaConstraints.audio : true;
                offerVideo = (typeof _this.configuration.mediaConstraints.video === 'boolean') ?
                    _this.configuration.mediaConstraints.video : true;
            }
            var constraints = {
                offerToReceiveAudio: (_this.configuration.mode !== 'sendonly' && offerAudio),
                offerToReceiveVideo: (_this.configuration.mode !== 'sendonly' && offerVideo)
            };
            logger.debug('RTCPeerConnection constraints: ' + JSON.stringify(constraints));
            if (platform.name === 'Safari' && platform.ua.indexOf('Safari') !== -1) {
                if (offerAudio) {
                    _this.pc.addTransceiver('audio', {
                        direction: _this.configuration.mode,
                    });
                }
                if (offerVideo) {
                    _this.pc.addTransceiver('video', {
                        direction: _this.configuration.mode,
                    });
                }
                _this.pc
                    .createOffer()
                    .then(function (offer) {
                    logger.debug('Created SDP offer');
                    return _this.pc.setLocalDescription(offer);
                })
                    .then(function () {
                    var localDescription = _this.pc.localDescription;
                    if (!!localDescription) {
                        logger.debug('Local description set', localDescription.sdp);
                        resolve(localDescription.sdp);
                    }
                    else {
                        reject('Local description is not defined');
                    }
                })
                    .catch(function (error) { return reject(error); });
            }
            else {
                _this.pc.createOffer(constraints).then(function (offer) {
                    logger.debug('Created SDP offer');
                    return _this.pc.setLocalDescription(offer);
                })
                    .then(function () {
                    var localDescription = _this.pc.localDescription;
                    if (!!localDescription) {
                        logger.debug('Local description set', localDescription.sdp);
                        resolve(localDescription.sdp);
                    }
                    else {
                        reject('Local description is not defined');
                    }
                })
                    .catch(function (error) { return reject(error); });
            }
        });
    };
    WebRtcPeer.prototype.processAnswer = function (sdpAnswer, needsTimeoutOnProcessAnswer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var answer = {
                type: 'answer',
                sdp: sdpAnswer
            };
            logger.debug('SDP answer received, setting remote description');
            if (_this.pc.signalingState === 'closed') {
                reject('RTCPeerConnection is closed');
            }
            _this.setRemoteDescription(answer, needsTimeoutOnProcessAnswer, resolve, reject);
        });
    };
    WebRtcPeer.prototype.setRemoteDescription = function (answer, needsTimeoutOnProcessAnswer, resolve, reject) {
        var _this = this;
        if (platform['isIonicIos']) {
            if (needsTimeoutOnProcessAnswer) {
                setTimeout(function () {
                    logger.info('setRemoteDescription run after timeout for Ionic iOS device');
                    _this.pc.setRemoteDescription(new RTCSessionDescription(answer)).then(function () { return resolve(); }).catch(function (error) { return reject(error); });
                }, 250);
            }
            else {
                this.pc.setRemoteDescription(new RTCSessionDescription(answer)).then(function () { return resolve(); }).catch(function (error) { return reject(error); });
            }
        }
        else {
            this.pc.setRemoteDescription(answer).then(function () { return resolve(); }).catch(function (error) { return reject(error); });
        }
    };
    WebRtcPeer.prototype.addIceCandidate = function (iceCandidate) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            logger.debug('Remote ICE candidate received', iceCandidate);
            _this.remoteCandidatesQueue.push(iceCandidate);
            switch (_this.pc.signalingState) {
                case 'closed':
                    reject(new Error('PeerConnection object is closed'));
                    break;
                case 'stable':
                    if (!!_this.pc.remoteDescription) {
                        _this.pc.addIceCandidate(iceCandidate).then(function () { return resolve(); }).catch(function (error) { return reject(error); });
                    }
                    else {
                        _this.iceCandidateList.push(iceCandidate);
                        resolve();
                    }
                    break;
                default:
                    _this.iceCandidateList.push(iceCandidate);
                    resolve();
            }
        });
    };
    WebRtcPeer.prototype.addIceConnectionStateChangeListener = function (otherId) {
        var _this = this;
        this.pc.oniceconnectionstatechange = function () {
            var iceConnectionState = _this.pc.iceConnectionState;
            switch (iceConnectionState) {
                case 'disconnected':
                    logger.warn('IceConnectionState of RTCPeerConnection ' + _this.id + ' (' + otherId + ') change to "disconnected". Possible network disconnection');
                    break;
                case 'failed':
                    logger.error('IceConnectionState of RTCPeerConnection ' + _this.id + ' (' + otherId + ') to "failed"');
                    break;
                case 'closed':
                    logger.log('IceConnectionState of RTCPeerConnection ' + _this.id + ' (' + otherId + ') change to "closed"');
                    break;
                case 'new':
                    logger.log('IceConnectionState of RTCPeerConnection ' + _this.id + ' (' + otherId + ') change to "new"');
                    break;
                case 'checking':
                    logger.log('IceConnectionState of RTCPeerConnection ' + _this.id + ' (' + otherId + ') change to "checking"');
                    break;
                case 'connected':
                    logger.log('IceConnectionState of RTCPeerConnection ' + _this.id + ' (' + otherId + ') change to "connected"');
                    break;
                case 'completed':
                    logger.log('IceConnectionState of RTCPeerConnection ' + _this.id + ' (' + otherId + ') change to "completed"');
                    break;
            }
        };
    };
    WebRtcPeer.prototype.generateUniqueId = function () {
        return uuid.v4();
    };
    return WebRtcPeer;
}());
exports.WebRtcPeer = WebRtcPeer;
var WebRtcPeerRecvonly = (function (_super) {
    __extends(WebRtcPeerRecvonly, _super);
    function WebRtcPeerRecvonly(configuration) {
        var _this = this;
        configuration.mode = 'recvonly';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerRecvonly;
}(WebRtcPeer));
exports.WebRtcPeerRecvonly = WebRtcPeerRecvonly;
var WebRtcPeerSendonly = (function (_super) {
    __extends(WebRtcPeerSendonly, _super);
    function WebRtcPeerSendonly(configuration) {
        var _this = this;
        configuration.mode = 'sendonly';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerSendonly;
}(WebRtcPeer));
exports.WebRtcPeerSendonly = WebRtcPeerSendonly;
var WebRtcPeerSendrecv = (function (_super) {
    __extends(WebRtcPeerSendrecv, _super);
    function WebRtcPeerSendrecv(configuration) {
        var _this = this;
        configuration.mode = 'sendrecv';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerSendrecv;
}(WebRtcPeer));
exports.WebRtcPeerSendrecv = WebRtcPeerSendrecv;

},{"../Logger/OpenViduLogger":56,"freeice":2,"platform":8,"uuid":10}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var platform = require("platform");
var OpenViduLogger_1 = require("../Logger/OpenViduLogger");
var logger = OpenViduLogger_1.OpenViduLogger.getInstance();
var WebRtcStats = (function () {
    function WebRtcStats(stream) {
        this.stream = stream;
        this.webRtcStatsEnabled = false;
        this.statsInterval = 1;
        this.stats = {
            inbound: {
                audio: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0
                },
                video: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0,
                    framesDecoded: 0,
                    nackCount: 0
                }
            },
            outbound: {
                audio: {
                    bytesSent: 0,
                    packetsSent: 0,
                },
                video: {
                    bytesSent: 0,
                    packetsSent: 0,
                    framesEncoded: 0,
                    nackCount: 0
                }
            }
        };
    }
    WebRtcStats.prototype.isEnabled = function () {
        return this.webRtcStatsEnabled;
    };
    WebRtcStats.prototype.initWebRtcStats = function () {
        var _this = this;
        var elastestInstrumentation = localStorage.getItem('elastest-instrumentation');
        if (!!elastestInstrumentation) {
            logger.warn('WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
            this.webRtcStatsEnabled = true;
            var instrumentation_1 = JSON.parse(elastestInstrumentation);
            this.statsInterval = instrumentation_1.webrtc.interval;
            logger.warn('localStorage item: ' + JSON.stringify(instrumentation_1));
            this.webRtcStatsIntervalId = setInterval(function () {
                _this.sendStatsToHttpEndpoint(instrumentation_1);
            }, this.statsInterval * 1000);
            return;
        }
        logger.debug('WebRtc stats not enabled');
    };
    WebRtcStats.prototype.stopWebRtcStats = function () {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            logger.warn('WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
        }
    };
    WebRtcStats.prototype.getSelectedIceCandidateInfo = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getStatsAgnostic(_this.stream.getRTCPeerConnection(), function (stats) {
                if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                    var localCandidateId = void 0, remoteCandidateId = void 0, googCandidatePair = void 0;
                    var localCandidates = {};
                    var remoteCandidates = {};
                    for (var key in stats) {
                        var stat = stats[key];
                        if (stat.type === 'localcandidate') {
                            localCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'remotecandidate') {
                            remoteCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'googCandidatePair' && (stat.googActiveConnection === 'true')) {
                            googCandidatePair = stat;
                            localCandidateId = stat.localCandidateId;
                            remoteCandidateId = stat.remoteCandidateId;
                        }
                    }
                    var finalLocalCandidate_1 = localCandidates[localCandidateId];
                    if (!!finalLocalCandidate_1) {
                        var candList = _this.stream.getLocalIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalLocalCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.priority) >= 0);
                        });
                        finalLocalCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find local candidate in list of sent ICE candidates';
                    }
                    else {
                        finalLocalCandidate_1 = 'ERROR: No active local ICE candidate. Probably ICE-TCP is being used';
                    }
                    var finalRemoteCandidate_1 = remoteCandidates[remoteCandidateId];
                    if (!!finalRemoteCandidate_1) {
                        var candList = _this.stream.getRemoteIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalRemoteCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.priority) >= 0);
                        });
                        finalRemoteCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find remote candidate in list of received ICE candidates';
                    }
                    else {
                        finalRemoteCandidate_1 = 'ERROR: No active remote ICE candidate. Probably ICE-TCP is being used';
                    }
                    resolve({
                        googCandidatePair: googCandidatePair,
                        localCandidate: finalLocalCandidate_1,
                        remoteCandidate: finalRemoteCandidate_1
                    });
                }
                else {
                    reject('Selected ICE candidate info only available for Chrome');
                }
            }, function (error) {
                reject(error);
            });
        });
    };
    WebRtcStats.prototype.sendStatsToHttpEndpoint = function (instrumentation) {
        var _this = this;
        var sendPost = function (json) {
            var http = new XMLHttpRequest();
            var url = instrumentation.webrtc.httpEndpoint;
            http.open('POST', url, true);
            http.setRequestHeader('Content-type', 'application/json');
            http.onreadystatechange = function () {
                if (http.readyState === 4 && http.status === 200) {
                    logger.log('WebRtc stats successfully sent to ' + url + ' for stream ' + _this.stream.streamId + ' of connection ' + _this.stream.connection.connectionId);
                }
            };
            http.send(json);
        };
        var f = function (stats) {
            if (platform.name.indexOf('Firefox') !== -1) {
                stats.forEach(function (stat) {
                    var json = {};
                    if ((stat.type === 'inbound-rtp') &&
                        (stat.nackCount !== null &&
                            stat.isRemote === false &&
                            stat.id.startsWith('inbound') &&
                            stat.remoteId.startsWith('inbound'))) {
                        var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                        var jit = stat.jitter * 1000;
                        var metrics = {
                            bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                            jitter: jit,
                            packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                            packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                        };
                        var units = {
                            bytesReceived: 'bytes',
                            jitter: 'ms',
                            packetsReceived: 'packets',
                            packetsLost: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                            metrics['nackCount'] = (stat.nackCount - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                            units['framesDecoded'] = 'frames';
                            units['nackCount'] = 'packets';
                            _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                            _this.stats.inbound.video.nackCount = stat.nackCount;
                        }
                        _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                        _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                        _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'et_type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                    else if ((stat.type === 'outbound-rtp') &&
                        (stat.isRemote === false &&
                            stat.id.toLowerCase().includes('outbound'))) {
                        var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                        var metrics = {
                            bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                            packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                        };
                        var units = {
                            bytesSent: 'bytes',
                            packetsSent: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                            units['framesEncoded'] = 'frames';
                            _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                        }
                        _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                        _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'et_type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                });
            }
            else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                for (var _i = 0, _a = Object.keys(stats); _i < _a.length; _i++) {
                    var key = _a[_i];
                    var stat = stats[key];
                    if (stat.type === 'ssrc') {
                        var json = {};
                        if ('bytesReceived' in stat && ((stat.mediaType === 'audio' && 'audioOutputLevel' in stat) ||
                            (stat.mediaType === 'video' && 'qpSum' in stat))) {
                            var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                                jitter: stat.googJitterBufferMs,
                                packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                                packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                            };
                            var units = {
                                bytesReceived: 'bytes',
                                jitter: 'ms',
                                packetsReceived: 'packets',
                                packetsLost: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                                metrics['nackCount'] = (stat.googNacksSent - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                                units['framesDecoded'] = 'frames';
                                units['nackCount'] = 'packets';
                                _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                                _this.stats.inbound.video.nackCount = stat.googNacksSent;
                            }
                            _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                            _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                            _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'et_type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                        else if ('bytesSent' in stat) {
                            var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                                packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                            };
                            var units = {
                                bytesSent: 'bytes',
                                packetsSent: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                                units['framesEncoded'] = 'frames';
                                _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                            }
                            _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                            _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'et_type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                    }
                }
            }
        };
        this.getStatsAgnostic(this.stream.getRTCPeerConnection(), f, function (error) { logger.log(error); });
    };
    WebRtcStats.prototype.standardizeReport = function (response) {
        logger.log(response);
        var standardReport = {};
        if (platform.name.indexOf('Firefox') !== -1) {
            Object.keys(response).forEach(function (key) {
                logger.log(response[key]);
            });
            return response;
        }
        response.result().forEach(function (report) {
            var standardStats = {
                id: report.id,
                timestamp: report.timestamp,
                type: report.type
            };
            report.names().forEach(function (name) {
                standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
        });
        return standardReport;
    };
    WebRtcStats.prototype.getStatsAgnostic = function (pc, successCb, failureCb) {
        var _this = this;
        if (platform.name.indexOf('Firefox') !== -1) {
            return pc.getStats(null).then(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }).catch(failureCb);
        }
        else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
            return pc.getStats(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, null, failureCb);
        }
    };
    return WebRtcStats;
}());
exports.WebRtcStats = WebRtcStats;

},{"../Logger/OpenViduLogger":56,"platform":8}]},{},[22])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9mcmVlaWNlL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2ZyZWVpY2Uvc3R1bi5qc29uIiwiLi4vbm9kZV9tb2R1bGVzL2ZyZWVpY2UvdHVybi5qc29uIiwiLi4vbm9kZV9tb2R1bGVzL2hhcmsvaGFyay5qcyIsIi4uL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL25vcm1hbGljZS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9wbGF0Zm9ybS9wbGF0Zm9ybS5qcyIsIi4uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvYnl0ZXNUb1V1aWQuanMiLCIuLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9tZDUtYnJvd3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3Qvcm5nLWJyb3dzZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L3NoYTEtYnJvd3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvdjEuanMiLCIuLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L3YzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC92MzUuanMiLCIuLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L3Y0LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC92NS5qcyIsIi4uL25vZGVfbW9kdWxlcy93aWxkZW1pdHRlci93aWxkZW1pdHRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy93b2xmeTg3LWV2ZW50ZW1pdHRlci9FdmVudEVtaXR0ZXIuanMiLCIuLi9wYWNrYWdlLmpzb24iLCJNYWluLnRzIiwiT3BlblZpZHUvQ29ubmVjdGlvbi50cyIsIk9wZW5WaWR1L0V2ZW50RGlzcGF0Y2hlci50cyIsIk9wZW5WaWR1L0ZpbHRlci50cyIsIk9wZW5WaWR1L0xvY2FsUmVjb3JkZXIudHMiLCJPcGVuVmlkdS9PcGVuVmlkdS50cyIsIk9wZW5WaWR1L1B1Ymxpc2hlci50cyIsIk9wZW5WaWR1L1Nlc3Npb24udHMiLCJPcGVuVmlkdS9TdHJlYW0udHMiLCJPcGVuVmlkdS9TdHJlYW1NYW5hZ2VyLnRzIiwiT3BlblZpZHUvU3Vic2NyaWJlci50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRW51bXMvTG9jYWxSZWNvcmRlclN0YXRlLnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FbnVtcy9PcGVuVmlkdUVycm9yLnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FbnVtcy9WaWRlb0luc2VydE1vZGUudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9Db25uZWN0aW9uRXZlbnQudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9FdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL0ZpbHRlckV2ZW50LnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvUHVibGlzaGVyU3BlYWtpbmdFdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1JlY29yZGluZ0V2ZW50LnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvU2Vzc2lvbkRpc2Nvbm5lY3RlZEV2ZW50LnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvU2lnbmFsRXZlbnQudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9TdHJlYW1FdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1N0cmVhbU1hbmFnZXJFdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1N0cmVhbVByb3BlcnR5Q2hhbmdlZEV2ZW50LnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvVmlkZW9FbGVtZW50RXZlbnQudHMiLCJPcGVuVmlkdUludGVybmFsL0t1cmVudG9VdGlscy9rdXJlbnRvLWpzb25ycGMvTWFwcGVyLmpzIiwiT3BlblZpZHVJbnRlcm5hbC9LdXJlbnRvVXRpbHMva3VyZW50by1qc29ucnBjL2NsaWVudHMvaW5kZXguanMiLCJPcGVuVmlkdUludGVybmFsL0t1cmVudG9VdGlscy9rdXJlbnRvLWpzb25ycGMvY2xpZW50cy9qc29ucnBjY2xpZW50LmpzIiwiT3BlblZpZHVJbnRlcm5hbC9LdXJlbnRvVXRpbHMva3VyZW50by1qc29ucnBjL2NsaWVudHMvdHJhbnNwb3J0cy9pbmRleC5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvS3VyZW50b1V0aWxzL2t1cmVudG8tanNvbnJwYy9jbGllbnRzL3RyYW5zcG9ydHMvd2ViU29ja2V0V2l0aFJlY29ubmVjdGlvbi5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvS3VyZW50b1V0aWxzL2t1cmVudG8tanNvbnJwYy9pbmRleC5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvS3VyZW50b1V0aWxzL2t1cmVudG8tanNvbnJwYy9wYWNrZXJzL0pzb25SUEMuanMiLCJPcGVuVmlkdUludGVybmFsL0t1cmVudG9VdGlscy9rdXJlbnRvLWpzb25ycGMvcGFja2Vycy9YbWxSUEMuanMiLCJPcGVuVmlkdUludGVybmFsL0t1cmVudG9VdGlscy9rdXJlbnRvLWpzb25ycGMvcGFja2Vycy9pbmRleC5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvTG9nZ2VyL09wZW5WaWR1TG9nZ2VyLnRzIiwiT3BlblZpZHVJbnRlcm5hbC9TY3JlZW5TaGFyaW5nL1NjcmVlbi1DYXB0dXJpbmctQXV0by5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvU2NyZWVuU2hhcmluZy9TY3JlZW4tQ2FwdHVyaW5nLmpzIiwiT3BlblZpZHVJbnRlcm5hbC9XZWJSdGNQZWVyL1dlYlJ0Y1BlZXIudHMiLCJPcGVuVmlkdUludGVybmFsL1dlYlJ0Y1N0YXRzL1dlYlJ0Y1N0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqc0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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