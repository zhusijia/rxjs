import { expect } from 'chai';
import { hot, cold, expectObservable, expectSubscriptions } from '../helpers/marble-testing';
import { scan, mergeMap, finalize, take } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

/** @test {scan} */
describe('scan operator', () => {
  it('should scan', () => {
    const values = {
      a: 1, b: 3, c: 5,
      x: 1, y: 4, z: 9
    };
    const e1 =     hot('--a--b--c--|', values);
    const e1subs =     '^          !';
    const expected =   '--x--y--z--|';

    const scanFunction = function (o: number, x: number) {
      return o + x;
    };

    expectObservable(e1.pipe(scan(scanFunction, 0))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should scan things', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs =      '^                    !';
    const expected =    '---u--v--w--x--y--z--|';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectObservable(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should scan with a seed of undefined', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs =      '^                    !';
    const expected =    '---u--v--w--x--y--z--|';

    const values = {
      u: 'undefined b',
      v: 'undefined b c',
      w: 'undefined b c d',
      x: 'undefined b c d e',
      y: 'undefined b c d e f',
      z: 'undefined b c d e f g'
    };

    const source = e1.pipe(scan((acc: any, x: string) => acc + ' ' + x, undefined));

    expectObservable(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should scan without seed', () => {
    const e1 = hot('--a--^--b--c--d--|');
    const e1subs =      '^           !';
    const expected =    '---x--y--z--|';

    const values = {
      x: 'b',
      y: 'bc',
      z: 'bcd'
    };

    const source = e1.pipe(scan((acc: any, x: string) => acc + x));

    expectObservable(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle errors', () => {
    const e1 = hot('--a--^--b--c--d--#');
    const e1subs =      '^           !';
    const expected =    '---u--v--w--#';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd']
    };

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectObservable(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle errors in the projection function', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs =      '^        !            ';
    const expected =    '---u--v--#            ';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(scan((acc, x) => {
      if (x === 'd') {
        throw 'bad!';
      }
      return acc.concat(x);
    }, [] as string[]));

    expectObservable(source).toBe(expected, values, 'bad!');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle empty', () => {
    const e1 =  cold('|');
    const e1subs =   '(^!)';
    const expected = '|';

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectObservable(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle never', () => {
    const e1 =  cold('-');
    const e1subs =   '^';
    const expected = '-';

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectObservable(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle throw', () => {
    const e1 =  cold('#');
    const e1subs =   '(^!)';
    const expected = '#';

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectObservable(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const unsub =       '              !       ';
    const e1subs =      '^             !       ';
    const expected =    '---u--v--w--x--       ';
    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectObservable(source, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs =      '^             !       ';
    const expected =    '---u--v--w--x--       ';
    const unsub =       '              !       ';
    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(
      mergeMap((x: string) => of(x)),
      scan((acc, x) => acc.concat(x), [] as string[]),
      mergeMap((x: string[]) => of(x))
    );

    expectObservable(source, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should pass current index to accumulator', () => {
    const values = {
      a: 1, b: 3, c: 5,
      x: 1, y: 4, z: 9
    };
    let idx = [0, 1, 2];

    const e1 =     hot('--a--b--c--|', values);
    const e1subs =     '^          !';
    const expected =   '--x--y--z--|';

    const scanFunction = (o: number, value: number, index: number) => {
      expect(index).to.equal(idx.shift());
      return o + value;
    };

    const scanObs = e1.pipe(
      scan(scanFunction, 0),
      finalize(() => {
        expect(idx).to.be.empty;
      })
    );

    expectObservable(scanObs).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should stop listening to a synchronous observable when unsubscribed', () => {
    const sideEffects: number[] = [];
    const synchronousObservable = new Observable<number>(subscriber => {
      // This will check to see if the subscriber was closed on each loop
      // when the unsubscribe hits (from the `take`), it should be closed
      for (let i = 0; !subscriber.closed && i < 10; i++) {
        sideEffects.push(i);
        subscriber.next(i);
      }
    });

    synchronousObservable.pipe(
      scan((acc, value: number) => value, 0),
      take(3),
    ).subscribe(() => { /* noop */ });

    expect(sideEffects).to.deep.equal([0, 1, 2]);
  });
});
