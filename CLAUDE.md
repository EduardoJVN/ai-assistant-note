# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Enforcement

These rules are non-negotiable. Follow them exactly as written.

- **If a requirement doesn't fit the patterns in this file, STOP and ask before creating anything.**
- **Do not invent file structures, layers, or patterns not described here.** No "helpers", no "utils", no "services" outside the documented structure.
- **Do not create a file without its corresponding test.** Implementation and spec are delivered together.
- **Do not skip steps in the Module Creation Playbook.** Every step is required.
- Every task is complete only when: the code compiles, `yarn test` passes, and `yarn test:coverage` shows no uncovered branches in the modified files.

---

## Commands

```bash
yarn dev              # Development with hot-reload (tsx watch)
yarn build            # Production bundle via esbuild → dist/
yarn test             # Run all tests once (CI mode)
yarn test:watch       # Interactive watch mode
yarn test:coverage    # Coverage report (v8, HTML + JSON + text)
yarn lint             # ESLint with auto-fix
yarn format           # Prettier formatting
```

Run a single test file:
```bash
yarn test:watch <filename-pattern>   # e.g., yarn test:watch analyze-comment
```

## Architecture

Hexagonal + DDD with **Vertical Slicing** per module inside each layer. Dependency flow is strictly inward: `infrastructure → application → domain`. The domain layer has zero external dependencies.

```
src/
├── domain/
│   ├── ports/             # Cross-module ports (e.g. ILogger)
│   └── {module}/
│       ├── entities/
│       ├── errors/        # Module-specific domain errors
│       └── ports/         # Repository + external service interfaces
├── application/
│   └── {module}/
│       ├── use-cases/
│       └── dto/
├── infrastructure/
│   ├── adapters/          # DB, email, logger implementations
│   ├── entry-points/      # HTTP controllers (BaseController lives here)
│   └── config/            # env vars, bootstrap helpers
├── shared/
│   └── errors/            # DomainError, NotFoundError base classes
└── app.ts                 # Composition root (temporary — replaced by framework bootstrap)
```

**app.ts is the composition root.** All dependencies are instantiated and injected here — no service locators, no singletons in domain/application.

## TypeScript & Import Rules

These rules are enforced by ESLint and TypeScript compiler. A lint or type error means the task is **not done**.

### Path aliases — never use relative `../../` imports

| Alias | Maps to |
|---|---|
| `@domain/*` | `src/domain/*` |
| `@application/*` | `src/application/*` |
| `@infra/*` | `src/infrastructure/*` |
| `@shared/*` | `src/shared/*` |

```typescript
// ✅
import { Order } from '@domain/order/entities/order.entity.js';
import type { IOrderRepository } from '@domain/order/ports/order.repository.port.js';
import type { PlaceOrderCommand } from '@application/order/dto/place-order.dto.js';

// ❌
import { Order } from '../../entities/order.entity.js';
import { Order } from '../../../domain/order/entities/order.entity.js';
```

### `.js` extension — always required in imports

Node.js ESM resolves extensions literally. TypeScript does **not** rewrite paths at emit time. Always write `.js` even inside `.ts` files — TypeScript maps `.ts → .js` transparently.

```typescript
// ✅
import { PlaceOrderUseCase } from '@application/order/use-cases/place-order.use-case.js';

// ❌  (fails at runtime — Node ESM requires the exact extension)
import { PlaceOrderUseCase } from '@application/order/use-cases/place-order.use-case';
import { PlaceOrderUseCase } from '@application/order/use-cases/place-order.use-case.ts';
```

### `import type` — required for type-only imports

`verbatimModuleSyntax: true` is enabled. TypeScript errors if a type-only import omits `import type`.

```typescript
// ✅
import type { IOrderRepository } from '@domain/order/ports/order.repository.port.js';
import type { PlaceOrderCommand, PlaceOrderResult } from '@application/order/dto/place-order.dto.js';

// ❌
import { IOrderRepository } from '@domain/order/ports/order.repository.port.js';
```

Rule of thumb: interfaces, type aliases, and anything used only as a type annotation → `import type`.

### `any` is forbidden

`no-explicit-any` is an ESLint **error**. Use `unknown` for unknown values. For type casts in tests, use `as unknown as TargetType`.

