import { describe, it, expect } from 'vitest';
import { parseTradeText } from '../src/domain/parser';

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out: any = {};
  for (const k of keys) out[k as string] = obj[k];
  return out;
}

describe('parseTradeText', () => {
  it('parses expired notice', () => {
    const input = 'EXPIRED PUT (IREN) IREN LIMITED COM NPVJAN 16 26 $45 as of Jan-16-2026';
    const [res] = parseTradeText(input);
    expect(pick(res, ['action', 'ticker', 'type', 'expiry', 'strike', 'date'] as any)).toEqual({
      action: 'expired',
      ticker: 'IREN',
      type: 'put',
      expiry: '2026-01-16',
      strike: 45,
      date: '2026-01-16',
    });
  });

  it('parses description line with margin', () => {
    const input = 'PUT (IREN) IREN LIMITED COM NPV JAN 16 26 $45 (100 SHS) (Margin)';
    const [res] = parseTradeText(input);
    expect(res.type).toBe('put');
    expect(res.ticker).toBe('IREN');
    expect(res.expiry).toBe('2026-01-16');
    expect(res.strike).toBe(45);
    expect(res.contractSize).toBe(100);
    expect(res.margin).toBe(true);
  });

  it('parses processing block with symbol and amount', () => {
    const input = `Processing\nDate\nJan-20-2026\nSymbol\n-IREN260116P45\nSymbol description\nPUT (IREN) IREN LIMITED COM NPV JAN 16 26 $45 (100 SHS)\nType\nMargin\nContracts\n+2.000\nYOU SOLD OPENING TRANSACTION PUT (IREN) IREN LIMITED COM NPVJAN 09 26 $43 (100 SHS) (Margin)\n+$107.33\n$10,590.38`;
    const [res] = parseTradeText(input);
    expect(res.symbol).toBe('-IREN260116P45');
    expect(res.ticker).toBe('IREN');
    expect(res.type).toBe('put');
    expect(res.expiry).toBe('2026-01-16');
    expect(res.strike).toBe(45);
    expect(res.contracts).toBe(2);
    expect(res.amount).toBe(107.33);
    expect(res.amountSign).toBe('+');
    expect(res.date).toBe('2026-01-20');
    expect(res.margin).toBe(true);
  });

  it('parses detailed ticket with fees', () => {
    const input = `Date\nJan-05-2026\nSymbol\n-IREN260109P43\nSymbol description\nPUT (IREN) IREN LIMITED COM NPVJAN 09 26 $43 (100 SHS)\nType\nMargin\nContracts\n-1.000\nPrice\n$1.08\nCommission\n$0.65\nFees\n$0.02\nAmount\n$107.33\nSettlement date\nJan-06-2026`;
    const [res] = parseTradeText(input);
    expect(res.expiry).toBe('2026-01-09');
    expect(res.strike).toBe(43);
    expect(res.contracts).toBe(1);
    expect(res.price).toBe(1.08);
    expect(res.commission).toBe(0.65);
    expect(res.fees).toBe(0.02);
    expect(res.amount).toBe(107.33);
  });
});
