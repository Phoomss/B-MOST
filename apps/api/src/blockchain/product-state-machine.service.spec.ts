import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductStateMachineService, OnChainProductStatus as Status } from './product-state-machine.service';

describe('ProductStateMachineService', () => {
  const stateMachine = new ProductStateMachineService();

  it('accepts the sequential lifecycle and a new delivery leg from storage', () => {
    const steps = [
      [Status.REGISTERED, 'recordQualityCheck'],
      [Status.QUALITY_CHECKED, 'createShipment'],
      [Status.READY_TO_SHIP, 'shipProduct'],
      [Status.SHIPPED, 'markInTransit'],
      [Status.IN_TRANSIT, 'receiveProduct'],
      [Status.RECEIVED, 'storeProduct'],
      [Status.STORED, 'markAsSold'],
      [Status.STORED, 'createShipment'],
    ] as const;
    for (const [status, action] of steps) {
      expect(() => stateMachine.validateTransition(status, action, 'P-1', 'db-1')).not.toThrow();
    }
  });

  it.each([
    [Status.REGISTERED, 'shipProduct'],
    [Status.REGISTERED, 'receiveProduct'],
    [Status.REGISTERED, 'markAsSold'],
    [Status.QUALITY_CHECKED, 'markAsSold'],
    [Status.QUALITY_CHECKED, 'shipProduct'],
    [Status.SHIPPED, 'markAsSold'],
    [Status.SOLD, 'shipProduct'],
    [Status.SOLD, 'receiveProduct'],
  ] as const)('rejects %s → %s before a transaction', (status, action) => {
    expect(() => stateMachine.validateTransition(status, action, 'P-1', 'db-1')).toThrow(BadRequestException);
  });

  it('stops when database and blockchain status differ', () => {
    expect(() => stateMachine.checkStateMismatch('READY_TO_SHIP', Status.QUALITY_CHECKED, 'P-1', 'db-1'))
      .toThrow(ConflictException);
    expect(stateMachine.checkStateMismatch('READY_TO_SHIP', Status.READY_TO_SHIP, 'P-1', 'db-1'))
      .toBe(false);
  });
});