```typescript
// ✅
const value: unknown = externalData();
const mock = { execute: vi.fn() } as unknown as PlaceOrderUseCase;

// ❌
const value: any = externalData();
const mock = { execute: vi.fn() } as any;
```

---

## Key Conventions

**File naming:**
- Port interfaces: `*.port.ts`
- Adapters (port implementations): `*.adapter.ts`
- Use cases: `*.use-case.ts`
- Tests: `*.spec.ts`

**One use case = one file = one class = one `execute()` method.** No exceptions.

```
src/application/user/use-cases/
  create-user.use-case.ts      ← CreateUserUseCase
  get-user.use-case.ts         ← GetUserUseCase
  delete-user.use-case.ts      ← DeleteUserUseCase
```

```typescript
// ✅ Correct structure for every use case
export class CreateUserUseCase {
  constructor(
    private readonly repo: IUserRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResult> { ... }
}
```

Never group multiple operations in one class. Never add methods other than `execute`.

**Dependency injection:** All dependencies are injected via constructor. Use cases receive ports (interfaces), never concrete adapters directly.

**Commit messages:** Conventional Commits enforced by commitlint. Allowed prefixes: `feat`, `fix`, `chore`, `docs`, `test`, `style`, `refactor`, `perf`.

## Module Creation Playbook

When adding a new feature, create files in this order — domain first, infrastructure last.

```
1. src/domain/{module}/ports/{name}.repository.port.ts        ← IRepository interface
2. src/domain/{module}/entities/{name}.entity.ts              ← entity (if needed)
3. src/domain/{module}/errors/{name}-not-found.error.ts       ← NotFoundError subclass
   src/domain/{module}/errors/invalid-{rule}.error.ts         ← DomainError subclasses
4. src/application/{module}/dto/create-{module}.dto.ts        ← one DTO file per operation
   src/application/{module}/dto/get-{module}.dto.ts
   src/application/{module}/dto/list-{module}s.dto.ts
   src/application/{module}/dto/update-{module}.dto.ts
   src/application/{module}/dto/delete-{module}.dto.ts        ← Command only, no Result
5. src/application/{module}/use-cases/create-{module}.use-case.ts  ← one file per operation
   src/application/{module}/use-cases/get-{module}.use-case.ts
   src/application/{module}/use-cases/list-{module}s.use-case.ts
   src/application/{module}/use-cases/update-{module}.use-case.ts
   src/application/{module}/use-cases/delete-{module}.use-case.ts
6. src/infrastructure/adapters/{name}.adapter.ts              ← implements the port
7. src/infrastructure/entry-points/{name}.controller.ts       ← extends BaseController
8. Wire in app.ts / framework bootstrap                       ← instantiate + inject
```

**Tests are mandatory and created at the same time as the implementation — never after.**

Each file has exactly one spec file, co-located in a `__test__/` folder **inside the same directory**. This applies to every module and every layer without exception:

```
src/application/{module}/use-cases/
  {action}.use-case.ts
  __test__/
    {action}.use-case.spec.ts

src/domain/{module}/entities/
  {name}.entity.ts
  __test__/
    {name}.entity.spec.ts

src/infrastructure/adapters/
  {name}.adapter.ts
  __test__/
    {name}.adapter.spec.ts
```

Every spec MUST cover:
1. **Happy path** — successful execution with valid input
2. **Every domain error** the use case can throw
3. **Every port failure** (repository throws, external service fails)
4. **Every input edge case** that triggers different branching

The goal is **100% branch coverage** on the use case file. Running `yarn test:coverage` must show no uncovered branches in `application/`. If there are uncovered branches, the implementation is not done.

## Entity Pattern

Entities use a **private constructor** and two static factories. **ID is always received as a parameter** — who generates it (use case, adapter, or database) is an infrastructure decision.

```typescript
// src/domain/{module}/entities/{name}.entity.ts
export class {Entity} {
  private constructor(
    public readonly id: string,
    // ... domain-specific fields
  ) {}

  // For NEW entities — enforce business invariants, emit domain events if needed
  static create(id: string, /* domain fields */): {Entity} {
    // validate invariants, throw typed DomainError if violated
    return new {Entity}(id, /* fields */);
  }

  // For LOADING from persistence — no validation, no events, just reconstruct state
  static reconstitute(id: string, /* domain fields */): {Entity} {
    return new {Entity}(id, /* fields */);
  }

  // Mutations modify state in-place and validate invariants
  update(/* fields */): void {
    // validate, then assign
  }
}
```

