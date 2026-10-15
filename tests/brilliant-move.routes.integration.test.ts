import assert from 'node:assert/strict';
import test from 'node:test';
import express, { type RequestHandler } from 'express';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { createBrilliantMoveRouter } from '../src/routes/brilliant-move.routes.js';
import { brilliantMoveService } from '../src/services/brilliant-move.service.js';

async function startApp(role: 'admin' | 'member') {
  const app = express();
  const authenticate: RequestHandler = (req, _res, next) => {
    req.user = {
      id: role === 'admin' ? 17 : 'member-17',
      role,
      type: role,
    };
    next();
  };

  app.use(express.json());
  app.use('/api/brilliant-moves', createBrilliantMoveRouter(authenticate));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  return {
    server,
    url: `http://127.0.0.1:${address.port}/api/brilliant-moves`,
  };
}

test('POST and DELETE vote endpoints use the authenticated server role', async () => {
  const original = brilliantMoveService.setVoteOnSubmission;
  const calls: Array<{ role: string; id: number; shouldVote: boolean }> = [];
  brilliantMoveService.setVoteOnSubmission = async (
    voter,
    id,
    shouldVote,
  ) => {
    calls.push({ role: voter.role, id, shouldVote });
    return {
      id,
      total_votes: shouldVote ? 1 : 0,
      admin_votes: voter.role === 'admin' && shouldVote ? 1 : 0,
      current_user_voted: shouldVote,
    };
  };

  const adminApp = await startApp('admin');
  const memberApp = await startApp('member');
  try {
    const post = await fetch(`${adminApp.url}/42/vote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'member', is_admin: false }),
    });
    assert.equal(post.status, 200);
    assert.deepEqual(calls[0], {
      role: 'admin',
      id: 42,
      shouldVote: true,
    });

    const remove = await fetch(`${memberApp.url}/42/vote`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'admin', is_admin: true }),
    });
    assert.equal(remove.status, 200);
    assert.deepEqual(calls[1], {
      role: 'member',
      id: 42,
      shouldVote: false,
    });
  } finally {
    brilliantMoveService.setVoteOnSubmission = original;
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        adminApp.server.close((error) =>
          error ? reject(error) : resolve(),
        ),
      ),
      new Promise<void>((resolve, reject) =>
        memberApp.server.close((error) =>
          error ? reject(error) : resolve(),
        ),
      ),
    ]);
  }
});
