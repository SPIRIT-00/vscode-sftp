import { BaseAgent, createAgent, utils } from 'ssh2';

export class SingleIdentityAgent extends BaseAgent {
  private readonly delegate: any;
  private readonly identity: any;

  constructor(delegate: any, identity: any) {
    super();
    this.delegate = delegate;
    this.identity = identity;
  }

  getIdentities(callback) {
    // Do not ask the real agent for its identity list. The public key from
    // IdentityFile is the only identity ssh2 is allowed to offer.
    callback(null, [this.identity]);
  }

  sign(publicKey, data, options, callback) {
    this.delegate.sign(publicKey, data, options, callback);
  }
}

export function createSingleIdentityAgent(
  agentPath: string,
  publicKey: Buffer | string
): SingleIdentityAgent {
  let identity: any = utils.parseKey(publicKey);
  if (Array.isArray(identity)) {
    identity = identity[0];
  }
  if (identity instanceof Error) {
    throw new Error(`Cannot parse agent IdentityFile: ${identity.message}`);
  }
  if (!identity || identity.getPublicSSH() === null) {
    throw new Error('Agent IdentityFile does not contain a valid public key');
  }

  return new SingleIdentityAgent(createAgent(agentPath), identity);
}
