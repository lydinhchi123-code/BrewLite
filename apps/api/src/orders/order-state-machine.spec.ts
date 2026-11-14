import { assertTransition, OrderStatus } from './order-state-machine';

describe('order state machine', () => {
  it('allows an order to move from pending to paid', () => {
    expect(() =>
      assertTransition(OrderStatus.PENDING, OrderStatus.PAID),
    ).not.toThrow();
  });

  it('allows a failed payment to be retried successfully', () => {
    expect(() =>
      assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PAID),
    ).not.toThrow();
  });

  it('rejects completing an order before it is ready', () => {
    expect(() =>
      assertTransition(OrderStatus.PAID, OrderStatus.COMPLETED),
    ).toThrow(Error);
  });

  it('rejects changes after an order is completed', () => {
    expect(() =>
      assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED),
    ).toThrow(Error);
  });
});
