# end-to-end testing

End-to-end tests (short <abbr title="end-to-end">e2e</abbr>) are split into two parts:

1. The rendered UI, or test fixtures
2. Instrumentation of fixtures with a simple Vite app

## Rendered UI

The composition of all tests happens in [`./main.tsx`](./main.tsx).
The rendered UI is located inside a separate file in `./fixtures` and written as a React component.
If you're adding a new test prefer a new component instead of editing existing files since that might unknowingly alter existing tests.

## Instrumentation

We're using [`playwright`](https://playwright.dev) to replay user actions.
Each test tests only a single fixture.
A fixture can be loaded with `await renderFixture(fixturePath)`, for example `renderFixture('FocusTrap/OpenFocusTrap')`.

## Commands

For development `pnpm test:e2e:lit:dev` and `pnpm test:e2e:lit:run --watch` in separate terminals is recommended.

| command                | description                                                                                   |
| :--------------------- | :-------------------------------------------------------------------------------------------- |
| `pnpm test:e2e:lit`        | Full run                                                                                          |
| `pnpm test:e2e:lit:dev`    | Prepares the Lit fixtures and runs a Vite dev server                                              |
| `pnpm test:e2e:lit:run`    | Runs the tests (requires `pnpm test:e2e:lit:dev` or `pnpm test:e2e:lit:build`+`pnpm test:e2e:lit:server`) |
| `pnpm test:e2e:lit:build`  | Builds the Vite bundle for viewing Lit fixtures                                                   |
| `pnpm test:e2e:lit:server` | Serves the Lit fixture bundle.                                                                    |
