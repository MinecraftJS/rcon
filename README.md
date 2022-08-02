# rcon

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/MinecraftJS/rcon/Build?style=for-the-badge)
![GitHub](https://img.shields.io/github/license/MinecraftJS/rcon?style=for-the-badge)
![npm (scoped)](https://img.shields.io/npm/v/@minecraft-js/rcon?style=for-the-badge)

RCON Minecraft client written in TypeScript

# Documentation

## Installation

Install the package:

```bash
$ npm install @minecraft-js/rcon
```

And then import it in your JavaScript/TypeScript file

```js
const { RCONClient } = require('@minecraft-js/rcon'); // CommonJS

import { RCONClient } from '@minecraft-js/rcon'; // ES6
```

## Connect

```js
const client = new RCONClient('127.0.0.1', 'my_password');

client.connect();
```

## Listen for events

```js
client.on('authenticated', () => {
  // Do stuff
});

client.on('error', () => {
  // Do stuff
});

// ...
```

## Execute a command

```js
client.on('response', (requestId, packet) => {
  // Do something with requestId and packet
  // Access the command response by `packet.payload`
});

const requestId = client.executeCommand('whitelist list');
```

Full doc: https://minecraftjs.github.io/rcon/