Adapters use `reconstitute()` when mapping DB rows to entities. Use cases use `create()` for new entities.

## DTOs

Each use case has a corresponding DTO file in a `dto/` folder **inside the same module**, named `{action}-{module}.dto.ts`. DTOs are plain TypeScript interfaces — no Zod, no classes.

```
src/application/{module}/
  use-cases/
    create-{module}.use-case.ts
    __test__/
      create-{module}.use-case.spec.ts
  dto/
    create-{module}.dto.ts
    get-{module}.dto.ts
    update-{module}.dto.ts
```

```typescript
// src/application/{module}/dto/{action}-{module}.dto.ts
export interface Create{Module}Command {
  id: string;
  // ... domain-specific fields
}

export interface Create{Module}Result {
  id: string;
  // ... fields to return
}
```

Use cases return **plain objects** matching the Result interface — never entity instances.

Operations that produce no output (e.g. delete, fire-and-forget commands) define **only a Command** — no Result interface. The `execute()` method returns `Promise<void>`.

```typescript
// src/application/{module}/dto/delete-{module}.dto.ts
export interface Delete{Module}Command {
  id: string;
}
// No DeleteResult — execute() returns Promise<void>
```

## Repository Port Contract

Every repository port exposes these five methods as the CRUD baseline. `save()` is for create, `update()` is for update — never merged into a single upsert.

```typescript
// src/domain/{module}/ports/{module}.repository.port.ts
export interface I{Module}Repository {
  findAll(): Promise<{Entity}[]>;
  findById(id: string): Promise<{Entity} | null>;
  save(entity: {Entity}): Promise<void>;
  update(entity: {Entity}): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Never add query-specific methods to the port. If a query doesn't fit `findAll`, create a dedicated read model or a separate query port.

## Central Error Handler

Controllers do **not** handle errors individually. All controllers extend `BaseController`, which provides a single `handleRequest()` wrapper that catches and maps all throws.

```typescript
// src/infrastructure/entry-points/base.controller.ts

// These three interfaces are exported from base.controller.ts and used by all controllers
export interface HttpRequest {
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

export interface ErrorResponse {
  status: number;
  message: string;
}

export abstract class BaseController {
  protected async handleRequest<T>(
    action: () => Promise<T>,
    onSuccess: (result: T) => HttpResponse,
    onError: (error: ErrorResponse) => HttpResponse,
  ): Promise<HttpResponse> {
    try {
      const result = await action();
      return onSuccess(result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return onError({ status: 404, message: error.message });
      } else if (error instanceof DomainError) {
        return onError({ status: 400, message: error.message });
      } else {
        return onError({ status: 500, message: 'Internal server error' });
      }
    }
  }
}
```

```typescript
// src/infrastructure/entry-points/{module}.controller.ts
import { BaseController } from './base.controller.js';
import type { HttpRequest, HttpResponse } from './base.controller.js';

// One use case injected per operation — never group them into a single service
export class {Module}Controller extends BaseController {
  constructor(
    private readonly createUseCase: Create{Module}UseCase,
    private readonly getUseCase: Get{Module}UseCase,
    private readonly listUseCase: List{Module}sUseCase,
    private readonly updateUseCase: Update{Module}UseCase,
    private readonly deleteUseCase: Delete{Module}UseCase,
  ) {
    super();
  }

  async create(req: HttpRequest): Promise<HttpResponse> {
    const parsed = Create{Module}Schema.safeParse(req.body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.message } };

