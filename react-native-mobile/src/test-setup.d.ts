/**
 * Type declarations for test dependencies that lack type definitions.
 */

declare module 'react-test-renderer' {
  import { ReactElement } from 'react';
  interface ReactTestRenderer {
    toJSON(): unknown;
    toTree(): unknown;
    update(nextElement: ReactElement): void;
    unmount(): void;
    act(callback: () => void): Promise<void>;
  }
  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void): Promise<void>;
}

declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: unknown): any;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function mock(moduleName: string, factory: () => unknown): void;
  export const vi: {
    fn: (impl?: (...args: any[]) => any) => any;
    spyOn: (obj: any, method: string) => any;
  };
}
