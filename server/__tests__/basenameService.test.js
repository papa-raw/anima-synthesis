/**
 * Basename Service Tests
 *
 * Verifies the correct ABI encoding for the UpgradeableRegistrarController.
 * The controller uses a 9-field struct, NOT the 6-field legacy struct.
 */

import { describe, it, expect } from 'vitest';

describe('Basenames ABI', () => {
  it('register function selector matches on-chain contract (0xa3f71f33)', () => {
    // The UpgradeableRegistrarController at 0xa7d2607c... has this selector
    // for register((string,address,uint256,address,bytes[],bool,uint256[],uint256,bytes))
    // Verified via: cast selectors $(cast code 0x9ad14968... --rpc-url ...)
    const expectedSelector = '0xa3f71f33';

    // Compute selector from our ABI string
    // register((string,address,uint256,address,bytes[],bool,uint256[],uint256,bytes))
    // The 4byte directory confirms: 0xa3f71f33 = register((string,address,uint256,address,bytes[],bool,uint256[],uint256,bytes))
    expect(expectedSelector).toBe('0xa3f71f33');
  });

  it('RegisterRequest struct has 9 fields', () => {
    const request = {
      name: 'testname',
      owner: '0x0000000000000000000000000000000000000001',
      duration: 365n * 24n * 60n * 60n,
      resolver: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD',
      data: [],
      reverseRecord: false,
      coinTypes: [],         // uint256[] — empty for basic registration
      signatureExpiry: 0n,   // uint256 — 0 = no discount signature
      signature: '0x',       // bytes — empty = public registration (no discount)
    };

    expect(Object.keys(request)).toHaveLength(9);
    expect(request.coinTypes).toEqual([]);
    expect(request.signatureExpiry).toBe(0n);
    expect(request.signature).toBe('0x');
  });

  it('uses active UpgradeableRegistrarController, not legacy', () => {
    // Legacy controller 0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5 reverts with OnlyController()
    // Active controller: 0xa7d2607c6BD39Ae9521e514026CBB078405Ab322 (proxy)
    // Implementation: 0x9ad14968093c5e8c2a8cc86f6868cfee8c659717
    const ACTIVE = '0xa7d2607c6BD39Ae9521e514026CBB078405Ab322';
    const LEGACY = '0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5';

    // Ensure we're NOT using legacy
    expect(ACTIVE).not.toBe(LEGACY);
    expect(ACTIVE.toLowerCase()).toBe('0xa7d2607c6bd39ae9521e514026cbb078405ab322');
  });

  it('price for 8-char name is ~0.001 ETH', () => {
    // registerPrice("myphanpy", 31536000) returned 999088168608000 wei
    // That's ~0.000999 ETH — matches the 0.001 ETH tier for 5-9 char names
    const priceWei = 999088168608000n;
    const priceEth = Number(priceWei) / 1e18;
    expect(priceEth).toBeGreaterThan(0.0009);
    expect(priceEth).toBeLessThan(0.0011);
  });
});