    return this.handleRequest(
      () => this.createUseCase.execute(parsed.data),
      (result) => ({ status: 201, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async getById(req: HttpRequest): Promise<HttpResponse> {
    const id = req.params?.id ?? '';
    return this.handleRequest(
      () => this.getUseCase.execute({ id }),
      (result) => ({ status: 200, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async list(_req: HttpRequest): Promise<HttpResponse> {
    return this.handleRequest(
      () => this.listUseCase.execute(),
      (result) => ({ status: 200, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async update(req: HttpRequest): Promise<HttpResponse> {
    const id = req.params?.id ?? '';
    const parsed = Update{Module}BodySchema.safeParse(req.body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.message } };

    return this.handleRequest(
      () => this.updateUseCase.execute({ id, ...parsed.data }),
      (result) => ({ status: 200, body: result }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }

  async delete(req: HttpRequest): Promise<HttpResponse> {
    const id = req.params?.id ?? '';
    return this.handleRequest(
      () => this.deleteUseCase.execute({ id }),
      () => ({ status: 204, body: null }),
      (error) => ({ status: error.status, body: { error: error.message } }),
    );
  }
}
```

`BaseController` lives in `src/infrastructure/entry-points/`. Swapping to Lambda means overriding only the `onSuccess`/`onError` callbacks — error classification logic stays in one place.

## ILogger

`ILogger` is a cross-module port defined at `src/domain/ports/logger.port.ts`. All use cases receive it via constructor injection — **never** import Pino or any logging lib directly in domain or application.

```typescript
// src/domain/ports/logger.port.ts
export interface ILogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}
```

```typescript
// ✅ Use case receiving ILogger via constructor
export class Create{Module}UseCase {
  constructor(
    private readonly repo: I{Module}Repository,
    private readonly logger: ILogger,
  ) {}
}
```

In tests, implement `MockLogger` as a class (not `vi.fn()`):

```typescript
import type { ILogger } from '@domain/ports/logger.port.js';

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}
```

## Validation

**Zod belongs ONLY in infrastructure/entry-points.** Never in domain or application.

Always use `safeParse` (not `parse`) in controllers — it returns `{ success, data, error }` instead of throwing, which lets you return a structured 400 without hitting the `handleRequest` catch block.

```typescript
// ✅ infrastructure/entry-points/{module}.controller.ts
const schema = z.object({ email: z.string().email(), name: z.string().min(1) });

const parsed = schema.safeParse(req.body);
// Always use parsed.error.message — not .format() or .issues
if (!parsed.success) return { status: 400, body: { error: parsed.error.message } };

await this.handleRequest(
  () => useCase.execute(parsed.data),
  (result) => ({ status: 201, body: result }),
  (error) => ({ status: error.status, body: { error: error.message } }),
);

// ❌ Never use schema.parse() in controllers — unhandled throw bypasses the error shape
// ❌ Never validate with Zod in a use case or entity
```

The use case receives already-validated plain objects. Entities enforce business invariants by throwing domain errors, not by parsing schemas.

## HTTP Status Codes

Standard codes used across all controllers:

| Operation | Success status | Notes |
|---|---|---|
| Create (POST) | `201` | Body contains the created resource |
| Get by ID (GET) | `200` | Body contains the resource |
| List (GET) | `200` | Body contains array or wrapper object |
| Update (PUT/PATCH) | `200` | Body contains the updated resource |
| Delete (DELETE) | `204` | Body is `null` |
| Validation failure | `400` | Returned before `handleRequest`, from `safeParse` |

Error responses from `handleRequest` always use: `{ error: string }` as body shape.

## Shared

`src/shared/` contains cross-cutting base classes used by all modules. **Do not add anything here that is specific to a single module.**

```
src/shared/
  errors/
    domain.error.ts       ← abstract base for all domain errors
    not-found.error.ts    ← base for all "entity not found" errors
```

These are the only two files that belong in `shared/errors/` at this stage. Every module-specific error extends one of them.

## Domain Errors

Two base classes in `shared/`, module-specific errors extend them. Never `throw new Error()`.

```typescript
// src/shared/errors/domain.error.ts  ← base for all domain errors (maps to HTTP 400)
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// src/shared/errors/not-found.error.ts  ← base for not-found errors (maps to HTTP 404)
export abstract class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

// src/domain/{module}/errors/{entity}-not-found.error.ts
export class UserNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`User not found: ${id}`);
  }
}

// src/domain/{module}/errors/{rule-violation}.error.ts
export class InvalidPriceError extends DomainError {
  constructor(price: number) {
    super(`Price must be greater than 0, got ${price}`);
  }
}
```

`BaseController` maps the hierarchy automatically: `NotFoundError → 404`, any other `DomainError → 400`, anything else `→ 500`.

## Anti-Patterns

| Never do this | Why |
|---|---|
| Import `express`, `aws-lambda`, or any HTTP lib outside `infrastructure/entry-points/` | Couples business logic to a protocol |
| Import a repository adapter directly in a use case | Breaks DI — use the port interface |
| Use `vi.fn()` to mock a port | Doesn't enforce the interface contract |
| Call `console.log` in domain or application | Inject `ILogger` instead |
| Put Zod schemas in domain or application | Validation is an infrastructure concern |
| Throw `new Error()` from domain | Use a typed `DomainError` subclass |
| Add business logic to a controller | Controllers only translate, never decide |
| Access `process.env` outside `infrastructure/config/` | Centralizes env coupling |
| Use `create()` in adapters when loading from DB | Use `reconstitute()` — `create()` is for new entities only |
| Generate IDs inside the entity | ID source is an infrastructure decision, pass it as parameter |
| Merge `save()` and `update()` into a single upsert | `save()` = insert, `update()` = update — keep intent explicit |
| Handle errors in individual controllers | Extend `BaseController` and use `handleRequest()` |
| Use `as any` for type casts | Use `as unknown as TargetType` — keeps type safety and ESLint passing |
| Use `any` anywhere | `no-explicit-any` is an ESLint **error** in this project — use `unknown` instead |

## Testing Patterns

**Pyramid:** many unit tests (domain + application) → some integration tests (adapters) → few E2E.

### Domain layer — no mocks needed
The domain has zero external dependencies. Instantiate directly and assert behavior.

```typescript
import { describe, it, expect } from 'vitest';

describe('Order', () => {
  it('throws when adding item to a cancelled order', () => {
    const order = Order.create(CustomerId.from('cust-1'));
    order.cancel('test');

    expect(() => order.addItem(...)).toThrow(InvalidOrderStateError);
  });
});
```

### Application layer — mock ports as classes
Never use `vi.fn()` for ports. Implement the port interface as a class — this catches type mismatches and keeps mocks readable.

```typescript
// In the same spec file
class MockOrderRepository implements IOrderRepository {
  saved: Order[] = [];

  async findAll(): Promise<Order[]> { return [...this.saved]; }
  async findById(id: string): Promise<Order | null> {
    return this.saved.find(o => o.id === id) ?? null;
  }
  async save(entity: Order): Promise<void> { this.saved.push(entity); }
  async update(entity: Order): Promise<void> {
    const i = this.saved.findIndex(o => o.id === entity.id);
    if (i >= 0) this.saved[i] = entity;
  }
  async delete(id: string): Promise<void> {
    this.saved = this.saved.filter(o => o.id !== id);
  }
}

class MockLogger implements ILogger {
  info = vi.fn();
  error = vi.fn();
  warn = vi.fn();
  debug = vi.fn();
}

describe('PlaceOrderUseCase', () => {
  let useCase: PlaceOrderUseCase;
  let repo: MockOrderRepository;

  beforeEach(() => {
    repo = new MockOrderRepository();
    useCase = new PlaceOrderUseCase(repo, new MockLogger());
  });

  it('saves the order', async () => {
    await useCase.execute({ id: 'ord-1', customerId: 'cust-1' });
    expect(repo.saved).toHaveLength(1);
  });
});
```

### Key rules
- **Mock only at port boundaries** — never mock domain classes or value objects
- **Integration tests** test concrete adapters (Pino, DB, HTTP) with real infrastructure
- **Builders** for complex test fixtures: `new OrderBuilder().withItem('p1', 2).confirmed().build()`
- Test files live co-located in `__test__/` next to the module they test, or at `src/__test__/` for cross-cutting smoke tests

---

## Tooling Notes

- **Runtime:** Node.js 24 ESM native — `import/export` only, never `require()`
- **TypeScript:** `strict: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`. See **TypeScript & Import Rules** above.
- **ESLint:** Flat config (`eslint.config.js`). `no-empty-interface` is OFF (domain ports use empty interfaces as markers). See **TypeScript & Import Rules** for `any` and `import type` enforcement.
- **esbuild:** Custom `scripts/build.js` handles path alias resolution for production bundle
- **Pre-commit hook:** Runs ESLint fix + Prettier + tests on staged `.ts` files automatically
- **Logger:** Always inject `ILogger` via constructor — never import Pino directly in domain/application layers
