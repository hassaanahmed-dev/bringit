// Runs before every test file's imports, so the backend module sees browser
// globals at evaluation time — just like a real browser tab.

const shared = {};
const ses = {};
const handlers = {};

globalThis.__testStore = { shared, ses, handlers };

globalThis.localStorage = {
  getItem: (k) => (k in shared ? shared[k] : null),
  setItem: (k, v) => { shared[k] = String(v); },
  removeItem: (k) => { delete shared[k]; },
};

globalThis.sessionStorage = {
  getItem: (k) => (k in ses ? ses[k] : null),
  setItem: (k, v) => { ses[k] = String(v); },
  removeItem: (k) => { delete ses[k]; },
};

globalThis.window = {
  addEventListener: (evt, cb) => { handlers[evt] = cb; },
};

// Fake BroadcastChannel that delivers postMessage to every other same-name
// instance, mirroring how a real browser fan-out works across tabs.
const channelInstances = [];
globalThis.__testChannels = channelInstances;
globalThis.BroadcastChannel = class {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    channelInstances.push(this);
  }
  postMessage(msg) {
    channelInstances.forEach((other) => {
      if (other !== this && other.name === this.name && other.onmessage) {
        other.onmessage({ data: msg });
      }
    });
  }
  close() {}
};
