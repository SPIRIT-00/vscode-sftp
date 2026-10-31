import { SingleIdentityAgent } from '../singleIdentityAgent';

describe('SingleIdentityAgent', () => {
  test('offers only the configured identity without listing delegate keys', done => {
    const identity = { name: 'selected-key' };
    const delegate = {
      getIdentities: jest.fn(),
      sign: jest.fn(),
    };
    const agent = new SingleIdentityAgent(delegate, identity);

    agent.getIdentities((error, identities) => {
      expect(error).toBeNull();
      expect(identities).toEqual([identity]);
      expect(delegate.getIdentities).not.toHaveBeenCalled();
      done();
    });
  });

  test('delegates signing for the selected public key', () => {
    const callback = jest.fn();
    const delegate = { sign: jest.fn() };
    const agent = new SingleIdentityAgent(delegate, {});
    const publicKey = {};
    const data = Buffer.from('payload');
    const options = { hash: 'sha512' };

    agent.sign(publicKey, data, options, callback);

    expect(delegate.sign).toHaveBeenCalledWith(
      publicKey,
      data,
      options,
      callback
    );
  });
});
