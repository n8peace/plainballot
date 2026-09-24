import { initBotId } from 'botid/client/core';

// Invisible bot check on the two endpoints that cost money (AI and ballot lookup).
initBotId({
  protect: [
    { path: '/api/interpret', method: 'POST' },
    { path: '/api/ballot', method: 'GET' },
  ],
});
